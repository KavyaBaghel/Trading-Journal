function corsHeaders(origin, env) {
  const localOrigins = ["http://127.0.0.1:8787", "http://localhost:8787"];
  const allowed = origin === env.ALLOWED_ORIGIN || localOrigins.includes(origin);
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
  if (!env.GROQ_API_KEY) return json({ error: "GROQ_API_KEY secret is not configured." }, 500, cors);

  const completion = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${env.GROQ_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: env.GROQ_MODEL || "llama-3.1-8b-instant",
      max_tokens: mode === "generation" ? 650 : 450,
      temperature: mode === "generation" ? 0.35 : 0.25,
      messages: [
        {
          role: "system",
          content:
            "You are a trading psychology and discipline coach embedded in Journall. " +
            "You analyze past trades, mind-check answers, checklist behavior, risk discipline, and mistake patterns only. " +
            "You never suggest specific future trades, entries, price targets, market predictions, or financial advice. " +
            "If asked to call a trade, decline and redirect to reviewing process and psychology instead. " +
            "If total logged trades is fewer than 5, begin with: Not enough trade history yet for a reliable pattern. " +
            "Answer in 3-5 sentences max. Be direct, specific, and avoid generic motivational filler."
        },
        { role: "user", content: `Journal context:\n${context}\n\nTrader request:\n${prompt}` }
      ]
    })
  });

  const data = await completion.json().catch(() => ({}));
  if (!completion.ok) {
    return json({ error: data?.error?.message || `Groq returned ${completion.status}.` }, 502, cors);
  }
  const text = data?.choices?.[0]?.message?.content || "";
  if (!text.trim()) return json({ error: "Groq returned no response text." }, 502, cors);
  return json({ text: text.trim() }, 200, cors);
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
    return json({ ok: true, service: "Journall AI Worker" }, 200, cors);
  }
};
