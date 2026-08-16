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
  const aiKey = env.OPENROUTER_API_KEY || env.GROQ_API_KEY;
  if (!aiKey) return json({ error: "OPENROUTER_API_KEY secret is not configured." }, 500, cors);

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

  const completion = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${aiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": env.ALLOWED_ORIGIN || "https://kavyabaghel.github.io",
      "X-Title": "Journall"
    },
    body: JSON.stringify({
      model: env.OPENROUTER_MODEL || env.GROQ_MODEL || "openai/gpt-oss-120b:free",
      max_tokens: mode === "generation" ? 500 : 450,
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

function numberOrZero(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function toTradeDateParts(timestamp) {
  const raw = Number(timestamp);
  const dt = timestamp
    ? new Date(raw > 1e11 ? raw : raw * 1000)
    : new Date();
  const safe = Number.isNaN(dt.getTime()) ? new Date() : dt;
  return {
    date: safe.toISOString().slice(0, 10),
    time: safe.toTimeString().slice(0, 8)
  };
}

async function cTraderGet(url, token) {
  const response = await fetch(url, {
    method: "GET",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Accept": "application/json"
    }
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data?.description || data?.error || data?.message || `cTrader HTTP ${response.status}`);
  }
  return data;
}

async function handleCTraderSync(request, env, cors) {
  const authHeader = request.headers.get("authorization") || "";
  const idToken = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
  if (!idToken) return json({ error: "Sign in required." }, 401, cors);
  await verifyFirebaseIdToken(idToken, env);

  const { token = "", accountId = "", days = 30 } = await request.json().catch(() => ({}));
  const cTraderToken = String(token || "").trim();
  if (!cTraderToken) return json({ error: "cTrader Access Token is required." }, 400, cors);

  let accId = String(accountId || "").trim();
  if (!accId) {
    const accountsData = await cTraderGet("https://openapi.ctrader.com/v2/accounts", cTraderToken);
    const accounts = accountsData?.data || accountsData?.accounts || [];
    if (accounts.length) accId = String(accounts[0].accountId || accounts[0].id || "");
  }
  if (!accId) return json({ error: "cTrader Account ID is required. Paste it from cTrader if auto-detect fails." }, 400, cors);

  const safeDays = Math.max(1, Math.min(365, Number(days) || 30));
  const fromDt = Date.now() - safeDays * 86400000;
  const toDt = Date.now() + 86400000;
  const dealsData = await cTraderGet(
    `https://openapi.ctrader.com/v2/accounts/${encodeURIComponent(accId)}/deals?from=${fromDt}&to=${toDt}`,
    cTraderToken
  );
  const deals = Array.isArray(dealsData?.deal)
    ? dealsData.deal
    : (Array.isArray(dealsData?.deals) ? dealsData.deals : []);

  const trades = deals.map((d, i) => {
    const symbol = String(d.symbolName || d.symbol || "Unknown").trim();
    const sideRaw = String(d.tradeSide || d.side || "").toUpperCase();
    const side = (sideRaw.includes("BUY") || sideRaw === "1") ? "BUY" : "SELL";
    const pnl = numberOrZero(d.profit);
    const commission = numberOrZero(d.commission);
    const swap = numberOrZero(d.swap);
    const netPnl = (Math.abs(pnl) > 10000 ? pnl / 100 : pnl) + commission + swap;
    const rawVolume = numberOrZero(d.volume);
    const volume = rawVolume > 100 ? rawVolume / 100000 : rawVolume;
    const price = numberOrZero(d.executionPrice || d.price);
    const ts = d.executionTimestamp || d.createTimestamp;
    const parts = toTradeDateParts(ts);
    const tid = String(d.dealId || d.positionId || i);

    return {
      id: `ctrader-${tid}`,
      date: parts.date,
      time: parts.time,
      symbol,
      side,
      pnl: Math.round(netPnl * 100) / 100,
      volume: Math.round(volume * 100) / 100,
      openPrice: price,
      closePrice: price,
      reason: "User",
      commission: Math.round(commission * 100) / 100,
      swap: Math.round(swap * 100) / 100,
      notes: `cTrader Cloud Sync (#${tid})`
    };
  }).filter(t => t.symbol);

  return json({ ok: true, trades }, 200, cors);
}

export default {
  async fetch(request, env) {
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
    if (request.method === "POST" && url.pathname === "/ctraderSync") {
      try {
        return await handleCTraderSync(request, env, cors);
      } catch (error) {
        return json({ error: error.message || "cTrader sync backend failed." }, 500, cors);
      }
    }
    return json({ ok: true, service: "Journall AI Worker" }, 200, cors);
  }
};
