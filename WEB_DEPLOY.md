# Deploy Journall As A Website

Journall is now ready to publish as a static website. The app runs from `index.html`, uses `manifest.webmanifest` for installable PWA behavior, and uses `service-worker.js` for offline caching.

## GitHub Pages

1. Push the repo to GitHub.
2. Open the repo.
3. Go to `Settings` -> `Pages`.
4. Select `Deploy from a branch`.
5. Choose `main` and `/root`.
6. Save and wait for the deploy to finish.

Website URL:

```text
https://kavyabaghel.github.io/Trading-Journal/
```

## Netlify

1. Add a new site from Git.
2. Select this repository.
3. Leave build command empty.
4. Set publish directory to `.`.
5. Deploy.

## Vercel

1. Import the repository.
2. Use the default static project settings.
3. Leave build command empty.
4. Deploy.

## Local AI Note

The website version keeps journal, analytics, reports, calendar, and goals in the browser. Local AI coaching still needs Ollama and the RAG server running on the same computer.
