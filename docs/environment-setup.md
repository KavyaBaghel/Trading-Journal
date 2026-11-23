# environment-setup.md

## Purpose
How to get Journall running locally from scratch. This app is not just a static site — it depends on a local server script and a Python MT5 bridge for broker sync. Written so a future session (or you, months from now) doesn't have to rediscover this.

## Repo
`https://github.com/KavyaBaghel/Trading-Journal.git`
(Note: repo was previously named `journall-trading-journal` — if cloning fresh, use the current name above.)

## Core files
- `index.html` — the entire frontend application (single file, no build step)
- `local-server.ps1` — local development server script (also handles MT5 Python package auto-install)
- `mt5_sync.py` — Python bridge script that talks to the MetaTrader5 terminal for broker sync
- `functions/index.js` — backend functions (Firebase)
- `cloudflare-worker/` — Cloudflare Worker source (separate deploy target from the main site)

## Backend services this app depends on
- **Firebase** — auth + data sync (cloud trade storage)
- **Cloudflare Worker** — see `cloudflare-worker/` folder, deployed separately via `wrangler.toml`
- **Local MT5 bridge** (`mt5_sync.py`) — only needed if testing live MetaTrader5 broker sync; requires Python with the `MetaTrader5` package installed (local-server.ps1 attempts auto-install if missing)

## Running locally
1. Clone the repo, `cd` into the project folder.
2. Run `local-server.ps1` in PowerShell — this starts the local dev server (observed running on `localhost:8787` in past sessions) and attempts to set up the Python MT5 bridge if needed.
3. Open the local URL in a browser to test changes before pushing.

## Deployment
- Push to `main` → GitHub Actions runs `deploy.yml` → deploys to `gh-pages` branch → live at the GitHub Pages URL.
- **Known issue:** the live site's service worker aggressively caches — after every deploy, hard-refresh (Ctrl+Shift+R) and if that's not enough, manually unregister the service worker (DevTools → Application → Service Workers → Unregister) before trusting what you see. See known-issues.md.

## Git identity
If cloning on a new machine, git will need identity configured before the first commit:
```
git config --global user.email "you@example.com"
git config --global user.name "Your Name"
```
