import json
import sys
import datetime

try:
    import MetaTrader5 as mt5
except ImportError:
    print(json.dumps({"error": "MetaTrader5 Python library is not installed. Please run: pip install MetaTrader5"}))
    sys.exit(1)

def main():
    # Read parameters from stdin (if any)
    input_data = {}
    try:
        if not sys.stdin.isatty():
            raw = sys.stdin.read().strip()
            if raw:
                input_data = json.loads(raw)
    except Exception:
        pass

    login = input_data.get("login")
    password = input_data.get("password")
    server = input_data.get("server")
    days = int(input_data.get("days", 30))

    # Initialize connection to MT5 terminal
    init_params = {}
    if login:
        try:
            init_params["login"] = int(login)
        except ValueError:
            print(json.dumps({"error": "Login must be a numeric account number."}))
            sys.exit(1)
    if password:
        init_params["password"] = password
    if server:
        init_params["server"] = server

    if init_params:
        initialized = mt5.initialize(**init_params)
    else:
        initialized = mt5.initialize()

    if not initialized:
        err_code, err_desc = mt5.last_error()
        print(json.dumps({"error": f"Failed to initialize MT5: {err_desc} (Code: {err_code}). Ensure MT5 terminal is open."}))
        sys.exit(1)

    # Fetch deals history
    from_date = datetime.datetime.now() - datetime.timedelta(days=days)
    to_date = datetime.datetime.now() + datetime.timedelta(days=1)
    
    deals = mt5.history_deals_get(from_date, to_date)
    if deals is None:
        err_code, err_desc = mt5.last_error()
        print(json.dumps({"error": f"Failed to fetch trade history: {err_desc} (Code: {err_code})"}))
        mt5.shutdown()
        sys.exit(1)

    # Group deals by position_id to reconstruct closed trades
    position_groups = {}
    for d in deals:
        pid = d.position_id
        if pid == 0:
            continue # Skip balance transactions, corrections, deposits
        
        # Ignore comments or symbols with commission/bonus etc
        symbol = d.symbol
        if not symbol or any(kw in symbol.lower() for kw in ["commission", "bonus", "deposit", "withdraw", "fee", "swap"]):
            continue

        if pid not in position_groups:
            position_groups[pid] = []
        position_groups[pid].append(d)

    reconstructed_trades = []
    
    for pid, group in position_groups.items():
        # Sort deals chronologically
        group.sort(key=lambda x: x.time)
        
        # Check if the position has been closed (must have at least one OUT deal)
        # Entry codes: 0 = IN, 1 = OUT, 2 = IN/OUT
        has_out = any(d.entry in [1, 2] for d in group)
        if not has_out:
            continue # Trade is still open, skip it for the history journal

        # Base trade fields
        first_deal = group[0]
        last_deal = group[-1]
        
        # Only buy and sell
        # Deal types: 0 = BUY, 1 = SELL
        if first_deal.type not in [0, 1]:
            continue

        symbol = first_deal.symbol
        side = "BUY" if first_deal.type == 0 else "SELL"
        
        # Calculate total profit, swap, commission
        tot_profit = sum(d.profit for d in group)
        tot_swap = sum(d.swap for d in group)
        tot_comm = sum(d.commission for d in group)
        total_pnl = tot_profit + tot_swap + tot_comm

        # Exit time details
        exit_dt = datetime.datetime.fromtimestamp(last_deal.time)
        entry_dt = datetime.datetime.fromtimestamp(first_deal.time)

        # Volumes: MT5 deals volume is in lots
        volume = first_deal.volume

        # Exit Reason classification based on comment
        comment = last_deal.comment.strip()
        reason = ""
        if "[tp]" in comment.lower() or "tp" in comment.lower():
            reason = "TP"
        elif "[sl]" in comment.lower() or "sl" in comment.lower():
            reason = "SL"
        else:
            reason = "User"

        reconstructed_trades.append({
            "id": f"mt5-{pid}",
            "date": exit_dt.strftime("%Y-%m-%d"),
            "time": exit_dt.strftime("%H:%M:%S"),
            "symbol": symbol,
            "side": side,
            "pnl": round(total_pnl, 2),
            "volume": round(volume, 2),
            "openPrice": round(first_deal.price, 5),
            "closePrice": round(last_deal.price, 5),
            "reason": reason,
            "commission": round(tot_comm, 2),
            "swap": round(tot_swap, 2),
            "notes": f"MT5 Sync (Position #{pid}) - {comment}" if comment else f"MT5 Sync (Position #{pid})"
        })

    # Close connection
    mt5.shutdown()

    # Output trades as JSON
    print(json.dumps({"ok": True, "trades": reconstructed_trades}))

if __name__ == "__main__":
    main()
