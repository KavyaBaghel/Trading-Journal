# Project Map

## What This Is

Journall is a local PWA-style desktop app. It uses a PowerShell local server and opens in Microsoft Edge app mode.

## File Map

| File | Purpose |
| --- | --- |
| `index.html` | Main app. Contains HTML, CSS, and JavaScript. |
| `package.json` | Makes the folder detectable as an app/project and exposes run scripts. |
| `CLAUDE.md` | Claude-readable guide for understanding and editing the app. |
| `AGENTS.md` | Agent-readable safety and project instructions. |
| `manifest.webmanifest` | Browser/PWA app metadata. |
| `service-worker.js` | Offline cache for the app shell. |
| `local-server.ps1` | Local HTTP server at port `8787`. |
| `launch-app.ps1` | Starts server and opens app-mode Edge window. |
| `Journall App.bat` | Double-click app launcher. |
| `Install App.bat` | Double-click shortcut installer. |
| `install-desktop-shortcut.ps1` | Creates Desktop and Start Menu shortcuts. |
| `assets/icon-192.png` | PWA icon. |
| `assets/icon-512.png` | PWA icon. |
| `assets/app-icon.ico` | Windows shortcut icon. |

## Main JavaScript Areas In `index.html`

| Area | What To Search |
| --- | --- |
| App state | `let trades`, `let filtered`, `let charts` |
| Stats helpers | `stats(`, `mistakes(`, `getB2B(` |
| Dashboard | `renderMetrics`, `renderCharts`, `renderInsights` |
| AI widgets | `renderWidgets`, `renderAIWidgetsText`, `generateAIWidgets` |
| AI Lab | `askBuiltInAI`, `generateAIJournalReport` |
| Calendar | `renderCalendar`, `openCalendarDayTrades` |
| Trade table | `renderGrid`, `applyFilters` |
| Journal | `renderJournalPage`, `openTradeJournal`, `saveJournalPageEntry` |
| Old journal import | `handleOldJournalImport`, `normalizeImportedJournalEntry`, `mergeImportedJournalEntries` |
| Startup render | `renderAll()` |

## Runtime URL

```text
http://127.0.0.1:8787/index.html
```
