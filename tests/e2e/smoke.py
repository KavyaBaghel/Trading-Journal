#!/usr/bin/env python3
"""Browser smoke test for Journall. No real Firebase, no network needed.

What it does
  1. Serves the repo folder on localhost.
  2. Replaces the Firebase SDK (loaded from gstatic) with tiny stubs: a fake signed-in user and an in-memory Firestore.
  3. Seeds 40 sample trades, freezes the clock and Math.random, loads the page.
  4. Clicks every tab found in the page ([data-view]) and records console errors, uncaught exceptions,
     failed HTTP requests and a fingerprint of each tab's visible text.

Checks (exit code 1 on failure)
  - the signed-in session works: __trades has 40 rows, currentUser is set, the localStorage patch is active
  - every tab renders some content
  - no uncaught exception other than the KNOWN ones below
  - with --baseline: no error that the baseline run did not also have

Differences in tab text versus the baseline are printed but do not fail the run, because UI work changes text on purpose.
For a pure refactor the fingerprints should all match.

Usage:  python tests/e2e/smoke.py --root . --out pr.json [--baseline base.json] [--shots DIR]
Needs:  pip install playwright && playwright install --with-deps chromium
"""
import argparse, re, datetime, functools, hashlib, http.server, json, os, random, socketserver, sys, threading, time
from playwright.sync_api import sync_playwright

# Uncaught exceptions that already exist on the original monolithic page (checked against the pre-refactor code).
KNOWN_PAGEERRORS = ["Cannot read properties of undefined (reading 'toFixed')"]
MIN_TAB_TEXT = 200

STUBS = {
 "firebase-app.js": "export const initializeApp=()=>({});",
 "firebase-auth.js": """const USER={uid:'test_uid',displayName:'Test Trader',email:'test@example.com',photoURL:null,getIdToken:async()=>'tok',providerData:[{providerId:'google.com'}]};
export const getAuth=()=>({currentUser:USER});
export class GoogleAuthProvider{setCustomParameters(){}}
export const browserLocalPersistence={};
export const setPersistence=async()=>{};
export const getRedirectResult=async()=>null;
export const onAuthStateChanged=(a,cb)=>{setTimeout(()=>cb(USER),50);return()=>{}};
export const signInWithCredential=async()=>({user:USER});
export const signInWithPopup=async()=>({user:USER});
export const signOut=async()=>{};""",
 "firebase-firestore.js": """export const getFirestore=()=>({});
export const doc=(...a)=>({path:a.slice(1).join('/')});
export const getDoc=async()=>({exists:()=>false,data:()=>({})});
export const setDoc=async()=>{};
export const onSnapshot=()=>()=>{};
export const serverTimestamp=()=>0;""",
}

