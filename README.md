# Journall - Trading Journal Dashboard

Journall is a local-first trading journal and analytics dashboard built for reviewing trading performance, discipline, risk, and daily execution. It runs as a deployable website, installable PWA, and Windows desktop-style web app while storing journal data locally in the browser profile.

## Features

- Trading dashboard with P&L, win rate, profit factor, drawdown, and challenge progress
- Today's Summary view for daily trading performance and intraday equity curve
- Trade journal pages with setup, emotion, mistake, improvement notes, screenshots, and recordings
- Analytics charts for equity curve, outcome mix, session performance, mistake impact, direction split, weekdays, duration, lot size, and exit reasons
- Calendar and heatmap views for reviewing trading days
- AI Coach powered by local Ollama for private trade review and improvement suggestions
- AI widgets and reports that summarize trading weaknesses, strong sessions, risk issues, and next actions
- Local Windows launchers for desktop-style use
- Website deployment support for GitHub Pages, Netlify, and Vercel
- Mobile/PWA support through the included local server, service worker, and manifest

## Tech Stack

- HTML, CSS, JavaScript
- Chart.js
- LocalStorage and IndexedDB
- Service Worker / Web Manifest
- PowerShell Windows launch scripts
- Local Ollama AI integration
- ChromaDB local vector database with `nomic-embed-text` embeddings

## Why I Built It

I built Journall to make trade review faster and more honest. Instead of only tracking profit and loss, the app focuses on behavior: repeated mistakes, weak sessions, emotional discipline, risk limits, and what to improve before the next trading session.

## Run Locally

Open the app directly:

```text
OPEN_APP_HERE.bat
```

Or launch the desktop-style app:

```text
Journall App.vbs
```

Chrome app mode:

```text
Journall Chrome.bat
```

Local server:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File ./local-server.ps1 -Root . -Port 8787
```

Then open:

```text
http://127.0.0.1:8787/index.html
```

## Website Deployment

Journall can be hosted as a static website because the main app lives in `index.html` and uses browser storage for journal data.

### GitHub Pages

1. Push this repository to GitHub.
2. Open the repository on GitHub.
3. Go to `Settings` -> `Pages`.
4. Under `Build and deployment`, choose `Deploy from a branch`.
5. Select branch `main` and folder `/root`.
6. Save.

After GitHub finishes publishing, the website will open at:

```text
https://kavyabaghel.github.io/Trading-Journal/
```

### Netlify or Vercel

Import the GitHub repository and use the project root as the publish directory. No build command is required.

The public website works for dashboard, journal, analytics, calendar, goals, and local browser storage. Local Ollama/RAG AI features still require Ollama and the local RAG server running on the same computer.

## Local AI Setup

1. Install Ollama from `https://ollama.com`
2. Install the Python dependencies:

```powershell
py -m pip install -r requirements.txt
```

3. Pull the local chat and embedding models:

```powershell
ollama pull llama3.2
ollama pull nomic-embed-text
```

4. Open Journall with the desktop launcher
5. Go to AI Coach and ask a question

The launcher starts the local RAG server on `http://127.0.0.1:8790`. The AI Coach indexes trades into ChromaDB, retrieves the most relevant journal entries, then asks Ollama for specific feedback.

The app still works without Ollama, but AI coaching features require the local Ollama server.

## Privacy

Journall is designed to run locally first. Trade data, notes, screenshots, and recordings are stored in the local app/browser profile, not sent to a cloud backend by this project. If you publish the website publicly, the code is public, but each visitor's journal data stays inside their own browser.

## Portfolio Summary

Built a local-first trading journal dashboard with interactive analytics, journal workflows, risk tracking, calendar review, and local AI coaching to help traders review execution quality and improve discipline.
