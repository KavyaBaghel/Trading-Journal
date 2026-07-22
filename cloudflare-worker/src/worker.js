async function verifyFirebaseIdToken(token, env) {
  // Firebase web API keys identify a project, but do not grant access to its data.
  // The ID token itself remains required, verified by Firebase, and never stored.
  if (!env.FIREBASE_WEB_API_KEY) {
    throw new Error("Worker config is missing FIREBASE_WEB_API_KEY.");
  }

  const response = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${encodeURIComponent(env.FIREBASE_WEB_API_KEY)}`,
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
  return json({ text: data?.choices?.[0]?.message?.content || "" }, 200, cors);
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

