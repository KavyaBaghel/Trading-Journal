function corsHeaders(origin, env) {
  const localOrigins = ["http://127.0.0.1:8787", "http://localhost:8787"];
  // Electron and installed file-based apps send Origin: null. The Firebase ID
  // token is still verified for every request, so this only enables the same
  // signed-in Journall user to use the desktop build.
  const allowed = origin === "null" || origin === env.ALLOWED_ORIGIN || localOrigins.includes(origin);
  return {
    "Access-Control-Allow-Origin": allowed ? origin : env.ALLOWED_ORIGIN,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Vary": "Origin"
  };
}

function json(data, status, headers) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...headers }
  });
}

async function verifyFirebaseIdToken(token, env) {
  // Firebase web API keys only identify a Firebase project. The caller must
  // still present a valid, signed Firebase ID token to access this Worker.
  const firebaseApiKey = env.FIREBASE_WEB_API_KEY || "AIzaSyDmnTyCBVnjha1gSurY2zbpocvSCjm6dY4";

  const response = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${encodeURIComponent(firebaseApiKey)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idToken: token })
    }
  );
  const data = await response.json().catch(() => ({}));
  const user = data?.users?.[0];
  if (!response.ok || !user?.localId) {
    throw new Error(data?.error?.message || "Invalid or expired sign-in token.");
  }
  return user;
}

async function handleAiCoach(request, env, cors) {
  const authHeader = request.headers.get("authorization") || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
  if (!token) return json({ error: "Sign in required." }, 401, cors);

  await verifyFirebaseIdToken(token, env);

  const { prompt = "", context = "", mode = "chat" } = await request.json().catch(() => ({}));
  if (!String(prompt).trim()) return json({ error: "Prompt is required." }, 400, cors);
  const aiKey = env.GROQ_API_KEY;
  if (!aiKey) return json({ error: "GROQ_API_KEY secret is not configured." }, 500, cors);

  // Groq's free tier rejects oversized requests before the model can answer.
  // Keep enough room for the system prompt and completion while preserving
  // the newest, most relevant journal text.
  const limitText = (value, maxChars) => {
    const text = String(value || "");
    return text.length > maxChars
      ? `${text.slice(0, maxChars)}\n[older context omitted]`
      : text;
  };
  const safePrompt = limitText(prompt, mode === "generation" ? 12000 : 5000);
  const safeContext = mode === "generation" ? "" : limitText(context, 10000);

  const completion = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${aiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": env.ALLOWED_ORIGIN || "https://kavyabaghel.github.io",
      "X-Title": "Journall"
    },
    body: JSON.stringify({
      model: env.GROQ_MODEL || "openai/gpt-oss-20b",
      max_tokens: mode === "generation" ? 3000 : 2500,
      temperature: mode === "generation" ? 0.35 : 0.25,
      messages: [
        {
          role: "system",
          content:
            "You are Journall AI, a helpful conversational assistant inside a trading journal. " +
            "You can hold a normal, friendly conversation about everyday topics. For greetings, casual questions, or topics unrelated to trading, reply naturally and do not force the conversation back to trading or mention journal data. " +
            "When the user explicitly asks about their trades, emotions, discipline, mistakes, risk, or performance, use the journal context to provide a concise psychology and process review. " +
            "You never suggest specific future trades, entries, price targets, market predictions, or position-sizing changes. If asked to call a trade, decline briefly and redirect to process, psychology, or general trading education. " +
            "Only when the user asks for a trade-history analysis and fewer than 5 trades are logged, begin with: Not enough trade history yet for a reliable pattern. " +
            "Keep casual replies to 1-3 sentences and trade reviews to 3-5 direct sentences. Avoid generic motivational filler."
        },
        { role: "user", content: `Journal context:\n${safeContext}\n\nTrader request:\n${safePrompt}` }
      ]
    })
  });

  const data = await completion.json().catch(() => ({}));
  if (!completion.ok) {
    return json({ error: data?.error?.message || `OpenRouter returned ${completion.status}.` }, 502, cors);
  }
  const text = data?.choices?.[0]?.message?.content || "";
  if (!text.trim()) return json({ error: "OpenRouter returned no response text." }, 502, cors);
  return json({ text: text.trim() }, 200, cors);
}

