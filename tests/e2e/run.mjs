// Keyboard-only end-to-end tests against the mock GitHub (mock/server.mjs).
//
//   npm run package && npm run test:e2e              (Chromium + Firefox)
//   E2E_BROWSERS=firefox npm run test:e2e
//   E2E_ONLY='commit' npm run test:e2e                (scenarios whose title matches)
//
// The built app is served like the Lumen host serves a package (static files,
// SPA fallback) on 127.0.0.1:4173 and the mock on 127.0.0.1:8091, so every call
// is a real cross-origin request with a CORS preflight, as with api.github.com.
// The offline package scenarios unzip dist/lumen-github.mrbd.zip, serve that on
// 127.0.0.1:5500 with every other origin blocked, and save the demo-mode
// captures of every screen to .e2e-output/captures/.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {unzipSync} from 'fflate';
import {chromium, firefox} from 'playwright';
import {MOCK_PORT, MOCK_TOKEN, startMockServer} from '../../mock/server.mjs';
import {startStaticServer} from './static-server.mjs';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../..');
const outDir = path.join(root, '.e2e-output');
const capturesDir = path.join(outDir, 'captures');
const MOCK = `http://127.0.0.1:${MOCK_PORT}`;
const APP = 'http://127.0.0.1:4173';
const PACKAGE_APP = 'http://127.0.0.1:5500';
const browsers = (process.env.E2E_BROWSERS ?? 'chromium,firefox').split(',');
const only = process.env.E2E_ONLY ? new RegExp(process.env.E2E_ONLY, 'i') : null;
const results = [];
let lastPage = null;

fs.mkdirSync(capturesDir, {recursive: true});

const control = (name, query = '') => fetch(`${MOCK}/__mock/${name}${query}`, {method: 'POST'}).then(response => response.json());
const requestLog = () => fetch(`${MOCK}/__mock/log`).then(response => response.json());

const github = {
  'github.token': MOCK_TOKEN,
  'github.repos': 'lumen-labs/hud-kit, lumen-labs/band-driver, https://github.com/maria-souza/dotfiles, lumen-labs/gone',
  'github.api': MOCK,
};

async function focusLabel(page) {
  return page.evaluate(() => {
    const element = document.activeElement;
    if (!element || element === document.body) return '(body)';
    return (element.getAttribute('aria-label') || element.textContent || element.tagName).replace(/\s+/g, ' ').trim();
  });
}

async function press(page, key, times = 1) {
  for (let i = 0; i < times; i += 1) {
    await page.keyboard.press(key);
    await page.waitForTimeout(350);
  }
}

/** Moves focus with `key` until its label matches, or fails. */
async function focusUntil(page, key, pattern, limit = 12) {
  for (let i = 0; i <= limit; i += 1) {
    const label = await focusLabel(page);
    if (pattern.test(label)) return label;
    await press(page, key);
  }
  throw new Error(`focus never matched ${pattern}; last: ${await focusLabel(page)}`);
}

async function waitText(page, text, timeout = 10000) {
  // Components may keep hidden copies of a text (measuring, transitions): wait for a visible one.
  await page.getByText(text, {exact: false}).filter({visible: true}).first().waitFor({state: 'visible', timeout});
}

/** True when a text is on screen, between the header and the bottom. */
async function onScreen(page, text, below = 80, above = 600) {
  return page.evaluate(
    ([wanted, top, bottom]) => {
      const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
      for (let node = walker.nextNode(); node; node = walker.nextNode()) {
        const at = node.textContent.indexOf(wanted);
        if (at < 0) continue;
        // Only the wanted words: a long description is one text node, taller than the screen.
        const range = document.createRange();
        range.setStart(node, at);
        range.setEnd(node, at + wanted.length);
        const rect = range.getBoundingClientRect();
        if (rect.height > 0 && rect.top >= top && rect.bottom <= bottom) return true;
      }
      return false;
    },
    [text, below, above],
  );
}

async function openApp(browser, name, config, {appUrl = APP, route = '/', locale = 'en-GB', blockOthers = false} = {}) {
  const context = await browser.newContext({viewport: {width: 600, height: 600}, locale});
  await context.addInitScript(values => {
    if (!sessionStorage.getItem('e2e-config-set')) {
      localStorage.setItem('lumen-github.dev-config', JSON.stringify(values));
      sessionStorage.setItem('e2e-config-set', '1');
    }
  }, config);
  const outside = [];
  if (blockOthers) {
    await context.route('**/*', route => {
      const url = route.request().url();
      if (url.startsWith(appUrl)) return route.continue();
      // The Lumen host points Google Fonts at a bundled Noto Sans; anything else must not be asked for.
      if (!/fonts\.(googleapis|gstatic)\.com/.test(url)) outside.push(url);
      return route.abort();
    });
  }
  const page = await context.newPage();
  lastPage = page;
  const errors = [];
  page.on('pageerror', error => errors.push(String(error)));
  await page.goto(`${appUrl}${route}`);
  const shot = step => page.screenshot({path: path.join(outDir, `${name}-${step}.png`)});
  return {page, context, errors, outside, shot};
}

