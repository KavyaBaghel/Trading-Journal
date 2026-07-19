const admin = require("firebase-admin");
const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { defineSecret } = require("firebase-functions/params");
const OpenAI = require("openai");

admin.initializeApp();
const db = admin.firestore();
const groqKey = defineSecret("GROQ_API_KEY");
const DAILY_LIMIT = 20;

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

exports.aiCoach = onCall({ secrets: [groqKey], cors: true }, async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Sign in required.");
  }

  const uid = request.auth.uid;
  const { prompt = "", context = "", mode = "chat" } = request.data || {};
  if (!String(prompt).trim()) {
    throw new HttpsError("invalid-argument", "Prompt is required.");
  }

  const usageRef = db.doc(`users/${uid}/aiUsage/daily`);
  const usageSnap = await usageRef.get();
  const usage = usageSnap.exists ? usageSnap.data() : {};
  const key = todayKey();
  const count = usage.date === key ? Number(usage.count || 0) : 0;
  if (count >= DAILY_LIMIT) {
    throw new HttpsError("resource-exhausted", "Daily AI coach limit reached, resets tomorrow.");
  }

  const client = new OpenAI({
    apiKey: groqKey.value(),
    baseURL: "https://api.groq.com/openai/v1"
  });

  const completion = await client.chat.completions.create({
    model: "llama-3.1-8b-instant",
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
      {
        role: "user",
        content: `Journal context:\n${context}\n\nTrader request:\n${prompt}`
      }
    ]
  });

  await usageRef.set({
    date: key,
    count: count + 1,
    updatedAt: admin.firestore.FieldValue.serverTimestamp()
  }, { merge: true });

  return { text: completion.choices?.[0]?.message?.content || "" };
});
