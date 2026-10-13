// A stand-in for api.github.com, for the end-to-end tests and development.
//
//   node mock/server.mjs        (http://127.0.0.1:8091)
//
// Serves the demo fixtures (src/demo/fixtures.json, built by src/demo/build.mjs)
// in GitHub's REST shape, for the token MOCK_TOKEN only. Its CORS preflight
// allows the Authorization and Accept headers, like GitHub's. Controls:
//   POST /__mock/revoke          every request answers 401 Bad credentials
//   POST /__mock/ratelimit       every request answers 403 with x-ratelimit-remaining: 0
//   POST /__mock/fail?count=N    the next N requests answer 502
//   POST /__mock/forbid-checks   check runs answer 403 (a fine-grained token without Checks)
//   POST /__mock/delay?ms=N      every answer waits N ms
//   POST /__mock/reset           back to normal, the fixtures' times from now; GET /__mock/log lists the requests
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import {buildGitHub} from '../src/demo/build.mjs';

export const MOCK_PORT = 8091;
export const MOCK_TOKEN = 'github_pat_mock_0000000000';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const fixtures = JSON.parse(fs.readFileSync(path.join(root, 'src/demo/fixtures.json'), 'utf8'));

export function startMockServer(port = MOCK_PORT) {
  let data = buildGitHub(fixtures, new Date());
  const state = {revoked: false, ratelimit: false, fail: 0, forbidChecks: false, delay: 0, log: []};
  // Reset also moves the fixtures' times to now, so "12 minutes ago" stays true during a long run.
  const reset = () => {
    data = buildGitHub(fixtures, new Date());
    Object.assign(state, {revoked: false, ratelimit: false, fail: 0, forbidChecks: false, delay: 0, log: []});
  };

  const server = http.createServer(async (req, res) => {
    const url = new URL(req.url, 'http://localhost');
    const cors = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Authorization, Accept',
      'Access-Control-Allow-Methods': 'GET',
      'Access-Control-Expose-Headers': 'x-ratelimit-remaining, x-ratelimit-reset',
    };
    const send = (status, body, headers = {}) => {
      res.writeHead(status, {'Content-Type': 'application/json; charset=utf-8', ...cors, ...headers});
      res.end(JSON.stringify(body));
    };

    if (url.pathname.startsWith('/__mock/')) {
      const name = url.pathname.slice('/__mock/'.length);
      if (name === 'log') return send(200, state.log);
      if (name === 'reset') reset();
      else if (name === 'revoke') state.revoked = true;
      else if (name === 'ratelimit') state.ratelimit = true;
      else if (name === 'fail') state.fail = Number(url.searchParams.get('count') ?? 1);
      else if (name === 'forbid-checks') state.forbidChecks = true;
      else if (name === 'delay') state.delay = Number(url.searchParams.get('ms') ?? 0);
      else return send(404, {message: 'unknown control'});
      return send(200, {ok: true});
    }
    if (req.method === 'OPTIONS') {
      res.writeHead(204, cors);
      return res.end();
    }

    state.log.push({path: url.pathname + url.search, headers: Object.keys(req.headers).filter(name => !name.startsWith('sec-') && !['host', 'connection', 'user-agent', 'accept-encoding', 'accept-language', 'origin', 'referer', 'sec-fetch-dest', 'sec-fetch-mode', 'sec-fetch-site', 'pragma', 'cache-control', 'priority'].includes(name)).sort()});
    if (state.delay) await new Promise(resolve => setTimeout(resolve, state.delay));
    if (state.fail > 0) {
      state.fail -= 1;
      return send(502, {message: 'Server Error'});
    }
    if (state.revoked || req.headers.authorization !== `Bearer ${MOCK_TOKEN}`) {
      return send(401, {message: 'Bad credentials', status: '401'});
    }
    if (state.ratelimit) {
      const reset = Math.floor(Date.now() / 1000) + 600;
      return send(403, {message: 'API rate limit exceeded for user ID 1.'}, {'x-ratelimit-remaining': '0', 'x-ratelimit-reset': String(reset)});
    }

    const match = url.pathname.match(/^\/repos\/([^/]+)\/([^/]+)(\/.*)?$/);
    const repo = match ? data[`${decodeURIComponent(match[1])}/${decodeURIComponent(match[2])}`.toLowerCase()] : null;
    if (!repo) return send(404, {message: 'Not Found'});
    const rest = match[3] ?? '';
    const perPage = Number(url.searchParams.get('per_page') ?? 30);
    let found;
    if (rest === '') found = repo.repo;
    else if (rest === '/commits') found = repo.commits.slice(0, perPage);
    else if (rest === '/pulls') found = repo.pulls.slice(0, perPage);
    else {
      let part;
      if ((part = rest.match(/^\/commits\/([0-9a-f]+)$/))) found = repo.commitDetails[part[1]];
      else if ((part = rest.match(/^\/commits\/([0-9a-f]+)\/check-runs$/))) {
        if (state.forbidChecks) return send(403, {message: 'Resource not accessible by personal access token'});
        found = repo.checkRuns[part[1]];
      } else if ((part = rest.match(/^\/commits\/([0-9a-f]+)\/status$/))) found = repo.statuses[part[1]];
      else if ((part = rest.match(/^\/pulls\/(\d+)$/))) found = repo.pullDetails[part[1]];
      else if ((part = rest.match(/^\/pulls\/(\d+)\/reviews$/))) found = repo.reviews[part[1]];
    }
    if (found === undefined) return send(404, {message: 'Not Found'});
    return send(200, found);
  });

  return new Promise(resolve => server.listen(port, '127.0.0.1', () => resolve({server, reset, close: () => new Promise(done => server.close(done))})));
}

if (import.meta.url === `file://${process.argv[1]}`) {
  await startMockServer();
  console.log(`mock GitHub on http://127.0.0.1:${MOCK_PORT} (token ${MOCK_TOKEN})`);
}
