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
    if repair_output:
        parts.append(f"Repair log: {repair_output.strip()}")
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
        initialized = mt5.initialize(timeout=30000, **init_params)
    else:
        initialized = mt5.initialize(timeout=30000)

    if not initialized:
        err_code, err_desc = mt5.last_error()
        print(json.dumps({"error": f"Could not connect to MetaTrader 5: {err_desc} (Code {err_code}). Ensure MT5 application is open and active on your PC."}))
        sys.exit(0)

    # Use a 2-day future buffer so MT5 server time vs PC time differences
    # never cut off the most recently closed trades.
    now_local = datetime.datetime.now()
    from_date = now_local - datetime.timedelta(days=days + 2)
    to_date = now_local + datetime.timedelta(days=2)

    deals = mt5.history_deals_get(from_date, to_date)
    if deals is None:
        err_code, err_desc = mt5.last_error()
        print(json.dumps({"error": f"Failed to fetch trade history from MT5: {err_desc} (Code {err_code})"}))
        mt5.shutdown()
        sys.exit(0)

    # ── Diagnostic log: what MT5 actually returned ──────────────────────
    try:
        _info = {
            "count": len(deals) if deals is not None else -1,
            "newest": max((d.time for d in deals), default=None),
            "from": from_date.isoformat(),
            "to": to_date.isoformat(),
            "pcNow": now_local.isoformat(),
        }
        _log_file = os.path.join(os.environ.get("TEMP", "."), "journall_mt5_sync.log")
        with open(_log_file, "a", encoding="utf-8") as _lf:
            _lf.write(f"SYNC_START now={_info['pcNow']} from={_info['from']} to={_info['to']} deals={_info['count']} newest={_info['newest']}\n")
    except Exception:
        pass
    # ── Always recover recent trades from the order history ─────────────
    # Some MT5 terminals truncate deal history (which is why recent trades
    # went missing). history_orders_get is more reliable, so we ALWAYS pull
    # closed orders and merge any position missing from the deal history.
    extra_deals = []
    if deals:
        deal_pids = set(d.position_id for d in deals)
        # For positions present in deals, also merge in deals that the
        # terminal truncated: pull the position's orders and fill missing
        # entry/exit deals from them.
        _recent_pids = set()
        for d in deals:
            if d.position_id and d.time >= now_local.timestamp() - 14 * 24 * 3600:
                _recent_pids.add(d.position_id)
    else:
        deal_pids = set()
        _recent_pids = set()
    try:
        orders = mt5.history_orders_get(from_date, to_date)
        if orders:
            # 1) Complete positions already in deal history: attach entry/exit
            #    deals synthesized from their orders (keeps exact P&L).
            _seen_order_pids = set()
            for o in orders:
                if o.state != 1 or o.position_id == 0:
                    continue
                if o.position_id not in deal_pids:
                    continue
                _seen_order_pids.add(o.position_id)
                _entry = 0 if o.type in (0, 2) else 1  # 0 in=BUY,1 in=SELL,2 out=BUY,3 out=SELL
                extra_deals.append(type('Deal', (), {
                    'ticket': o.ticket,
                    'order': o.ticket,
                    'position_id': o.position_id,
                    'time': o.time,
                    'time_msc': o.time_msc,
                    'type': o.type,
                    'entry': _entry,
                    'symbol': o.symbol,
                    'volume': o.volume_current,
                    'price': o.price_current,
                    'profit': o.profit,
                    'swap': o.swap,
                    'commission': o.commission,
                    'comment': o.comment or '',
                })())
            # 2) Fully missing positions (no deals at all): synthesize from
            #    their open + close order pair.
            _by_pid = {}
            for o in orders:
                if o.state != 1 or o.position_id == 0:
                    continue
                _by_pid.setdefault(o.position_id, []).append(o)
            for pid, olist in _by_pid.items():
                if pid in deal_pids:
                    continue
                _opens = [o for o in olist if o.type in (0, 1)]
                _closes = [o for o in olist if o.type in (2, 3)]
                if not _opens or not _closes:
                    continue
                _op = min(_opens, key=lambda x: x.time)
                _cl = max(_closes, key=lambda x: x.time)
                extra_deals.append(type('Deal', (), {
                    'ticket': _op.ticket,
                    'order': _op.ticket,
                    'position_id': pid,
                    'time': _op.time,
                    'time_msc': _op.time_msc,
                    'type': _op.type,
                    'entry': 0,  # entry deal
                    'symbol': _op.symbol,
                    'volume': _op.volume_current,
                    'price': _op.price_current,
                    'profit': 0.0,
                    'swap': 0.0,
                    'commission': 0.0,
                    'comment': _op.comment or '',
                })())
                extra_deals.append(type('Deal', (), {
                    'ticket': _cl.ticket,
                    'order': _cl.ticket,
                    'position_id': pid,
                    'time': _cl.time,
                    'time_msc': _cl.time_msc,
                    'type': _cl.type,
                    'entry': 1,  # exit deal
                    'symbol': _cl.symbol,
                    'volume': _cl.volume_current,
                    'price': _cl.price_current,
                    'profit': _cl.profit,
                    'swap': _cl.swap,
                    'commission': _cl.commission,
                    'comment': _cl.comment or '',
                })())
    except Exception as _ofe:
        try:
            _log_file = os.path.join(os.environ.get("TEMP", "."), "journall_mt5_sync.log")
            with open(_log_file, "a", encoding="utf-8") as _lf:
                _lf.write(f"ORDER_FALLBACK_ERROR {type(_ofe).__name__}: {_ofe}\n")
        except Exception:
            pass

    deals = list(deals) + extra_deals

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
    # Top-level safety net: the bridge must always receive valid JSON, never a
    # raw traceback. Any crash at any point is converted into a clear error.
    try:
        main()
    except SystemExit:
        raise
    except Exception as _e:
        print(json.dumps({"error": f"Unexpected sync error: {type(_e).__name__}: {_e}"}))
