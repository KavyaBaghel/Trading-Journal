# component-inventory.md

## Purpose
This maps the structure of every page in the app — what sections/blocks exist, top to bottom — without describing the logic behind them. This is the map the redesign gets applied onto, one page at a time. See execution order in ai-workflow-guide.md.

New display names (visible text only, data-tab values unchanged) are noted alongside the current internal names.

## Shell (wraps every page, redesign once)
- Floating top-right profile widget (`#fixedTopRightProfile`) — avatar + name, click opens Account page
- Sidebar (`aside.sidebar`)
  - Brand block (logo + "JOURNALL" wordmark)
  - Nav list (11 buttons, icon + label, `data-tab` routes to each page)
  - Daily Rules sidebox — Loss Limit, Trade Limit, Today P&L, Win Rate, Rule Breaks, Trades Journaled, Trades Pending Journal
  - Sign Out button

## 1. Today's Summary → **Overview** (`data-tab="tradingpage"`)
- Stats table: Today P&L, Daily Loss Used, Trades, Rule Breaks, Best Next Action, Status, Tomorrow Rule
- Trading Page Sync card (CSV-driven, "today only")
- Today Summary card (P&L, trades, win rate, mistakes)
- Today Equity Curve chart (intraday)
- Today AI Notes (live review)
- Post Session Review (AI end-of-day coach)
- Today's Trades list

## 2. Analytics (`data-tab="dashboard"`) — largest page
- Trading Dashboard header / account setup
- Chart card grid: Trade Outcome Mix, P&L Composition, Session Activity, Equity Curve (+ KPI row), AI Insights, Session Breakdown, Mistake Impact, Direction Split, Trade Heatmap, Back-to-back Re-entry Map
- Overall P&L Balance Scale (cross-cutting widget, also appears elsewhere)
- Daily Drawdown widget (cross-cutting widget, also appears elsewhere)

## 3. Trades → **Trade Log** (`data-tab="grid"`)
- Trades table with search/filter and count badge

## 4. Journal (`data-tab="journalpage"`)
- Trade Journal entry form (date, trade selector, entry/exit confirmation, mistake, improvement, emotion before/after, setup category, screenshot upload, video upload, AI feedback)
- Saved Trade Journals list (searchable, filterable by result)

## 5. Psychology (`data-tab="psychology"`)
- Psychology Command Room header
- Mind Stability Check (9-point checklist)
- Setup Scan (formation check)
- Pre-Trade Checklist (with progress bar)
- Live Trade Rules (during execution)
- After Trade (mandatory pause)
- Debrief (mistakes, notes, result)

## 6. Calendar (`data-tab="calendar"`)
- Month/year calendar grid with summary
- Day Trades modal (click a day to see that day's trades)

## 7. Reports (`data-tab="reports"`)
- AI Report Cards
- Setup Performance Tracker (from saved journals)

## 8. Widgets → **AI Insights** (`data-tab="widgets"`)
- AI Widgets grid: Weekday P&L, Duration, Lot Size, Exit Reason charts

## 9. Goals (`data-tab="goals"`)
- Account Phase (configured prop challenge)
- AI Prop Coach

## 10. AI Coach (`data-tab="ailab"`)
- AI Trading Coach (chat interface)
- AI Snapshot

## 11. User Profile → **Account** (`data-tab="userprofile"`)
- Profile header (name, avatar, stats: balance, broker, deposit, trades)
- Profile Settings panel
- Auto Broker Sync panel (multi-platform: MT5, cTrader, MatchTrader)

## Cross-cutting / shared elements (design once, reused across pages)
- Upload Trading Data / Direct Broker Sync section
- Mistake Dashboard modal
- Quick Journal modal (Trade Review)
- 15-Minute Pause / Cooldown modal
- Overall P&L Balance Scale, Daily Drawdown widgets

## NOT covered here (see preserve-ids.md instead)
Element IDs, data attributes, JS logic, data sources — this file is structure/layout only.
