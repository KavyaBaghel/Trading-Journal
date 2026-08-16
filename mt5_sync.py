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

repair_output = ""
try:
    _try_import_mt5()
except Exception as _ie:
    import_error = str(_ie)
    # Auto-repair: force-reinstall for the current interpreter
    try:
        proc = subprocess.run(
            [sys.executable, "-m", "pip", "install",
             "--user", "--force-reinstall", "--no-cache-dir", "MetaTrader5"],
            capture_output=True, text=True, timeout=180,
        )
        repair_output = (proc.stdout or "") + (proc.stderr or "")
    except Exception as _re:
        repair_output = f"pip repair step failed: {_re}"
    # Retry after repair
    try:
        _try_import_mt5()
        import_error = None  # repair succeeded
    except Exception as _ie2:
        import_error = str(_ie2)

if mt5 is None:
    parts = [f"MetaTrader5 import failed: {import_error}"]
    if numpy_error: parts.append(f"numpy error: {numpy_error}")
    print(json.dumps({"error": " | ".join(parts)}))
    sys.exit(0)


def main():
    input_data = {}
    try:
        if not sys.stdin.isatty():
            raw = sys.stdin.read().strip()
            if raw: input_data = json.loads(raw)
    except Exception: pass

    login = input_data.get("login")
    password = input_data.get("password")
    server = input_data.get("server")
    days = int(input_data.get("days", 30))

    init_params = {}
    if login:
        try: init_params["login"] = int(login)
        except ValueError:
            print(json.dumps({"error": "Login must be numeric."}))
            sys.exit(0)
    if password: init_params["password"] = password
    if server: init_params["server"] = server

    if not mt5.initialize(timeout=30000, **init_params):
        err_code, err_desc = mt5.last_error()
        print(json.dumps({"error": f"MT5 connection failed: {err_desc} (Code {err_code}). Ensure MT5 is open."}))
        sys.exit(0)

    now_local = datetime.datetime.now()
    from_date = now_local - datetime.timedelta(days=days + 2)
    to_date = now_local + datetime.timedelta(days=2)

    deals = mt5.history_deals_get(from_date, to_date)
    if deals is None:
        err_code, err_desc = mt5.last_error()
        print(json.dumps({"error": f"Failed to fetch deals: {err_desc}"}))
        mt5.shutdown()
        sys.exit(0)

    # ── Fallback to history_orders_get for truncated history ─────────────
    extra_deals = []
    deal_pids = set(d.position_id for d in deals) if deals else set()
    
    try:
        orders = mt5.history_orders_get(from_date, to_date)
        if orders:
            # 1) Synthesize missing deals for known positions
            for o in orders:
                if o.state != 4 or o.position_id == 0 or o.position_id not in deal_pids:
                    continue
                _entry = 0 if o.type in (0, 4) else 1 
                extra_deals.append(type('Deal', (), {
                    'ticket': o.ticket, 'order': o.ticket, 'position_id': o.position_id,
                    'time': o.time, 'time_msc': o.time_msc, 'type': o.type, 'entry': _entry,
                    'symbol': o.symbol, 'volume': o.volume_current, 'price': o.price_current,
                    'profit': o.profit, 'swap': o.swap, 'commission': o.commission,
                    'comment': o.comment or '',
                })())

            # 2) Synthesize fully missing positions
            _by_pid = {}
            for o in orders:
                if o.state == 4 and o.position_id != 0:
                    _by_pid.setdefault(o.position_id, []).append(o)
            
            for pid, olist in _by_pid.items():
                if pid in deal_pids: continue
                olist.sort(key=lambda x: x.time)
                if len(olist) < 2: continue
                _op, _cl = olist[0], olist[-1]
                
                extra_deals.append(type('Deal', (), {
                    'ticket': _op.ticket, 'order': _op.ticket, 'position_id': pid,
                    'time': _op.time, 'time_msc': _op.time_msc, 'type': _op.type, 'entry': 0,
                    'symbol': _op.symbol, 'volume': _op.volume_current, 'price': _op.price_current,
                    'profit': 0.0, 'swap': 0.0, 'commission': 0.0, 'comment': _op.comment or '',
                })())
                extra_deals.append(type('Deal', (), {
                    'ticket': _cl.ticket, 'order': _cl.ticket, 'position_id': pid,
                    'time': _cl.time, 'time_msc': _cl.time_msc, 'type': _cl.type, 'entry': 1,
                    'symbol': _cl.symbol, 'volume': _cl.volume_current, 'price': _cl.price_current,
                    'profit': _cl.profit, 'swap': _cl.swap, 'commission': _cl.commission,
                    'comment': _cl.comment or '',
                })())
    except Exception: pass

    deals = list(deals) + extra_deals
    position_groups = {}
    for d in deals:
        if d.position_id == 0: continue
        symbol = d.symbol
        if not symbol or any(kw in symbol.lower() for kw in ["commission", "bonus", "deposit", "withdraw", "fee", "swap"]):
            continue
        position_groups.setdefault(d.position_id, []).append(d)

    reconstructed_trades = []
    for pid, group in position_groups.items():
        group.sort(key=lambda x: x.time)
        if not any(d.entry in [1, 2] for d in group): continue
        first_deal, last_deal = group[0], group[-1]
        if first_deal.type not in [0, 1]: continue

        total_pnl = sum(d.profit for d in group) + sum(d.swap for d in group) + sum(d.commission for d in group)
        exit_dt = datetime.datetime.fromtimestamp(last_deal.time)
        comment = last_deal.comment.strip()
        reason = "TP" if "tp" in comment.lower() else ("SL" if "sl" in comment.lower() else "User")

        reconstructed_trades.append({
            "id": f"mt5-{pid}",
            "date": exit_dt.strftime("%Y-%m-%d"),
            "time": exit_dt.strftime("%H:%M:%S"),
            "symbol": first_deal.symbol,
            "side": "BUY" if first_deal.type == 0 else "SELL",
            "pnl": round(total_pnl, 2),
            "volume": round(first_deal.volume, 2),
            "openPrice": round(first_deal.price, 5),
            "closePrice": round(last_deal.price, 5),
            "reason": reason,
            "commission": round(sum(d.commission for d in group), 2),
            "swap": round(sum(d.swap for d in group), 2),
            "notes": f"MT5 Sync (#{pid}) {comment}"
        })

    mt5.shutdown()
    print(json.dumps({"ok": True, "trades": reconstructed_trades}))

if __name__ == "__main__":
    main()