def sample_trades():
    rnd = random.Random(7); base = datetime.date(2026, 10, 20); out = []
    for i in range(40):
        d = base + datetime.timedelta(days=i // 5); h = 7 + (i * 3) % 14
        pnl = round(rnd.uniform(-45, 70), 2); e = 2650 + i; x = e + (3 if pnl > 0 else -3)
        out.append({"id": f"mt5-{1000+i}", "position": str(1000+i), "date": d.isoformat(), "time": f"{h:02d}:{(i*7)%60:02d}:00",
                    "symbol": "XAUUSD", "side": "Buy" if i % 2 else "Sell", "entry": e, "exit": x, "openPrice": e, "closePrice": x,
                    "pnl": pnl, "lot": 0.01, "duration": 12 + i})
    return out

def run(root, shots=None):
    class Q(http.server.SimpleHTTPRequestHandler):
        def log_message(self, *a): pass
    socketserver.TCPServer.allow_reuse_address = True
    srv = socketserver.TCPServer(("127.0.0.1", 0), functools.partial(Q, directory=root))
    port = srv.server_address[1]
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    trades = json.dumps(sample_trades())
    seed = {"viztrade_trades": trades, "viztrade_trading_page_trades": trades, "journall_onboarding_completed": "1", "journall_active_uid": "test_uid"}
    init = ("(()=>{const s=__SEED__;try{if(!sessionStorage.getItem('__seeded')){for(const k in s)localStorage.setItem(k,s[k]);sessionStorage.setItem('__seeded','1')}}catch(e){};"
            "Math.random=(()=>{let x=12345;return()=>{x=(x*1664525+1013904223)%4294967296;return x/4294967296}})();})()").replace("__SEED__", json.dumps(seed))
    res = {"load": {}, "tabs": {}}; log = {}; cur = {"k": "load"}
    def rec(kind, val): log.setdefault(cur["k"], []).append([kind, re.sub(r"127\.0\.0\.1:\d+", "127.0.0.1:PORT", val)])
    with sync_playwright() as p:
        b = p.chromium.launch(); ctx = b.new_context(viewport={"width": 1366, "height": 900}); pg = ctx.new_page()
        pg.on("console", lambda m: rec("console.error", m.text[:220]) if m.type == "error" else None)
        pg.on("pageerror", lambda e: rec("pageerror", str(e)[:300]))
        pg.on("response", lambda r: rec("http%d" % r.status, r.url.replace("http://127.0.0.1:%d" % port, "")[:100]) if r.status >= 400 and "favicon" not in r.url else None)
        def fb(route):
            n = route.request.url.split("/")[-1].split("?")[0]
            route.fulfill(status=200, content_type="application/javascript", body=STUBS.get(n, "export default {}"))
        ctx.route("https://www.gstatic.com/firebasejs/**", fb)
        pg.add_init_script(init)
        pg.clock.set_fixed_time(datetime.datetime(2026, 10, 30, 10, 0, 0))
        pg.goto("http://127.0.0.1:%d/index.html" % port, wait_until="load"); time.sleep(4)
        res["load"]["globals"] = pg.evaluate("()=>({trades:Array.isArray(window.__trades)?window.__trades.length:typeof window.__trades,user:window.currentUser&&window.currentUser.uid,patched:!!window.__journallStoragePatched,keys:!!(window.JL_KEYS&&window.JL_KEYS.keys&&window.JL_KEYS.keys.JL_PREFS==='jlPrefs')})")
        navs = pg.evaluate("()=>[...document.querySelectorAll('[data-view]')].map(e=>e.getAttribute('data-view')).filter((v,i,a)=>a.indexOf(v)===i)")
        res["load"]["navs"] = navs; res["load"]["errors"] = log.get("load", [])
        for v in navs:
            cur["k"] = v
            try:
                pg.evaluate("(v)=>{const e=[...document.querySelectorAll('[data-view]')].find(x=>x.getAttribute('data-view')===v&&x.offsetParent!==null)||document.querySelector('[data-view=\"'+v+'\"]'); e&&e.click()}", v)
                time.sleep(1.2)
                txt = pg.evaluate("()=>[...document.querySelectorAll('main *, .view, section')].filter(e=>e.offsetParent!==null&&e.children.length===0).map(e=>e.textContent.trim()).filter(Boolean).join('|')")
                res["tabs"][v] = {"len": len(txt), "hash": hashlib.md5(txt.encode()).hexdigest()[:10], "txt": txt, "errors": log.get(v, [])}
                if shots: pg.screenshot(path=os.path.join(shots, v + ".png"))
            except Exception as ex:
                res["tabs"][v] = {"exception": str(ex)[:200], "len": 0, "errors": log.get(v, [])}
        res["after"] = {"errors": log.get("after", []), "lskeys": sorted(pg.evaluate("()=>Object.keys(localStorage)"))}
        b.close()
    srv.shutdown(); return res

def all_errors(r):
    out = list(map(tuple, r["load"]["errors"]))
    for t in r["tabs"].values(): out += list(map(tuple, t["errors"]))
    return out

def main():
    ap = argparse.ArgumentParser(); ap.add_argument("--root", default="."); ap.add_argument("--out", default="smoke.json")
    ap.add_argument("--baseline"); ap.add_argument("--shots"); a = ap.parse_args()
    if a.shots: os.makedirs(a.shots, exist_ok=True)
    r = run(os.path.abspath(a.root), a.shots); json.dump(r, open(a.out, "w"), indent=1)
    fails = []; g = r["load"]["globals"]
    if g["trades"] != 40: fails.append("window.__trades should have 40 rows, got %r" % (g["trades"],))
    if g["user"] != "test_uid": fails.append("signed-in user missing (currentUser=%r): the auth module did not start" % (g["user"],))
    if not g["keys"]: fails.append("window.JL_KEYS registry missing or wrong")
    if not g["patched"]: fails.append("localStorage patch not active: cloud sync would not run")
    if len(r["load"]["navs"]) < 10: fails.append("only %d tabs found" % len(r["load"]["navs"]))
    for t, d in r["tabs"].items():
        if d.get("exception"): fails.append("tab %s: %s" % (t, d["exception"]))
        elif d["len"] < MIN_TAB_TEXT: fails.append("tab %s rendered almost nothing (%d chars)" % (t, d["len"]))
    errs = all_errors(r)
    for k, v in errs:
        if k == "pageerror" and not any(s in v for s in KNOWN_PAGEERRORS): fails.append("uncaught exception: " + v)
    if a.baseline:
        base = json.load(open(a.baseline)); be = {}
        for k, v in all_errors(base): be[(k, v)] = be.get((k, v), 0) + 1
        for k, v in errs:
            if be.get((k, v), 0) > 0: be[(k, v)] -= 1
            elif k != "pageerror": fails.append("new error not in baseline: %s %s" % (k, v))
        changed = [t for t in r["tabs"] if t in base["tabs"] and r["tabs"][t].get("hash") != base["tabs"][t].get("hash")]
        print("Tabs whose text differs from baseline: %s" % (", ".join(changed) or "none (identical)"))
        if base["after"]["lskeys"] != r["after"]["lskeys"]: print("localStorage keys differ from baseline:", sorted(set(base["after"]["lskeys"]) ^ set(r["after"]["lskeys"])))
    print("tabs: " + ", ".join("%s=%s" % (t, d["len"]) for t, d in r["tabs"].items()))
    print("errors seen: %d (known uncaught exceptions are tolerated)" % len(errs))
    if fails:
        print("\nFAILED:"); [print(" - " + f) for f in fails]; sys.exit(1)
    print("OK")
if __name__ == "__main__": main()
