# Architecture

How the app is put together after the `index.html` split (`main` @ `7d87233`).
Everything marked **verified** was checked by script against the files on `main`. Everything marked **not verified** needs a browser.

## Layout

| Path | What it is |
| --- | --- |
| `index.html` | Markup, plus **one** inline `<script type="module">` (Firebase auth and cloud sync). About 149 KB. |
| `js/` | 51 classic scripts, one per feature area. Loaded by `<script src>` tags in `index.html`. |
| `css/` | Stylesheets. |
| `firebase-config.js` | Public Firebase web config and the Cloudflare Worker URL (`aiProxyConfig.url`). Imported by the inline module. |
| `cloudflare-worker/` | AI/market proxy Worker. |
| `functions/` | Firebase Cloud Functions. |
| `service-worker.js` | Network-first offline shell. |
| `scripts/` | `build-site.mjs` (CSS bundler used at deploy), `check-static.mjs` (static sanity check, see below). |

## How scripts load

- Every `js/` file is a **classic script with no `defer` or `async`**, so they run in the order they appear in `index.html`. The order is therefore part of the program. See the table below.
- The inline `type="module"` block is **deferred by the browser**: it runs after all classic scripts have run, wherever it sits in the page. Classic scripts must not need things the module provides (such as `window.currentUser` or `window.renderAll`) while they load. They can use them later, from event handlers and timers.
- 48 of the 51 files are wrapped in an IIFE, so their local helpers do not leak. The 3 that are not wrapped (`js/live-balance.js`, `js/todays-summary.js`, `js/trades-open-positions.js`) declare top-level globals.

## Contracts between files

- **`window.__trades`** is set in `js/todays-summary.js` and read by 17 other files. Scripts that load *before* it (`trades-open-positions.js`, `pip-value-settings.js`, `account-settings.js`) must only read it lazily. **Not verified.**
- **Inline `onclick` handlers.** `index.html` calls 8 functions by name: `ggToggleSetup`, `ggApplyFpFlex`, `ggStep`, `ggBackToTypes`, `ggCloseModal`, `ggCreateGoal`, `ggOpenTypePicker`, `ggSaveSetup`. All 8 are assigned to `window` inside `js/account-settings.js` (**verified**). Do not rename or un-expose them without changing the HTML.
- **Globals set by the module:** `currentUser`, `renderAll`, `jlRefreshName`, `checkAndPromptUsername`, `journalAlreadyOpened`, `journallReloadDataFromStorage`, `journallGetFirebaseIdToken`, `journallAiProxyUrl`, `jlSyncedStateBytes`, and the flags `__jlCloudSynced`, `__jlUniqIds`, `__journallBlockCloudSave`, `__journallPostGateRenderDone`, `__journallStoragePatched`.

## Storage and cloud sync

- There are about 193 references to `localStorage`/`sessionStorage` across the code. Only 20 keys are string literals (for example `jlJournals`, `jlPrefs`, `jlAccountSettings`, `viztrade_trading_page_trades`). About 123 calls build the key dynamically, so the full key list is **not known from reading the code**.
- **The inline module replaces `localStorage.setItem`, `removeItem` and `clear`** with wrappers. When a synced key changes, the wrapper schedules a save to Firestore (`users/{uid}/journallState/main`), skipped for `uid === 'local_user'`. The save merges local and cloud state in both directions.
- Consequence: **anything that writes storage without going through `localStorage.setItem` silently stops syncing.** Any storage layer must call the patched methods.

## Network

- The Worker URL comes from `firebase-config.js`. `js/ai-coach-chat.js` posts to `<worker>/aiCoach` and `js/market-data.js` posts to `<worker>/market`.
- `js/upload-sync.js` posts to `http://localhost:8787/api/sync-broker`. That only exists when the Windows launcher's local server is running.
- There are only 3 `fetch(` call sites in `js/`.

## Build, deploy, offline

- `.github/workflows/deploy-pages.yml` runs on push to `main`: `rsync` the repo into `dist/`, run `scripts/build-site.mjs` (merges runs of adjacent local `<link rel="stylesheet">` tags in `css/`), then publish `dist/`. If the build step fails it publishes the unmodified repo. `js/` is copied as-is.
- `.github/workflows/deploy.yml` also runs on push to `main` and publishes `./` to the `gh-pages` branch with `force_orphan`. Two deploy workflows exist; which one serves the live site is **not verified**.
- `service-worker.js` is network-first for same-origin GETs and caches what it fetches, so `js/` files are cached after one online visit. Cache name is `journall-shell-v2`. See `docs/known-issues.md` #1 about stale caches after a deploy.