// Free weekly calendar feed (Forex Factory export). No key. The feed only refreshes about once an hour and
// rate-limits hard, so responses are cached at the edge for an hour and a failure returns status 0.
async function ffCalendar(ctx) {
  const FEEDS = [
    "https://nfs.faireconomy.media/ff_calendar_thisweek.json",
    "https://nfs.faireconomy.media/ff_calendar_nextweek.json"
  ];
  const cache = caches.default;
  const pad = (n) => String(n).padStart(2, "0");
  const grab = async (feedUrl) => {
    const key = new Request(feedUrl);
    let res = await cache.match(key);
    if (!res) {
      const live = await fetch(feedUrl, { headers: { "Accept": "application/json" } });
      if (!live.ok) return { ok: false, rows: [] };
      const text = await live.text();
      if (!text.trim().startsWith("[")) return { ok: false, rows: [] }; // "Request Denied" HTML page
      res = new Response(text, { headers: { "content-type": "application/json", "cache-control": "public, max-age=3600" } });
      const put = cache.put(key, res.clone());
      if (ctx && ctx.waitUntil) ctx.waitUntil(put); else await put;
    }
    const rows = await res.json().catch(() => null);
    return { ok: Array.isArray(rows), rows: Array.isArray(rows) ? rows : [] };
  };
  try {
    const parts = await Promise.all(FEEDS.map(grab));
    if (!parts[0].ok) return { status: 0, events: [] }; // this week is required; next week is a bonus
    const seen = new Set();
    const events = [];
    for (const e of parts.flatMap((x) => x.rows)) {
      const d = new Date(e.date);
      if (Number.isNaN(d.getTime())) continue;
      const time = `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:00`;
      const id = `${time}|${e.country}|${e.title}`;
      if (seen.has(id)) continue;
      seen.add(id);
      events.push({
        time,
        country: String(e.country || ""),
        impact: String(e.impact || ""),
        event: String(e.title || ""),
        actual: e.actual ?? null, // the export carries no actuals
        estimate: e.forecast === "" ? null : (e.forecast ?? null),
        prev: e.previous === "" ? null : (e.previous ?? null),
        unit: ""
      });
    }
    return { status: 200, events: events.slice(0, 500) };
  } catch (error) {
    return { status: 0, events: [] };
  }
}

async function handleMarket(request, env, cors, ctx) {
  const authHeader = request.headers.get("authorization") || "";
  const idToken = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
  if (!idToken) return json({ error: "Sign in required." }, 401, cors);
  try {
    await verifyFirebaseIdToken(idToken, env);
  } catch (error) {
    return json({ error: error.message || "Invalid or expired sign-in token." }, 401, cors);
  }

  // The Finnhub key is a Worker secret (wrangler secret put FINNHUB_KEY).
  // It is never sent to the browser and never put in a URL.
  const apiKey = env.FINNHUB_KEY;
  if (!apiKey) return json({ error: "FINNHUB_KEY secret is not configured." }, 500, cors);

  const body = await request.json().catch(() => ({}));
  const isDate = (v) => /^\d{4}-\d{2}-\d{2}$/.test(String(v || "")) && !Number.isNaN(Date.parse(String(v)));
  const dayStr = (d) => d.toISOString().slice(0, 10);
  const from = isDate(body.from) ? String(body.from) : dayStr(new Date(Date.now() - 86400000));
  const to = isDate(body.to) ? String(body.to) : dayStr(new Date(Date.now() + 14 * 86400000));
  const span = (Date.parse(to) - Date.parse(from)) / 86400000;
  if (!(span >= 0 && span <= 31)) return json({ error: "Date range must be between 0 and 31 days." }, 400, cors);

  // status 0 = Finnhub could not be reached at all.
  const finnhub = async (path, params) => {
    try {
      const response = await fetch(`https://finnhub.io/api/v1/${path}?${new URLSearchParams(params)}`, {
        headers: { "X-Finnhub-Token": apiKey, "Accept": "application/json" }
      });
      const data = await response.json().catch(() => null);
      return { status: response.status, data };
    } catch (error) {
      return { status: 0, data: null };
    }
  };

  const [cal, news] = await Promise.all([
    finnhub("calendar/economic", { from, to }),
    finnhub("news", { category: "general" })
  ]);

  let events = cal.status === 200 && Array.isArray(cal.data?.economicCalendar)
    ? cal.data.economicCalendar.slice(0, 500).map((e) => ({
        time: String(e.time || ""),
        country: String(e.country || ""),
        impact: String(e.impact || ""),
        event: String(e.event || ""),
        actual: e.actual ?? null,
        estimate: e.estimate ?? null,
        prev: e.prev ?? null,
        unit: String(e.unit || "")
      }))
    : [];
  const items = news.status === 200 && Array.isArray(news.data)
    ? news.data.slice(0, 30).map((n) => ({
        id: n.id ?? null,
        datetime: Number(n.datetime) || 0,
        headline: String(n.headline || ""),
        source: String(n.source || ""),
        url: String(n.url || "")
      }))
    : [];

  let calStatus = cal.status;
  let calSource = "finnhub";
  if (calStatus !== 200) {
    const ff = await ffCalendar(ctx);
    if (ff.status === 200) { calStatus = 200; calSource = "forexfactory"; events = ff.events; }
  }
  return json({ ok: true, calendar: { status: calStatus, source: calSource, finnhubStatus: cal.status, events }, news: { status: news.status, items } }, 200, cors);
}

export default {
  async fetch(request, env, ctx) {
    const origin = request.headers.get("origin") || "";
    const cors = corsHeaders(origin, env);
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });

    const url = new URL(request.url);
    if (request.method === "POST" && url.pathname === "/aiCoach") {
      try {
        return await handleAiCoach(request, env, cors);
      } catch (error) {
        return json({ error: error.message || "AI backend failed." }, 500, cors);
      }
    }
    if (request.method === "POST" && url.pathname === "/market") {
      try {
        return await handleMarket(request, env, cors, ctx);
      } catch (error) {
        return json({ error: error.message || "Market backend failed." }, 500, cors);
      }
    }
    return json({ ok: true, service: "Journall AI Worker" }, 200, cors);
  }
};
