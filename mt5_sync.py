import json
import sys
import os
import site
import datetime
import subprocess

# ── Dynamically add user site-packages so --user-installed packages are found ──
try:
    user_site = site.getusersitepackages()
    if user_site and os.path.exists(user_site) and user_site not in sys.path:
        sys.path.insert(0, user_site)
except Exception:
    pass

appdata = os.environ.get('APPDATA', '')
localappdata = os.environ.get('LOCALAPPDATA', '')
for base, subpath in [
    (appdata,      os.path.join('Python', '{}', 'site-packages')),
    (localappdata, os.path.join('Programs', 'Python', '{}', 'Lib', 'site-packages')),
]:
    if base:
        for py_ver in ['Python313', 'Python312', 'Python311', 'Python310', 'Python39']:
            p = os.path.join(base, subpath.format(py_ver))
            if os.path.exists(p) and p not in sys.path:
                sys.path.insert(0, p)

# ── numpy check (MetaTrader5 depends on it) ──
numpy_error = None
try:
    import numpy  # noqa: F401
except Exception as _ne:
    numpy_error = str(_ne)

# ── MetaTrader5 import with auto-repair ──
import_error = None
mt5 = None

def _try_import_mt5():
    global mt5
    import MetaTrader5 as _mt5
    mt5 = _mt5

try:
    _try_import_mt5()
except Exception as _ie:
    import_error = str(_ie)
    # Auto-repair: force-reinstall for the current interpreter
    try:
        subprocess.run(
            [sys.executable, "-m", "pip", "install",
             "--user", "--force-reinstall", "--no-cache-dir", "MetaTrader5"],
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
            timeout=120,
        )
    except Exception:
        pass
    # Retry after repair
    try:
        _try_import_mt5()
        import_error = None  # repair succeeded
    except Exception as _ie2:
        import_error = str(_ie2)

if mt5 is None:
    # Build a detailed, actionable error message
    parts = [
        f"MetaTrader5 import failed on Python {sys.version} ({sys.executable}): {import_error}"
    ]
    if numpy_error:
        parts.append(
            f"numpy also failed to import: {numpy_error}. "
            f"Fix: py -3 -m pip install --force-reinstall \"numpy<2.4\""
        )
    parts.append(
        f"Fix MetaTrader5: py -3 -m pip install --force-reinstall --no-cache-dir MetaTrader5"
    )
    print(json.dumps({"error": " | ".join(parts)}))
    sys.exit(0)


def main():
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

    init_params = {}
    if login:
        try:
            init_params["login"] = int(login)
        except ValueError:
            print(json.dumps({"error": "Login must be a numeric account number."}))
            sys.exit(0)
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
        print(json.dumps({"error": f"Could not connect to MetaTrader 5: {err_desc} (Code {err_code}). Ensure MT5 application is open and active on your PC."}))
        sys.exit(0)

    from_date = datetime.datetime.now() - datetime.timedelta(days=days)
    to_date = datetime.datetime.now() + datetime.timedelta(days=1)

    deals = mt5.history_deals_get(from_date, to_date)
    if deals is None:
        err_code, err_desc = mt5.last_error()
        print(json.dumps({"error": f"Failed to fetch trade history from MT5: {err_desc} (Code {err_code})"}))
        mt5.shutdown()
        sys.exit(0)

    position_groups = {}
    for d in deals:
        pid = d.position_id
        if pid == 0:
            continue

        symbol = d.symbol
        if not symbol or any(kw in symbol.lower() for kw in ["commission", "bonus", "deposit", "withdraw", "fee", "swap"]):
            continue

        if pid not in position_groups:
            position_groups[pid] = []
        position_groups[pid].append(d)

    reconstructed_trades = []

    for pid, group in position_groups.items():
        group.sort(key=lambda x: x.time)

        has_out = any(d.entry in [1, 2] for d in group)
        if not has_out:
            continue

        first_deal = group[0]
        last_deal = group[-1]

        if first_deal.type not in [0, 1]:
            continue

        symbol = first_deal.symbol
        side = "BUY" if first_deal.type == 0 else "SELL"

        tot_profit = sum(d.profit for d in group)
        tot_swap = sum(d.swap for d in group)
        tot_comm = sum(d.commission for d in group)
        total_pnl = tot_profit + tot_swap + tot_comm

        exit_dt = datetime.datetime.fromtimestamp(last_deal.time)
        entry_dt = datetime.datetime.fromtimestamp(first_deal.time)

        volume = first_deal.volume

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

    mt5.shutdown()
    print(json.dumps({"ok": True, "trades": reconstructed_trades}))


if __name__ == "__main__":
    main()
