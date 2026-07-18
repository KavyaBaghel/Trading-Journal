# Journall - Trading Journal Dashboard

Journall is a local-first trading journal and analytics dashboard built for reviewing trading performance, discipline, risk, and daily execution. It runs as a deployable website, installable PWA, and Windows desktop-style web app while storing journal data locally in the browser profile.

## Features

- Trading dashboard with P&L, win rate, profit factor, drawdown, and challenge progress
- Today's Summary view for daily trading performance and intraday equity curve
- Trade journal pages with setup, emotion, mistake, improvement notes, screenshots, and recordings
- Analytics charts for equity curve, outcome mix, session performance, mistake impact, direction split, weekdays, duration, lot size, and exit reasons
- Calendar and heatmap views for reviewing trading days
- AI Coach powered by a secure Firebase Cloud Function for trade review and improvement suggestions
- AI widgets and reports that summarize trading weaknesses, strong sessions, risk issues, and next actions
- Local Windows launchers for desktop-style use
- Website deployment support for GitHub Pages, Netlify, and Vercel
- Optional Firebase Google sign-in with Firestore user data sync for the public website
- Mobile/PWA support through the included local server, service worker, and manifest

## Tech Stack

- HTML, CSS, JavaScript
- Chart.js
- LocalStorage and IndexedDB
- Service Worker / Web Manifest
- Firebase Auth and Firestore for website sign-in/data sync
- PowerShell Windows launch scripts
- Secure Firebase AI coach integration
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

Journall can be hosted as a static website because the main app lives in `index.html`. Local use keeps data on the laptop. Public website use can require Google sign-in and sync each user's journal data to Firestore.

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

The public website works for dashboard, journal, analytics, calendar, goals, and Google sign-in cloud sync. AI coaching requires Firebase Functions with the OPENAI_API_KEY secret configured.

## Firebase Sign-In Setup

The website sign-in code is already in the app. To activate it:

1. Open `https://console.firebase.google.com`
2. Create a Firebase project.
3. Add a Web app.
4. Copy the Firebase config into `firebase-config.js`.
5. Go to `Authentication` -> `Sign-in method`.
6. Enable `Google`.
7. Go to `Firestore Database`.
8. Create a database.
9. Add these Firestore rules:

```text
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId}/journallState/{docId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

10. Go to `Authentication` -> `Settings` -> `Authorized domains`.
11. Add:

```text
kavyabaghel.github.io
```

The public Journall website requires Google sign-in before opening the dashboard.

## Local AI Setup

1. Install the Firebase CLI and configure the OpenAI secret
2. Install the Python dependencies:

```powershell
py -m pip install -r requirements.txt
```

3. Pull the local chat and embedding models:

```powershell
firebase functions:secrets:set OPENAI_API_KEY
firebase deploy --only functions
```

4. Open Journall with the desktop launcher
5. Go to AI Coach and ask a question

The website AI Coach sends scoped trade context to the secure Firebase aiCoach function for specific feedback.

The app still opens without AI, but coaching features require the deployed Firebase function.

## Privacy

Journall is designed to run locally first. On your laptop, trade data, notes, screenshots, and recordings stay in the local app/browser profile. On the public website, Google sign-in stores each user's synced journal state under their own Firebase user id.

## Portfolio Summary

Built a local-first trading journal dashboard with interactive analytics, journal workflows, risk tracking, calendar review, and local AI coaching to help traders review execution quality and improve discipline.
