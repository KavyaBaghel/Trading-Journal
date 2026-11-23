# Browser smoke test

`smoke.py` loads the real `index.html` in headless Chromium, signs in with a stubbed Firebase (fake user, in-memory
Firestore), seeds 40 sample trades, clicks every tab and reports errors. It runs in CI on every pull request
(`.github/workflows/e2e-smoke.yml`) and compares against the base branch.

Run it locally:

    pip install playwright && playwright install --with-deps chromium
    python tests/e2e/smoke.py --root . --out smoke.json --shots shots

What it proves: all scripts load in order without a new exception, the auth module starts, the `localStorage`
cloud-sync patch is active, and every tab renders. For a pure refactor, "Tabs whose text differs from baseline" should say
`none (identical)`.

What it does not prove: real Google sign-in, real Firestore reads and writes, the Cloudflare Worker, mobile layout,
or anything that needs real trade history beyond the 40 sample trades.

Known: two uncaught `toFixed` exceptions occur on load. They also occur on the original pre-refactor page, so they are
tolerated in `KNOWN_PAGEERRORS` until someone fixes them.
