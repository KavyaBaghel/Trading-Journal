// Fill this from Firebase Console -> Project settings -> Your apps -> Web app.
// Keep this file public-safe: Firebase web config is not a secret, but Firestore
// security rules must protect user data.
export const firebaseConfig = {
  apiKey: "AIzaSyDmnTyCBVnjha1gSurY2zbpocvSCjm6dY4",
  authDomain: "journal-trading-journal.firebaseapp.com",
  projectId: "journal-trading-journal",
  storageBucket: "journal-trading-journal.firebasestorage.app",
  messagingSenderId: "528928704139",
  appId: "1:528928704139:web:ed4a6e3123b32df843368e",
  measurementId: "G-LR3FZQB94Z"
};

// Free website AI backend. Deploy cloudflare-worker, then paste its workers.dev
// URL here. Keep this public-safe: the Groq key stays only in Cloudflare secrets.
export const aiProxyConfig = {
  url: "https://journall.krishnacnjack.workers.dev"
};
