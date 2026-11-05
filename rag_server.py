import json
import os
import urllib.error
import urllib.request
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

import chromadb


ROOT = Path(__file__).resolve().parent
DB_PATH = ROOT / "journal_db"
OLLAMA_URL = os.environ.get("JOURNALL_OLLAMA_URL", "http://127.0.0.1:11434").rstrip("/")
EMBED_MODEL = os.environ.get("JOURNALL_EMBED_MODEL", "nomic-embed-text")
DEFAULT_CHAT_MODEL = os.environ.get("JOURNALL_CHAT_MODEL", "llama3.2")

chroma_client = chromadb.PersistentClient(path=str(DB_PATH))
collection = chroma_client.get_or_create_collection(name="trades")


def ollama_json(path, payload):
    body = json.dumps(payload).encode("utf-8")
    request = urllib.request.Request(
        f"{OLLAMA_URL}{path}",
        data=body,
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(request, timeout=180) as response:
            return json.loads(response.read().decode("utf-8"))
    except urllib.error.HTTPError as exc:
        detail = exc.read().decode("utf-8", errors="replace")
        raise RuntimeError(f"Ollama request failed ({exc.code}): {detail}") from exc
    except urllib.error.URLError as exc:
        raise RuntimeError(f"Ollama is not reachable at {OLLAMA_URL}: {exc.reason}") from exc


def embed(text):
    response = ollama_json("/api/embeddings", {"model": EMBED_MODEL, "prompt": text})
    embedding = response.get("embedding")
    if not embedding:
        raise RuntimeError(f"Ollama returned no embedding. Pull the model with: ollama pull {EMBED_MODEL}")
    return embedding


def trade_to_text(trade):
    if isinstance(trade, str):
        return trade
    parts = [
        f"Trade ID: {trade.get('id') or trade.get('_ragId') or ''}",
        f"Date: {trade.get('date') or ''} {trade.get('time') or ''}".strip(),
        f"Symbol: {trade.get('symbol') or ''}",
        f"Side: {trade.get('side') or ''}",
        f"Session: {trade.get('session') or ''}",
        f"P&L: {trade.get('pnl') if trade.get('pnl') is not None else ''}",
        f"Reason: {trade.get('reason') or trade.get('exitReason') or ''}",
        f"Setup: {trade.get('setup') or trade.get('setupName') or ''}",
        f"Emotion: {trade.get('emotion') or trade.get('mood') or ''}",
        f"Mistakes: {', '.join(trade.get('mistakes') or []) if isinstance(trade.get('mistakes'), list) else trade.get('mistakes') or ''}",
        f"Notes: {trade.get('notes') or trade.get('comment') or trade.get('journal') or ''}",
    ]
    return "\n".join(part for part in parts if not part.endswith(": "))


def add_trade_to_rag(trade_id, trade_text, metadata=None):
    collection.upsert(
        documents=[trade_text],
        embeddings=[embed(trade_text)],
        ids=[str(trade_id)],
        metadatas=[metadata or {}],
    )


def index_trades(trades):
    indexed = 0
    for idx, trade in enumerate(trades or []):
        if not isinstance(trade, dict):
            continue
        trade_id = trade.get("id") or trade.get("_ragId") or f"trade-{idx}"
        trade_text = trade_to_text(trade)
        add_trade_to_rag(
            trade_id,
            trade_text,
            {
                "symbol": str(trade.get("symbol") or ""),
                "session": str(trade.get("session") or ""),
                "date": str(trade.get("date") or ""),
            },
        )
        indexed += 1
    return indexed


def get_relevant_trades(question, top_k=5):
    if collection.count() == 0:
        return []
    results = collection.query(query_embeddings=[embed(question)], n_results=max(1, int(top_k)))
    return (results.get("documents") or [[]])[0]


def get_feedback(question, model=None, top_k=5):
    relevant_trades = get_relevant_trades(question, top_k)
    context = "\n\n---\n\n".join(relevant_trades)
    if not context:
        context = "No indexed journal entries were found yet."

    prompt = f"""You are a trading coach analyzing XAUUSD trades using ICT methodology.

Relevant journal entries:
{context}

Question: {question}

Give specific, honest feedback based only on the journal entries above. Do not mention JSON, embeddings, vectors, ChromaDB, or code. Focus on risk, discipline, session quality, setup quality, and the next behavior to fix."""

    response = ollama_json(
        "/api/chat",
        {
            "model": model or DEFAULT_CHAT_MODEL,
            "stream": False,
            "messages": [{"role": "user", "content": prompt}],
        },
    )
    return {
        "answer": ((response.get("message") or {}).get("content") or "").strip(),
        "relevantTrades": relevant_trades,
        "relevantCount": len(relevant_trades),
    }


class Handler(BaseHTTPRequestHandler):
    def _send_json(self, status, payload):
        body = json.dumps(payload).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()
        self.wfile.write(body)

    def do_OPTIONS(self):
        self._send_json(204, {})

    def do_GET(self):
        if self.path.startswith("/health"):
            self._send_json(200, {"ok": True, "indexed": collection.count(), "embedModel": EMBED_MODEL})
            return
        self._send_json(404, {"error": "Not found"})

    def do_POST(self):
        try:
            length = int(self.headers.get("Content-Length") or "0")
            payload = json.loads(self.rfile.read(length).decode("utf-8") or "{}")
            if self.path.startswith("/index"):
                count = index_trades(payload.get("trades") or [])
                self._send_json(200, {"ok": True, "indexed": count, "total": collection.count()})
                return
            if self.path.startswith("/ask"):
                question = str(payload.get("question") or "").strip()
                if not question:
                    self._send_json(400, {"error": "Question is required"})
                    return
                if payload.get("trades"):
                    index_trades(payload.get("trades") or [])
                result = get_feedback(question, payload.get("model") or DEFAULT_CHAT_MODEL, payload.get("topK") or 5)
                self._send_json(200, {"ok": True, **result})
                return
            self._send_json(404, {"error": "Not found"})
        except Exception as exc:
            self._send_json(500, {"error": str(exc)})

    def log_message(self, *_):
        return


if __name__ == "__main__":
    host = os.environ.get("JOURNALL_RAG_HOST", "127.0.0.1")
    port = int(os.environ.get("JOURNALL_RAG_PORT", "8790"))
    print(f"Journall RAG server running on http://{host}:{port}")
    ThreadingHTTPServer((host, port), Handler).serve_forever()
