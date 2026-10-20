# data-model.md

## Purpose
What a "trade" object actually looks like in this app, extracted from the normalization logic in index.html (around line 5080-5106). This exists so redesign work on Trades/Analytics/Journal pages doesn't guess field names or accidentally reference something that doesn't exist.

## Canonical trade object shape (post-normalization)
Raw imported data (CSV or broker sync) goes through a normalizer that accepts several possible source field names and produces this consistent shape:

```
{
  symbol: string,        // e.g. "XAUUSD" — falls back to 'Unknown'
  side: 'BUY' | 'SELL',  // derived from side/type/direction, defaults to 'BUY'
  date: string,          // YYYY-MM-DD, defaults to today if missing
  time: string,          // HH:MM (used in trade key generation)
  entry: number,         // entry price — accepts entry/openPrice/open/price as source
  exit: number,          // exit price — accepts exit/closePrice/close/price as source
  sl: number,            // stop loss price
  tp: number,            // take profit price
  volume: number,        // lot size — accepts volume/lot/lots/size as source
  duration: number,
  pnl: number,           // profit/loss — accepts pnl/profit/net as source
  commission: number,
  swap: number,
  openUtc: string,       // used for time-based calculations (session, sorting)
  ...other original fields preserved via spread
}
```

## Field name variants the normalizer accepts (source data isn't consistent)
- Entry price: `entry`, `openPrice`, `open`, `price`
- Exit price: `exit`, `closePrice`, `close`, `price`
- Volume/lot size: `volume`, `lot`, `lots`, `size`
- P&L: `pnl`, `profit`, `net`
- Side/direction: `side`, `type`, `direction` (normalized to uppercase 'BUY'/'SELL')

**Implication for redesign:** always read the normalized field (`trade.pnl`, `trade.volume`, etc.) — never assume raw CSV/broker column names, since those vary by source and get normalized before display.

## Derived/computed values (not raw fields, calculated from the trade object)
- `tradeResult(trade.pnl)` → 'profit' | 'loss' | 'breakeven'
- `riskRewardRatio(trade)` → computed from entry/sl/tp/side
- `mistakes(trade)` → array of detected rule violations for that trade
- `dailyLossForTradeDate(trade)` → sum of losses on that trade's date
- `isGoldSymbol(trade.symbol)` → boolean check (this app is scalping-gold-focused)
- Trade dedupe/import key: built from `date|time|symbol|side|pnl|volume` (see `makeTradeKey`/`tradeImportKey` functions)

## CSV import
Handled by `parseCSVText()` / `parseCSVLine()` (~line 7327-7406) and a second `parseCSV()` implementation (~line 15964) — raw rows get parsed then passed through the normalizer above before being used anywhere in the app.

## Where trade data flows into (for redesign awareness — not exhaustive)
- Today's Summary / Overview stats and trade list
- Analytics charts (all derive from arrays of normalized trade objects)
- Trade Log (Trades page) table rows
- Journal entries (each journal entry can reference a linked trade snapshot: date, time, symbol, side, session, entry, exit, sl, tp, volume, duration, pnl, mistakes)
- Psychology checklist validations (e.g. "Only trade gold" checks `trade.symbol`)
- AI Coach / AI Snapshot narrative generation (reads pnl, win rate, symbol, side into generated text)

## NOT covered here
Firestore schema for cloud sync (not yet extracted — if cloud sync structure needs documenting later, would require checking the Firebase read/write calls specifically, not just the in-app trade object shape).