async function capture(page, file) {
  await page.waitForTimeout(900);
  await page.screenshot({path: path.join(capturesDir, file)});
}

/** Scrolls a detail with Down until `text` is on screen. */
async function scrollTo(page, text, limit = 12) {
  for (let i = 0; i <= limit; i += 1) {
    if (await onScreen(page, text)) return;
    await press(page, 'ArrowDown');
  }
  throw new Error(`"${text}" never came on screen`);
}

/** Up to the tab pill, then left or right to the tab whose page number matches. */
async function goToTab(page, number) {
  for (let i = 0; i < 4; i += 1) {
    const label = await focusUntil(page, 'ArrowUp', /Page \d of 3|Página \d de 3/);
    const current = Number(label.match(/(?:Page|Página) (\d)/)[1]);
    if (current === number) return;
    await press(page, current < number ? 'ArrowRight' : 'ArrowLeft');
  }
  throw new Error(`never reached tab ${number}; last: ${await focusLabel(page)}`);
}

const scenarios = {
  async 'setup without settings, then Try again connects'(browser, name) {
    await control('reset');
    const {page, context, errors, shot} = await openApp(browser, name, {});
    await waitText(page, 'Connect GitHub');
    await waitText(page, 'Paste the token and list the repositories, as owner/name.');
    assert.match(await focusLabel(page), /Try again/);
    await shot('setup');
    await press(page, 'Enter');
    await waitText(page, 'Still not connected');
    await page.evaluate(values => localStorage.setItem('lumen-github.dev-config', JSON.stringify(values)), github);
    await press(page, 'Enter');
    await waitText(page, 'Read long text with the D-pad');
    assert.deepEqual(errors, []);
    await context.close();
  },

  async 'pull requests: newest first, the first one focused; Enter opens it, Down reads it to the checks, Back returns'(browser, name) {
    await control('reset');
    const {page, context, errors, shot} = await openApp(browser, name, github);
    await waitText(page, 'lumen-labs/hud-kit');
    await waitText(page, 'Theme tokens for amber HUDs');
    await page.waitForTimeout(600);
    assert.match(await focusLabel(page), /^#216 Read long text with the D-pad, half a screen per swipe, Open, joao-pires · 12 minutes ago$/);
    await shot('pulls');
    await focusUntil(page, 'ArrowDown', /^#214 .*Merged/, 4);
    await focusUntil(page, 'ArrowUp', /^#216 /, 4);
    await press(page, 'Enter');
    await waitText(page, 'Open · joao-pires opened 5 hours ago');
    await waitText(page, 'feat/detail-scroll into main');
    await waitText(page, '+212 −38 · 7 files · 4 commits');
    await waitText(page, '1 check running');
    await waitText(page, 'ana-lima: Approved');
    await shot('pull');
    await scrollTo(page, 'Closes #201');
    // The Markdown is read as text: no ** or ## or the HTML comment.
    assert.equal(await page.getByText('half a screen** at a time').count(), 0);
    assert.equal(await page.getByText('template: keep this section').count(), 0);
    await scrollTo(page, 'test (chromium)');
    await shot('pull-checks');
    await press(page, 'Escape');
    await waitText(page, 'Theme tokens for amber HUDs');
    await page.waitForTimeout(500);
    assert.match(await focusLabel(page), /^#216 /);
    // Only Authorization and Accept go to GitHub, and nothing is asked twice to show a list.
    const log = await requestLog();
    assert.ok(log.every(entry => entry.headers.every(header => ['authorization', 'accept'].includes(header))), JSON.stringify(log.map(entry => entry.headers)));
    assert.ok(log.some(entry => entry.path.startsWith('/repos/lumen-labs/hud-kit/pulls?state=all&sort=updated&direction=desc&per_page=20')));
    assert.deepEqual(errors, []);
    await context.close();
  },

  async 'pull request with a failed check and changes requested'(browser, name) {
    await control('reset');
    const {page, context, errors, shot} = await openApp(browser, name, github);
    await waitText(page, 'Theme tokens for amber HUDs');
    await focusUntil(page, 'ArrowDown', /^#213 /, 4);
    await press(page, 'Enter');
    await waitText(page, '1 check failed');
    await waitText(page, 'joao-pires: Changes requested');
    await scrollTo(page, 'coverage');
    await shot('pull-failed');
    assert.deepEqual(errors, []);
    await context.close();
  },

  async 'commits: the default branch, newest first; a commit shows its message, checks and files'(browser, name) {
    await control('reset');
    const {page, context, errors, shot} = await openApp(browser, name, github);
    await waitText(page, 'Theme tokens for amber HUDs');
    await goToTab(page, 2);
    await waitText(page, 'lumen-labs/hud-kit · on main');
    await waitText(page, 'Fix focus ring clipping inside scroll views');
    await focusUntil(page, 'ArrowDown', /^Fix focus ring clipping inside scroll views, ana-lima · 18 minutes ago · [0-9a-f]{7}$/, 3);
    await shot('commits');
    await focusUntil(page, 'ArrowDown', /^Add monochrome contrast check/, 4);
    await press(page, 'Enter');
    await waitText(page, 'ana-lima · yesterday');
    await waitText(page, '+163 −3 · 3 files');
    await waitText(page, '1 check failed');
    await scrollTo(page, 'tests/contrast.test.ts');
    await waitText(page, 'added · +87 −0');
    await shot('commit');
    await press(page, 'Escape');
    await waitText(page, 'on main');
    await page.waitForTimeout(500);
    assert.match(await focusLabel(page), /^Add monochrome contrast check/);
    // Back on Commits goes to Pull requests, the home tab.
    await press(page, 'Escape');
    await waitText(page, 'Theme tokens for amber HUDs');
    assert.deepEqual(errors, []);
    await context.close();
  },

  async 'repositories: each with its details or why it could not open; Enter shows another one'(browser, name) {
    await control('reset');
    const {page, context, errors, shot} = await openApp(browser, name, github);
    await waitText(page, 'Theme tokens for amber HUDs');
    await goToTab(page, 3);
    await waitText(page, 'Neural Band gestures as key events');
    await waitText(page, 'Private · 87 stars');
    await waitText(page, "Can't open: not found or no access");
    await focusUntil(page, 'ArrowDown', /^lumen-labs\//, 2);
    await focusUntil(page, 'ArrowUp', /^lumen-labs\/hud-kit, Public · 1,284 stars · pushed 18 minutes ago, shown$/, 2);
    await shot('repos');
    await focusUntil(page, 'ArrowDown', /^lumen-labs\/band-driver, /, 3);
    await press(page, 'Enter');
    await waitText(page, 'Showing lumen-labs/band-driver');
    await waitText(page, 'Map the middle pinch to Escape');
    await press(page, 'Enter');
    await waitText(page, '1 check running');
    await waitText(page, 'No reviews yet');
    await press(page, 'Escape');
    // The choice is kept: a new launch opens on band-driver.
    await page.reload();
    await waitText(page, 'Map the middle pinch to Escape');
    assert.deepEqual(errors, []);
    await context.close();
  },

  async 'a repository without pull requests, and one that does not exist'(browser, name) {
    await control('reset');
    const {page, context, errors} = await openApp(browser, name, github);
    await waitText(page, 'Theme tokens for amber HUDs');
    await goToTab(page, 3);
    await focusUntil(page, 'ArrowDown', /^maria-souza\/dotfiles, /, 3);
    await press(page, 'Enter');
    await waitText(page, 'No pull requests');
    await waitText(page, 'maria-souza/dotfiles has no pull requests.');
    await goToTab(page, 3);
    await focusUntil(page, 'ArrowDown', /^lumen-labs\/gone, /, 4);
    await press(page, 'Enter');
    await waitText(page, 'Not found');
    await waitText(page, "GitHub can't find this repository");
    assert.deepEqual(errors, []);
    await context.close();
  },

  async 'a revoked token goes back to Setup with the reason'(browser, name) {
    await control('reset');
    await control('revoke');
    const {page, context, errors, shot} = await openApp(browser, name, github);
    await waitText(page, 'GitHub refused the token');
    await shot('refused');
    await control('reset');
    await press(page, 'Enter');
    await waitText(page, 'Read long text with the D-pad');
    assert.deepEqual(errors, []);
    await context.close();
  },

  async 'rate limit and server errors say so, and Try again recovers'(browser, name) {
    await control('reset');
    await control('ratelimit');
    const {page, context, errors, shot} = await openApp(browser, name, github);
    await waitText(page, 'Too many requests');
    await waitText(page, 'GitHub asked the app to slow down until');
    await shot('ratelimit');
    await control('reset');
    await control('fail', '?count=1');
    await focusUntil(page, 'ArrowDown', /Try again/, 3);
    await press(page, 'Enter');
    await waitText(page, 'GitHub is not answering');
    await waitText(page, 'HTTP 502');
    await focusUntil(page, 'ArrowDown', /Try again/, 3);
    await press(page, 'Enter');
    await waitText(page, 'Read long text with the D-pad');
    assert.deepEqual(errors, []);
    await context.close();
  },

  async 'a token that cannot read check runs still shows commit statuses'(browser, name) {
    await control('reset');
    await control('forbid-checks');
    const {page, context, errors, shot} = await openApp(browser, name, github);
    await waitText(page, 'Theme tokens for amber HUDs');
    await focusUntil(page, 'ArrowDown', /^#213 /, 4);
    await press(page, 'Enter');
    await waitText(page, 'All checks passed');
    await scrollTo(page, "This token can't read check runs");
    await shot('no-checks-permission');
    assert.deepEqual(errors, []);
    await context.close();
  },

  async 'offline package, demo mode from the demo setting, every screen captured'(browser, name) {
    const {page, context, errors, outside} = await openApp(browser, name, {demo: 'on'}, {appUrl: PACKAGE_APP, blockOthers: true});
    const prefix = browser.browserType().name();
    await waitText(page, 'Theme tokens for amber HUDs');
    await capture(page, `${prefix}-01-pulls.png`);
    await press(page, 'Enter');
    await waitText(page, '1 check running');
    await capture(page, `${prefix}-02-pull.png`);
    await scrollTo(page, 'test (chromium)');
    await capture(page, `${prefix}-03-pull-checks.png`);
    await press(page, 'Escape');
    await waitText(page, 'Theme tokens for amber HUDs');
    await goToTab(page, 2);
    await waitText(page, 'Fix focus ring clipping');
    await press(page, 'ArrowDown');
    await capture(page, `${prefix}-04-commits.png`);
    await press(page, 'Enter');
    await waitText(page, 'Fixes #212');
    await capture(page, `${prefix}-05-commit.png`);
    await press(page, 'Escape');
    await waitText(page, 'on main');
    await goToTab(page, 3);
    await waitText(page, 'Neural Band gestures as key events');
    await capture(page, `${prefix}-06-repos.png`);
    assert.deepEqual(outside, []);
    assert.deepEqual(errors, []);
    await context.close();

    const setup = await openApp(browser, `${name}-setup`, {}, {appUrl: PACKAGE_APP, blockOthers: true});
    await waitText(setup.page, 'Connect GitHub');
    await capture(setup.page, `${prefix}-07-setup.png`);
    assert.deepEqual(setup.outside, []);
    await setup.context.close();
  },

  async 'offline package, demo mode, in Portuguese'(browser, name) {
    const {page, context, errors, outside} = await openApp(browser, name, {demo: 'on'}, {appUrl: PACKAGE_APP, locale: 'pt-BR', blockOthers: true});
    const prefix = browser.browserType().name();
    await waitText(page, 'Aberto · joao-pires · há 12 minutos');
    await capture(page, `${prefix}-pt-01-pulls.png`);
    await press(page, 'Enter');
    await waitText(page, '1 check rodando');
    await waitText(page, 'ana-lima: Aprovou');
    await capture(page, `${prefix}-pt-02-pull.png`);
    assert.deepEqual(outside, []);
    assert.deepEqual(errors, []);
    await context.close();
  },
};

const mockServer = await startMockServer();
const appServer = await startStaticServer(path.join(root, 'dist'), 4173);
const packageDir = fs.mkdtempSync(path.join(os.tmpdir(), 'lumen-github-package-'));
for (const [file, data] of Object.entries(unzipSync(fs.readFileSync(path.join(root, 'dist/lumen-github.mrbd.zip'))))) {
  fs.mkdirSync(path.dirname(path.join(packageDir, file)), {recursive: true});
  fs.writeFileSync(path.join(packageDir, file), data);
}
const packageServer = await startStaticServer(packageDir, 5500);

try {
  for (const browserName of browsers) {
    const browser = await (browserName === 'firefox' ? firefox : chromium).launch();
    for (const [title, scenario] of Object.entries(scenarios)) {
      if (only && !only.test(title)) continue;
      const name = `${browserName}-${title.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}`.slice(0, 80);
      try {
        await scenario(browser, name);
        results.push(['pass', browserName, title]);
      } catch (error) {
        results.push(['FAIL', browserName, title, String(error?.message ?? error).split('\n').slice(0, Number(process.env.E2E_LINES ?? 2)).join(' ')]);
        await lastPage?.screenshot({path: path.join(outDir, `${name}-FAILED.png`)}).catch(() => {});
        await lastPage?.context().close().catch(() => {});
      }
    }
    await browser.close();
  }
} finally {
  await mockServer.close();
  appServer.close();
  packageServer.close();
}

for (const [status, browserName, title, detail] of results) {
  console.log(`${status} ${browserName}: ${title}${detail ? ` — ${detail}` : ''}`);
}
if (results.some(([status]) => status === 'FAIL')) {
  process.exit(1);
}
