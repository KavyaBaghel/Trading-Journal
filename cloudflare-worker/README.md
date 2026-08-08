# Journall AI Cloudflare Worker

Free backend proxy for Journall AI Coach. Users do not install Ollama. The Groq API key stays in Cloudflare secrets, not in the website.

## Deploy

```powershell
cd "C:\Users\cnjac\Documents\Codex\2026-05-16\files-mentioned-by-the-user-krishnas\KrishnasTradingJournalApp\cloudflare-worker"
npx wrangler login
npx wrangler secret put GROQ_API_KEY
npx wrangler deploy
```

After deploy, copy the Worker URL and paste it in `firebase-config.js`:

```js
export const aiProxyConfig = {
  url: "https://journall-ai.YOUR_WORKERS_SUBDOMAIN.workers.dev"
};
```

Then commit and push `firebase-config.js`.
