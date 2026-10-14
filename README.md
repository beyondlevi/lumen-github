# lumen-github

An unofficial GitHub client for [Rokid Lumen](https://github.com/beyondlevi/rokid-lumen) glasses, built as a
Meta Ray-Ban Display web app with the official [UI Toolkit for Meta Ray-Ban Display](https://github.com/facebook/meta-ray-ban-display-ui-toolkit-web):
the latest pull requests and commits of the repositories you follow, with their checks and reviews.

> **Unofficial.** Not affiliated with, endorsed or sponsored by GitHub, Inc., Meta Platforms, Inc. or Rokid.
> GitHub is a trademark of GitHub, Inc., used here only to say what the app works with. The app doesn't use
> the GitHub logo.

**Status:** 0.1.0, offline package (`lumen-github.mrbd.zip`), read-only.

## What it does

Three peer tabs, moved between from the pill at the top (swipe up to it, then left and right):

- **Pull requests** (the start screen): the 20 most recently updated pull requests of the repository on
  screen, open and closed. Each row shows its state as a shape (open, draft, merged, closed), the number,
  the title, the author and when it last changed.
- **Commits**: the 20 latest commits on the repository's default branch: the first line of the message
  (on up to two lines), the author, when, and the short SHA.
- **Repositories**: the repositories of your settings, each with public or private, stars and the last
  push, or why it couldn't be opened ("not found or no access"). Enter shows that repository in the
  other tabs; the choice is kept on the glasses.

Enter on a pull request opens it: the title, the state with the author and when, the branches
("feat/x into main"), the size (+212 −38 · 7 files · 4 commits), the **checks** of its head commit
("All checks passed", "1 check failed", "2 checks running"), the **reviews** (each reviewer's standing
decision: Approved, Changes requested, Commented) and the description, with its Markdown read as plain
text. Down scrolls half a screen at a time to the end, where each check is listed by name, failures
first.

Enter on a commit opens it: the whole message (its hard-wrapped lines joined again), the author, the
date, the size, the checks and every changed file with its additions and deletions.

The lists refresh when the app opens, when you come back to it and every 5 minutes while it is open; a
detail refreshes each time it opens. When the glasses' internet isn't up yet (the phone's can take 7 to
30 seconds), the first load retries after 2, 4, 8 and 15 seconds; after that, and for any other failure
(a rate limit says until when), the screen says what happened and offers **Try again**. A token GitHub
refuses brings back the setup screen.

The band works as a D-pad: swipes move the focus, the index tap is Enter, the middle tap is Back. Back on a
pull request or a commit returns to the list, focused where you were; on Commits or Repositories it goes
to Pull requests; on Pull requests it closes the app. English by default; Portuguese for any `pt-*`
language of the glasses.

## Setup (once)

The app reads GitHub with a personal access token. Signing in with GitHub's OAuth pages isn't possible from
an offline Lumen app: github.com's login endpoints don't answer cross-origin requests, so it would need a
server in between. A token goes straight from the glasses to `api.github.com`.

1. **Create a token** on github.com, one of:
   - **Fine-grained** (Settings > Developer settings > Personal access tokens > Fine-grained tokens >
     Generate new token): pick the repositories (or all), and give **read-only** access to **Contents**,
     **Pull requests** and **Commit statuses** (Metadata is added by GitHub). GitHub's documentation lists
     no permission for check runs on fine-grained tokens: on private repositories the app may then show
     only commit statuses, and says so on the pull request.
   - **Classic** (Tokens (classic) > Generate new token): the **`repo`** scope for private repositories
     (it also reads check runs), or no scope at all for public repositories only.

   Pick an expiration you're comfortable with; when it expires the app shows the setup screen again.
2. **On the phone**, open the Lumen companion > **Apps** > **GitHub** and fill in:

   | Setting | Value |
   | --- | --- |
   | GitHub personal access token (`github.token`, secret) | the token |
   | Repositories (`github.repos`) | e.g. `beyondlevi/rokid-lumen, octo-org/api` |
   | Demo mode (`demo`, optional) | leave empty |

   Repositories are `owner/name`, separated by commas, spaces or new lines; github.com addresses work too.
   Up to 12; duplicates and entries that aren't repositories are ignored. The secret stays on the glasses:
   the companion only shows whether it is set.
3. Open the app (or select **Try again** on its "Connect GitHub" screen).

## Privacy

- The app talks only to `api.github.com`, with `GET` requests carrying the `Authorization` and `Accept`
  headers. There is no server of ours, no analytics, no logging of what you see.
- The token comes from the glasses' settings (`window.lumen.config`); it is never in the code, the package
  or a log. Answers are kept in memory only, while the app is open.
- The glasses keep, in the app's own storage, the repository on screen and the open tab.

## Demo mode

Three fictional repositories (`lumen-labs/hud-kit`, `lumen-labs/band-driver`, `maria-souza/dotfiles`)
with pull requests, commits, reviews and checks around the current time, with no network and no GitHub
account: set the companion's **Demo mode** setting to anything (`on`, `1`…; empty, `0`, `off`, `false` or
`no` turn it off), or open the app with `?demo=1` (for that tab; `?demo=0` turns it off). Used for the
screenshots and the tests.

## Development

```sh
npm ci
npm run dev                 # then open /?demo=1 on the address Vite prints
npm run typecheck
npm test                    # unit tests (vitest)
npm run package             # dist/lumen-github.mrbd.zip, the package Lumen installs
npx playwright install chromium firefox
npm run test:e2e            # keyboard e2e on a mock GitHub, Chromium and Firefox (after npm run package)
npm run icons               # re-renders public/icon-*.png
```

- **Without the glasses**, there is no `window.lumen`: the settings come from the address once
  (`?github.token=…&github.repos=…`) and stay in localStorage; the parameters are removed from the address
  bar right away. `github.api` (an `http://127.0.0.1:<port>` or https origin) points the app at a mock,
  for development only.
- **Mock GitHub**: `node mock/server.mjs` serves the demo fixtures on `http://127.0.0.1:8091` in GitHub's
  REST shape, for its token only, allows only `Authorization` and `Accept` in its CORS preflight, and has
  controls to revoke the token, hit the rate limit, fail calls, refuse check runs and delay answers
  (`/__mock/*`). The e2e runner (`tests/e2e/run.mjs`) starts it and serves `dist/` and the unzipped package
  the way Lumen does; `E2E_BROWSERS=firefox` and `E2E_ONLY=<regex>` narrow a run, and screenshots go to
  `.e2e-output/` (the demo captures of every screen to `.e2e-output/captures/`).
- **Package**: `scripts/package-offline.mjs` zips `dist/` with `index.html` and `manifest.webmanifest` at
  the root, fixed dates, and checks the manifest: `id` `cloud.bynd.lumen.github`, `version` equal to
  `package.json`, a square PNG icon of at least 192 px, `lumen_internet: true` and the `lumen_config` keys
  above. Install it with Lumen's `scripts/push-webapp.sh lumen-github.mrbd.zip` or from the companion
  (Apps > Add > Offline package from a file).
- **Layout**: `src/github` (REST client, mapping, errors), `src/state/GitHubProvider.tsx` (loading,
  refresh, the repository on screen), `src/pages` (the screens), `src/i18n/strings.ts` (every string,
  English and Portuguese), `src/demo` (fixtures shared with the mock).
- The engine on the glasses is GeckoView (Firefox 156); the build targets it (`firefox128`). Read
  [AGENTS.md](AGENTS.md) before changing the app.

## Limits

- Read-only: no merging, reviewing or commenting.
- Lists show the latest 20 items; the commits are those of the default branch.
- Links in descriptions show as their text: an offline app can't open another site.
- One token, so one GitHub account at a time.

## License

MIT, see [LICENSE](LICENSE).
