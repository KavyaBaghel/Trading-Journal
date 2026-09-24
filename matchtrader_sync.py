import json
import sys
import urllib.request
import urllib.parse
import urllib.error
import datetime

def http_post(url, data_dict, headers_dict=None):
    data = json.dumps(data_dict).encode('utf-8')
    req = urllib.request.Request(url, data=data, method='POST')
    req.add_header('Content-Type', 'application/json')
    req.add_header('User-Agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)')
    if headers_dict:
        for k, v in headers_dict.items():
            req.add_header(k, v)
    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            return resp.status, json.loads(resp.read().decode('utf-8'))
    except urllib.error.HTTPError as e:
        body = e.read().decode('utf-8', errors='replace')
        try:
            return e.code, json.loads(body)
        except Exception:
            return e.code, {"error": body}
    except Exception as e:
        return 500, {"error": str(e)}

def http_get(url, headers_dict=None):
    req = urllib.request.Request(url, method='GET')
    req.add_header('User-Agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)')
    if headers_dict:
        for k, v in headers_dict.items():
            req.add_header(k, v)
    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            return resp.status, json.loads(resp.read().decode('utf-8'))
    except urllib.error.HTTPError as e:
        body = e.read().decode('utf-8', errors='replace')
        try:
            return e.code, json.loads(body)
        except Exception:
            return e.code, {"error": body}
    except Exception as e:
        return 500, {"error": str(e)}

def add_unique(items, value):
    value = (value or "").strip().rstrip("/")
    if value and value not in items:
        items.append(value)

def clean_origin(raw_url):
    raw = (raw_url or "").strip()
    if not raw:
        return ""
    if not raw.startswith("http://") and not raw.startswith("https://"):
        raw = "https://" + raw
    parsed = urllib.parse.urlparse(raw)
    host = (parsed.netloc or parsed.path.split("/")[0]).strip().lower()
    host = host.replace("www.", "")
    if not host:
        return raw.rstrip("/")
    scheme = parsed.scheme or "https"
    return f"{scheme}://{host}"

def get_candidate_bases(raw_url):
    origin = clean_origin(raw_url)
    bases = []
    add_unique(bases, origin)

    parsed = urllib.parse.urlparse(origin)
    host = (parsed.netloc or "").lower()
    if "fundingpips" in host or "ingpips" in host:
        for base in [
            "https://mtr-platform.fundingpips.com",
            "https://matchtrader.fundingpips.com",
            "https://mtr.fundingpips.com",
            "https://platform.fundingpips.com",
            "https://fundingpips.com",
        ]:
            add_unique(bases, base)

    host_parts = [part for part in host.split(".") if part]
    if len(host_parts) >= 2:
        root_domain = ".".join(host_parts[-2:])
        for prefix in ["mtr-platform", "matchtrader", "mtr", "platform"]:
            add_unique(bases, f"https://{prefix}.{root_domain}")

    return bases

