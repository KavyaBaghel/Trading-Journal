# known-issues.md

## Purpose
Pre-existing bugs and recurring pain points that are known but not yet fully resolved. Distinct from a general feedback log — this is specifically for things that will affect the redesign work if not accounted for.

## 1. Service worker caching forces manual unregister after every deploy
Every single deploy today required manually going to DevTools → Application → Service Workers → Unregister before the live site reflected the new code, even after a hard-refresh (Ctrl+Shift+R). This will significantly slow down verifying each redesign chunk unless fixed first.
**Status:** Not yet fixed. Planned as a pre-redesign task — needs a proper cache-busting/versioning strategy in the service worker registration logic instead of relying on manual unregistration.

## 2. No staging/dev branch — every push goes straight to production
All changes today went directly to `main` → live GitHub Pages deploy. For a 12-page redesign executed in chunks, this means every intermediate state is briefly live and user-facing.
**Status:** Not yet fixed. Planned as a pre-redesign task — set up a `dev` branch, merge to `main` only after a full manual pass-through test.

## 3. Duplicate origin remote pointed at old repo URL (partially resolved)
Git remote `origin` was pointed at `journall-trading-journal.git` (old repo name) instead of `Trading-Journal.git` (current name). GitHub auto-redirected pushes, but this was fixed with `git remote set-url` mid-session on 2026-08-14. Confirm this hasn't reverted if working from a different machine/clone.

## Resolved today (2026-08-14), listed for reference
- Duplicate `id="currentBalanceInput"` (two elements, hidden one silently won `getElementById` lookups) — fixed
- `filtered` variable declaration silently dropped by a bad merge (used in 50+ places) — restored
- Missing `AbortController`/timeout handling in broker sync, misreported as "bridge unreachable" — fixed
- Page title stuck on "Command Center" fallback text instead of active tab name on initial load — fixed (added `selectTab('tradingpage')` call to DOMContentLoaded)
- Header bar, search box, and "Command Center" title (unwanted Manus AI redesign leftovers) — removed, replaced with restored floating profile widget + Daily Rules sidebox