## Static check

`node scripts/check-static.mjs` (also run by `.github/workflows/static-check.yml` on pull requests and pushes to `main`) verifies:

1. `index.html` has exactly one `</head>`, `</body>` and `</html>`, and balanced `<script>` tags.
2. Every local `<script src>` file exists and none is loaded twice.
3. Every file in `js/` is loaded by `index.html`.
4. Every `js/` file and every inline script passes `node --check` (syntax only).

It does **not** test behaviour: load order, login, tabs and storage still need a browser. It was written to catch a corrupted `index.html` such as the one PR #20 produced.

## Script load order (from `index.html` on `main`)

Row 1 is the first script that runs. `Line` is the line in `index.html`.

| # | Line | In | File |
| --- | --- | --- | --- |
| 1 | 26 | head | `js/perf-timers.js` |
| 2 | 27 | head | `js/profile-card-spotlight.js` |
| 3 | 87 | body | `js/live-balance.js` |
| 4 | 88 | body | `js/data-adapter.js` |
| 5 | 89 | body | `js/data-bootstrap.js` |
| 6 | 90 | body | `js/journal-sync.js` |
| 7 | 91 | body | `js/account-sync.js` |
| 8 | 92 | body | `js/profile-username.js` |
| 9 | 93 | body | `js/upload-sync.js` |
| 10 | 94 | body | `js/ai-coach-chat.js` |
| 11 | 95 | body | `js/market-data.js` |
| 12 | 405 | body | `js/trades-open-positions.js` |
| 13 | 983 | body | `js/pip-value-settings.js` |
| 14 | 984 | body | `js/tools-calculators.js` |
| 15 | 1057 | body | `js/upload-page.js` |
| 16 | 1059 | body | `js/challenge-limits.js` |
| 17 | 1061 | body | `js/account-settings.js` |
| 18 | 1086 | body | `js/todays-summary.js` |
| 19 | 1087 | body | `js/focus-rule.js` |
| 20 | 1088 | body | `js/trades-tab.js` |
| 21 | 1089 | body | `js/confirm-toast.js` |
| 22 | 1090 | body | `js/profile-hero-spotlight.js` |
| 23 | 1091 | body | `js/journal-tab.js` |
| 24 | 1092 | body | `js/calendar-tab.js` |
| 25 | 1093 | body | `js/psychology-room.js` |
| 26 | 1094 | body | `js/ai-coach-tab.js` |
| 27 | 1095 | body | `js/profile-tab.js` |
| 28 | 1097 | body | `js/analytics-empty-state.js` |
| 29 | 1098 | body | `js/psychology-rules-paint.js` |
| 30 | 1099 | body | `js/extra-rules.js` |
| 31 | 1100 | body | `js/circuit-breaker.js` |
| 32 | 1102 | body | `js/share-card.js` |
| 33 | 1105 | body | `js/daily-journal.js` |
| 34 | 1107 | body | `js/daily-journal-history.js` |
| 35 | 1109 | body | `js/study-notes.js` |
| 36 | 1111 | body | `js/ai-coach-fixes.js` |
| 37 | 1115 | body | `js/psychology-summary.js` |
| 38 | 1116 | body | `js/analytics-profit-target.js` |
| 39 | 1117 | body | `js/analytics-daily-drawdown.js` |
| 40 | 1118 | body | `js/analytics-setups.js` |
| 41 | 1119 | body | `js/market-tab.js` |
| 42 | 1121 | body | `js/weekly-review.js` |
| 43 | 1123 | body | `js/day-recap.js` |
| 44 | 1126 | body | `js/pwa-install.js` |
| 45 | 1127 | body | (inline) type="module" Firebase auth + cloud sync |
| 46 | 1867 | body | `js/email-form-guard.js` |
| 47 | 1868 | body | `js/login-background.js` |
| 48 | 1869 | body | `js/loading-screen.js` |
| 49 | 1872 | body | `js/prop-rules.js` |
| 50 | 1910 | body | `js/back-to-top.js` |
| 51 | 1912 | body | `js/quick-log.js` |
| 52 | 1913 | body | `js/day-lock.js` |

## Adding or moving a script

1. Put the code in `js/<name>.js`, wrapped in an IIFE unless something needs it as a global.
2. Add the `<script src="js/<name>.js"></script>` tag in the position the code ran from before, unchanged.
3. Anything called from inline HTML must be assigned to `window`.
4. Run `node scripts/check-static.mjs`.
5. Load the site and click through every tab before merging. Merges to `main` deploy to production.