def main():
    input_data = {}
    try:
        if not sys.stdin.isatty():
            raw = sys.stdin.read().strip()
            if raw:
                input_data = json.loads(raw)
    except Exception:
        pass

    raw_url = input_data.get("url") or input_data.get("matchtraderUrl") or ""
    email = input_data.get("login") or input_data.get("email") or input_data.get("matchtraderEmail") or ""
    password = input_data.get("password") or input_data.get("matchtraderPassword") or ""

    if not raw_url:
        print(json.dumps({"error": "MatchTrader Platform URL is required (e.g. https://mtr-platform.fundingpips.com)."}))
        sys.exit(0)
    if not email or not password:
        print(json.dumps({"error": "MatchTrader Email and Password are required."}))
        sys.exit(0)

    candidate_bases = get_candidate_bases(raw_url)

    login_paths = [
        "/api/user/login",
        "/api/auth/login",
        "/api/v1/auth/login",
        "/backend/api/user/login",
        "/api/login",
        "/auth/login",
        "/user/login",
        "/api/client/login",
        "/api/trader/login",
        "/api/v1/login",
        "/api/v2/login"
    ]

    token = None
    user_id = None
    last_err = ""
    active_base = candidate_bases[0]

    for b in candidate_bases:
        for path in login_paths:
            url = b + path
            status, resp = http_post(url, {"email": email, "password": password})
            if status in (200, 201):
                token = resp.get("token") or resp.get("jwt") or resp.get("accessToken")
                if not token and isinstance(resp.get("data"), dict):
                    token = resp["data"].get("token") or resp["data"].get("jwt") or resp["data"].get("accessToken")
                    user_id = resp["data"].get("id") or resp["data"].get("userId")
                if token:
                    active_base = b
                    break
            else:
                err_detail = resp.get("message") or resp.get("error") or f"HTTP {status}"
                last_err = err_detail
        if token:
            break

    if not token:
        tried = ", ".join(candidate_bases[:6])
        print(json.dumps({"error": f"MatchTrader login failed ({last_err or 'HTTP 404'}). I tried clean platform domains ({tried}). Paste the exact MatchTrader platform domain from your browser address bar, not the /app/trade page path, and verify email/password."}))
        sys.exit(0)

    headers = {
        "Authorization": f"Bearer {token}",
        "x-auth-token": token
    }

    history_paths = [
        "/api/user/trades-history",
        "/api/trading/history",
        "/api/v1/trades/history",
        "/backend/api/user/trades-history",
        "/api/trades-history",
        "/api/history",
        "/api/user/history",
        "/api/v1/user/trades-history"
    ]

    trades_raw = []
    for path in history_paths:
        url = active_base + path
        status, resp = http_get(url, headers)
        if status == 200:
            if isinstance(resp, list):
                trades_raw = resp
            elif isinstance(resp, dict):
                trades_raw = resp.get("trades") or resp.get("history") or resp.get("data") or []
            if trades_raw:
                break

    reconstructed_trades = []
    for i, t in enumerate(trades_raw):
        if not isinstance(t, dict):
            continue

        symbol = str(t.get("symbol") or t.get("instrument") or "").strip()
        if not symbol:
            continue

        side_raw = str(t.get("side") or t.get("cmd") or t.get("type") or "").upper()
        side = "BUY" if "BUY" in side_raw or side_raw == "0" else "SELL"

        pnl = float(t.get("profit") or t.get("pnl") or t.get("closedProfit") or 0.0)
        comm = float(t.get("commission") or 0.0)
        swap = float(t.get("swap") or 0.0)
        net_pnl = pnl + comm + swap

        open_price = float(t.get("openPrice") or t.get("open_price") or 0.0)
        close_price = float(t.get("closePrice") or t.get("close_price") or 0.0)
        volume = float(t.get("volume") or t.get("lots") or t.get("quantity") or 0.0)

        close_time_raw = t.get("closeTime") or t.get("close_time") or t.get("time") or t.get("updatedAt")
        date_str = ""
        time_str = ""
        if close_time_raw:
            try:
                if isinstance(close_time_raw, (int, float)):
                    if close_time_raw > 1e11:
                        close_time_raw /= 1000
                    dt = datetime.datetime.fromtimestamp(close_time_raw)
                else:
                    dt = datetime.datetime.fromisoformat(str(close_time_raw).replace('Z', '+00:00'))
                date_str = dt.strftime("%Y-%m-%d")
                time_str = dt.strftime("%H:%M:%S")
            except Exception:
                pass

        if not date_str:
            date_str = datetime.date.today().isoformat()

        tid = str(t.get("id") or t.get("positionId") or t.get("tradeId") or f"mt-{i}")
        reason = str(t.get("closeReason") or t.get("comment") or "").strip()

        reconstructed_trades.append({
            "id": f"matchtrader-{tid}",
            "date": date_str,
            "time": time_str,
            "symbol": symbol,
            "side": side,
            "pnl": round(net_pnl, 2),
            "volume": round(volume, 2),
            "openPrice": round(open_price, 5),
            "closePrice": round(close_price, 5),
            "reason": "TP" if "tp" in reason.lower() else ("SL" if "sl" in reason.lower() else "User"),
            "commission": round(comm, 2),
            "swap": round(swap, 2),
            "notes": f"MatchTrader Auto-Sync (#{tid})"
        })

    print(json.dumps({"ok": True, "trades": reconstructed_trades}))

if __name__ == "__main__":
    main()
