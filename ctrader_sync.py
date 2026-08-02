import json
import sys
import urllib.request
import urllib.parse
import urllib.error
import datetime

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

def main():
    input_data = {}
    try:
        if not sys.stdin.isatty():
            raw = sys.stdin.read().strip()
            if raw:
                input_data = json.loads(raw)
    except Exception:
        pass

    token = input_data.get("token") or input_data.get("accessToken") or ""
    account_id = input_data.get("accountId") or input_data.get("account_id") or ""
    days = int(input_data.get("days", 30))

    if not token:
        print(json.dumps({"error": "cTrader Access Token is required."}))
        sys.exit(1)

    headers = {
        "Authorization": f"Bearer {token}",
        "Accept": "application/json"
    }

    # If account_id is missing, query accounts endpoint first
    if not account_id:
        acc_url = "https://openapi.ctrader.com/v2/accounts"
        status, acc_resp = http_get(acc_url, headers)
        if status == 200 and isinstance(acc_resp, dict):
            acc_list = acc_resp.get("data") or acc_resp.get("accounts") or []
            if acc_list:
                account_id = str(acc_list[0].get("accountId") or acc_list[0].get("id") or "")
    
    if not account_id:
        print(json.dumps({"error": "cTrader Account ID is required or no linked accounts found for this access token."}))
        sys.exit(1)

    from_dt = datetime.datetime.now() - datetime.timedelta(days=days)
    from_timestamp = int(from_dt.timestamp() * 1000)
    to_timestamp = int((datetime.datetime.now() + datetime.timedelta(days=1)).timestamp() * 1000)

    # Query deals history from Spotware cTrader Open API endpoint
    deals_url = f"https://openapi.ctrader.com/v2/accounts/{account_id}/deals?from={from_timestamp}&to={to_timestamp}"
    status, resp = http_get(deals_url, headers)

    if status != 200:
        err_msg = resp.get("description") or resp.get("error") or f"HTTP {status}"
        print(json.dumps({"error": f"Failed to fetch cTrader deals: {err_msg}"}))
        sys.exit(1)

    deals = resp.get("deal") or resp.get("data") or resp.get("deals") or []
    if isinstance(deals, dict):
        deals = [deals]

    reconstructed_trades = []
    for i, d in enumerate(deals):
        if not isinstance(d, dict):
            continue

        symbol = str(d.get("symbolName") or d.get("symbol") or "Unknown").strip()
        side_raw = str(d.get("tradeSide") or d.get("side") or "").upper()
        side = "BUY" if "BUY" in side_raw or side_raw == "1" else "SELL"

        pnl = float(d.get("profit") or d.get("moneyDigits") or 0.0) / 100.0 if isinstance(d.get("profit"), int) and abs(d.get("profit", 0)) > 10000 else float(d.get("profit") or 0.0)
        comm = float(d.get("commission") or 0.0)
        swap = float(d.get("swap") or 0.0)
        net_pnl = pnl + comm + swap

        volume = float(d.get("volume") or d.get("lots") or 0.0)
        if volume > 100: # volume in cents/units
            volume /= 100000.0

        execution_price = float(d.get("executionPrice") or d.get("price") or 0.0)
        
        utc_timestamp = d.get("executionTimestamp") or d.get("createTimestamp") or d.get("utcLastUpdateTimestamp")
        date_str = ""
        time_str = ""
        if utc_timestamp:
            try:
                if utc_timestamp > 1e11:
                    utc_timestamp /= 1000
                dt = datetime.datetime.fromtimestamp(utc_timestamp)
                date_str = dt.strftime("%Y-%m-%d")
                time_str = dt.strftime("%H:%M:%S")
            except Exception:
                pass

        if not date_str:
            date_str = datetime.date.today().isoformat()

        deal_id = str(d.get("dealId") or d.get("positionId") or f"ctrader-{i}")

        reconstructed_trades.append({
            "id": f"ctrader-{deal_id}",
            "date": date_str,
            "time": time_str,
            "symbol": symbol,
            "side": side,
            "pnl": round(net_pnl, 2),
            "volume": round(volume, 2),
            "openPrice": round(execution_price, 5),
            "closePrice": round(execution_price, 5),
            "reason": "User",
            "commission": round(comm, 2),
            "swap": round(swap, 2),
            "notes": f"cTrader Auto-Sync (Deal #{deal_id})"
        })

    print(json.dumps({"ok": True, "trades": reconstructed_trades}))

if __name__ == "__main__":
    main()
