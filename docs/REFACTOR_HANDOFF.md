# Refactor handoff: splitting `index.html`

State of `main` @ `7d87233` (PR #22 merged). Written 2026-11-01.

**Verified vs not verified.** Items marked *verified* were checked by script against the files on `main`. Nothing here has been run in a browser. The live site has not been opened.

## Status update (main @ `90c73c5`, 2026-11-02)

The numbers and "not run in a browser" notes below are from the original write-up on `7d87233`. Since then:

| Item | State |
| --- | --- |
| 1 auth module | Done (#26). `js/auth-module.js`. Needs a real Google sign-in check after each deploy. |
| 2 trade math | Done for the pure parts (#34): `js/trade-math.js` with `tests/unit/trade-math.test.cjs`. The P&L aggregates at the top of `todays-summary.js`, `ruleLimits` and `lastDayBroke` still read `window.jl*` and `__trades` directly and were not moved. |
| 3 dead code | Done (#27). Shared helpers (`esc`, `rd`, `wr`, `render`) were deliberately not merged: they are different functions that share a name. |
| 4 storage | Registry only (#35): `js/storage-keys.js`, every script reads key names from it. There is no wrapper around `localStorage` and no state store, on purpose, because the auth module patches `localStorage.setItem`. `theme`, `selectedDate` and the `jlPsy:` prefix are still literals. List of keys: `docs/storage-keys.md`. |
| 5 empty catches | Done (#25, and the auth module in #33). |
| 6 config | Done (#30): `js/app-config.js`. |
| 7 docs | `README.md` and `ARCHITECTURE.md` updated. `component-inventory.md` and `preserve-ids.md` carry an out-of-date banner: they describe the pre-redesign UI and were not rewritten. |

Known and left alone: `revStats` in `trade-math.js` throws when the trade list contains `null`.

## Where things stand

- `index.html` went from about 1.08 MB to about 149 KB. 51 scripts now live in `js/`.
- Every classic inline script has been moved verbatim. One block is still inline on purpose: the `type="module"` Firebase auth block (about 30 KB).
- *Verified* on `main`: 51 external scripts plus 1 inline module; every referenced file exists; no `js/` file is unreferenced; no script is loaded twice; `</head>`, `</body>` and `</html>` each appear once; all 51 files and the module pass `node --check`; all 8 inline `onclick` handler functions are assigned to `window`.
- `.github/workflows/deploy-pages.yml` copies the whole repo, so `js/` ships. *Verified.*

## Commit history of the split

| Commit | Change |
| --- | --- |
| `7d87233` | Merge PR #22: account-settings, todays-summary, psychology-room (JS-48 to JS-50) |
| `fae5825` | Merge PR #21: nine feature scripts (JS-39 to JS-47) |
| `ab7e3e8` | Restore `index.html` to `a9c0205`: the PR #20 merge produced a corrupted `index.html` |
| `4479684` | Merge PR #20 (the bad merge) |
| `57333aa` | Merge PR #19: upload, trades, journal, calendar scripts (JS-34 to JS-38) |

Earlier phase-1 commits (JS-1 to JS-33) are in `git log`. UI commits from a parallel session landed between them (for example "Trade Tools: icon-tile cards"). **Always compare against current `main` before and after merging.** PR #20 shows what happens when that goes wrong.

## Before any further change

1. Run `node scripts/check-static.mjs` (it also runs in CI on every PR). It catches a corrupted `index.html`, missing or duplicate script tags and syntax errors. It does not test behaviour.
2. Load the live site with the console open and click through **every tab**, especially Today's Summary and Psychology. Check for `ReferenceError` or 404 on any `js/*.js`. Sign in and out. Reload and confirm data persists.
3. Merges to `main` deploy to production. There is no staging branch (`docs/known-issues.md` #2).

## Remaining items

Findings below come from a static scan of `main` (regex-based, not a full parse), so treat counts as close, not exact.

### Item 1: move the `type="module"` auth block

- It starts with `import { firebaseConfig, aiProxyConfig } from './firebase-config.js?v=20260719-cloudflare-ai';`. From `js/` that must become `'../firebase-config.js?v=20260719-cloudflare-ai'`. Keep the `?v=` query.
- *Verified:* the block uses neither `import.meta` nor `document.currentScript`, so the path is the only thing that has to change.
- Module scripts are deferred either way, so run timing should stay the same. **Not verified.**
- There is no offline bypass, so a broken login means a lockout. Do this last, in its own PR, and sign in, sign out and reload before merging.

### Item 2: separate trade math, grading, prop rules, circuit breaker from display

- `js/todays-summary.js` (92 KB) is one of only 3 files that are not IIFE-wrapped, and it sets `window.__trades`, which 17 other files read.
- Plan: record golden values from the live app first (P&L, grades, prop-rule limits, breaker trips), extract pure functions into new files without DOM access, leave thin display wrappers, and compare golden values afterwards.
- The load order is part of the contract (`docs/ARCHITECTURE.md`). New files must load before their callers.

### Item 3: dead and duplicate code

- 17 function names appear in more than one file (`esc`, `rd`, `wr`, `money`, `render`, `paint`, `today` and others). Because 48 of 51 files are IIFE-wrapped, these are almost certainly separate local copies, not collisions. A scan of the 3 unwrapped files found no cross-file global collisions.
- So the real opportunity is shared helpers (`esc` is copied into 4 files, `render` into 7), not bug fixing. Do it one helper at a time, and only after item 2.
- Renames must also check inline HTML handlers.

### Item 4: state store and one storage layer

- About 193 `localStorage`/`sessionStorage` references. Largest: the inline module (34), `quick-log.js` (33), `todays-summary.js` (15), `journal-tab.js` (13), `profile-tab.js` (12).
- Only 20 keys are string literals. About 123 calls build keys dynamically, so **the real key list is unknown**. Get it at runtime first: in a dev session, wrap `getItem`/`setItem`/`removeItem` to log keys while clicking through every tab.
- **The auth module replaces `localStorage.setItem`/`removeItem`/`clear` to trigger Firestore sync** (`docs/ARCHITECTURE.md`). A storage layer that bypasses those methods silently stops cloud sync and risks data loss. The wrapper must call `localStorage.setItem`.
- Do not rename keys while routing calls. Existing users' data is under the old keys. Test with an existing profile that has real data.

### Item 5: empty `catch` blocks

- About 121 of 207 `catch` blocks have an empty or comment-only body. `psychology-room.js` has 32, `todays-summary.js` 11, `quick-log.js` 10, `journal-tab.js` 7, `profile-tab.js` 7.
- Plan: add a small `logError(context, err)` helper and call it in the empty catches without changing control flow. Triage which are deliberate (for example storage failures in private mode) before touching them. Fix real bugs it reveals in separate commits.

### Item 6: config out of code, API layer

- This one is smaller than expected: only **3 `fetch(` call sites** in `js/`: `ai-coach-chat.js` (`/aiCoach`), `market-data.js` (`/market`), `upload-sync.js` (`http://localhost:8787/api/sync-broker`).
- The Worker URL is already centralised in `firebase-config.js`. Two hardcoded URLs remain: `localhost:8787` in `upload-sync.js` (desktop launcher only) and `https://kavyabaghel.github.io` in `psychology-room.js`.
- The Firebase web config in the repo is public by design. Protection comes from `firestore.rules`, which is worth a separate review.

### Item 7: docs

- Done in this PR: `docs/ARCHITECTURE.md` (layout, load order, contracts, storage, deploy), this file, a corrected `PROJECT_MAP.md`, and `scripts/check-static.mjs` with its CI workflow.
- Still stale: `docs/component-inventory.md`, `docs/preserve-ids.md` and `README.md` have not been checked against the new layout.

## Suggested order

Browser smoke test, then 3 (shared helpers), 5 (logging only), 4, 2, 6, and 1 last.
