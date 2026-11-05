# Journall AI Cloudflare Worker

Free backend proxy for Journall AI Coach. Users do not install Ollama. The Groq API key stays in Cloudflare secrets, not in the website.

## Deploy

```powershell
cd "C:\Users\cnjac\Documents\Codex\2026-05-16\files-mentioned-by-the-user-krishnas\KrishnasTradingJournalApp\cloudflare-worker"
npx wrangler login
npx wrangler secret put OPENROUTER_API_KEY
npx wrangler deploy
```

After deploy, copy the Worker URL and paste it in `firebase-config.js`:

```js
export const aiProxyConfig = {
  url: "https://journall-ai.YOUR_WORKERS_SUBDOMAIN.workers.dev"
};
```

Then commit and push `firebase-config.js`.

## Match-Trader sync

The `/matchtrader` route reads closed trades and the balance from the Match-Trader Trader API. It needs a read-only token stored as a Worker secret. The token never goes in the repo, the browser or Firestore.

One-time setup:

```powershell
cd cloudflare-worker
npx wrangler secret put MT_TRADER_TOKEN
```

Paste the read-only token when prompted. Secrets survive redeploys. Only the Firebase user in `MT_OWNER_UID` (set in `wrangler.toml`) may call the route.

Deploy: pushing changes under `cloudflare-worker/` to `main` deploys the Worker through `.github/workflows/deploy-worker.yml`. That workflow needs two repository secrets: `CLOUDFLARE_API_TOKEN` (Edit Cloudflare Workers template) and `CLOUDFLARE_ACCOUNT_ID`. You can also run it by hand from the Actions tab, or run `npx wrangler deploy` locally.

Check that it is live: a POST to `/matchtrader` without a sign-in token must answer `Sign in required.` (401). If it answers `{"ok":true,"service":"Journall AI Worker"}`, the route is not deployed yet.
