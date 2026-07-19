const FIREBASE_CERTS_URL = "https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com";
let certCache = { expiresAt: 0, certs: {} };

function corsHeaders(origin, env) {
  const allowed = origin === env.ALLOWED_ORIGIN || origin === "http://127.0.0.1:8787" || origin === "http://localhost:8787";
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

function base64UrlToBytes(value) {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(value.length / 4) * 4, "=");
  const binary = atob(padded);
  return Uint8Array.from(binary, char => char.charCodeAt(0));
}

function parseJwt(token) {
  const parts = token.split(".");
  if (parts.length !== 3) throw new Error("Invalid token format.");
  const header = JSON.parse(new TextDecoder().decode(base64UrlToBytes(parts[0])));
  const payload = JSON.parse(new TextDecoder().decode(base64UrlToBytes(parts[1])));
  return { parts, header, payload };
}

function pemToArrayBuffer(pem) {
  const base64 = pem.replace(/-----BEGIN CERTIFICATE-----|-----END CERTIFICATE-----|\s/g, "");
  return base64UrlToBytes(base64).buffer;
}

async function getFirebaseCert(kid) {
  const now = Date.now();
  if (certCache.expiresAt < now || !certCache.certs[kid]) {
    const response = await fetch(FIREBASE_CERTS_URL);
    if (!response.ok) throw new Error("Could not fetch Firebase certificates.");
    const cacheControl = response.headers.get("cache-control") || "";
    const maxAge = Number(cacheControl.match(/max-age=(\d+)/)?.[1] || 3600);
    certCache = {
      expiresAt: now + maxAge * 1000,
      certs: await response.json()
    };
  }
  const cert = certCache.certs[kid];
  if (!cert) throw new Error("Unknown Firebase token key.");
  return cert;
}

async function verifyFirebaseIdToken(token, env) {
  const { parts, header, payload } = parseJwt(token);
  if (header.alg !== "RS256") throw new Error("Unexpected token algorithm.");

  const issuer = `https://securetoken.google.com/${env.FIREBASE_PROJECT_ID}`;
  const now = Math.floor(Date.now() / 1000);
  if (payload.aud !== env.FIREBASE_PROJECT_ID) throw new Error("Invalid token audience.");
  if (payload.iss !== issuer) throw new Error("Invalid token issuer.");
  if (!payload.sub) throw new Error("Missing user id.");
  if (payload.exp <= now) throw new Error("Expired token.");

  const cert = await getFirebaseCert(header.kid);
  const key = await crypto.subtle.importKey(
    "spki",
    pemToArrayBuffer(cert),
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["verify"]
  );
  const signedData = new TextEncoder().encode(`${parts[0]}.${parts[1]}`);
  const signature = base64UrlToBytes(parts[2]);
  const valid = await crypto.subtle.verify("RSASSA-PKCS1-v1_5", key, signature, signedData);
  if (!valid) throw new Error("Invalid token signature.");
  return payload;
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
