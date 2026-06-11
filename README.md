# Journall - Trading Journal Dashboard

Journall is a local-first trading journal and analytics dashboard built for reviewing trading performance, discipline, risk, and daily execution. It runs as a Windows desktop-style web app and stores journal data locally in the browser profile.

## Features

- Trading dashboard with P&L, win rate, profit factor, drawdown, and challenge progress
- Today's Summary view for daily trading performance and intraday equity curve
- Trade journal pages with setup, emotion, mistake, improvement notes, screenshots, and recordings
- Analytics charts for equity curve, outcome mix, session performance, mistake impact, direction split, weekdays, duration, lot size, and exit reasons
- Calendar and heatmap views for reviewing trading days
- AI Coach powered by local Ollama for private trade review and improvement suggestions
- AI widgets and reports that summarize trading weaknesses, strong sessions, risk issues, and next actions
- Local Windows launchers for desktop-style use
- Mobile/PWA support through the included local server and manifest

## Tech Stack

- HTML, CSS, JavaScript
- Chart.js
- LocalStorage and IndexedDB
- Service Worker / Web Manifest
- PowerShell Windows launch scripts
- Local Ollama AI integration

## Why I Built It

I built Journall to make trade review faster and more honest. Instead of only tracking profit and loss, the app focuses on behavior: repeated mistakes, weak sessions, emotional discipline, risk limits, and what to improve before the next trading session.

## Run Locally

Open the app directly:

```text
OPEN_APP_HERE.bat
```

Or launch the desktop-style app:

```text
Krishna Trading Journal App.vbs
```

Chrome app mode:

```text
Krishna Journal Chrome.bat
```

Local server:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File ./local-server.ps1 -Root . -Port 8787
```

Then open:

```text
http://127.0.0.1:8787/index.html
```

## Local AI Setup

1. Install Ollama from `https://ollama.com`
2. Run:

```powershell
ollama run llama3.2
```

3. Open Journall
4. Go to AI Coach
5. Use `http://localhost:11434` with model `llama3.2`

The app still works without Ollama, but AI coaching features require the local Ollama server.

## Privacy

Journall is designed to run locally. Trade data, notes, screenshots, and recordings are stored in the local app/browser profile, not sent to a cloud backend by this project.

## Portfolio Summary

Built a local-first trading journal dashboard with interactive analytics, journal workflows, risk tracking, calendar review, and local AI coaching to help traders review execution quality and improve discipline.

