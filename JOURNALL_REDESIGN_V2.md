# Journall — Full Redesign v2 (Design System + Task Brief for Manus)

**Read this entire file before touching any code.** This replaces all prior per-card
reference decisions. Git history and already-committed work stay untouched — only the
visual/design layer is being redone, screen by screen, committed in separate phases.

---

## 0. Rules you must follow throughout

1. Work **one phase/screen at a time** (see section 3). Commit after each. Never bundle
   multiple screens into one commit.
2. Before adding any new CSS variable, `:root` block, or `!important` rule — grep the
   file for an existing definition first. This codebase has a recurring bug where a
   later, more specific `!important` rule silently overrides an earlier correct one.
3. Before calling any helper function you didn't just write (e.g. something like
   `escapeHtml`), confirm it's actually defined in `index.html`. A past bug came from
   calling an undefined function and silently crashing downstream code.
4. Build **one shared style/config function per component type**, reused by every card
   of that type — never one copy per card instance (see section 2, rule for charts).
5. Do not introduce colors, fonts, or radii outside the locked tokens below.
6. If a component doesn't fit any row in the table below, **stop and ask** — do not
   choose a reference yourself.
7. **Before restyling the Account Phase tab**, check why "Win Rate Gap" and "Suggested
   Risk per Trade" cards render completely empty and why "Trades to Target" shows a
   stray spinner. That looks like a data/logic bug, not styling — grep for where those
   cards populate before touching their CSS, or a redesign will just make an empty
   card look nicer instead of fixing it.

## 1. Locked foundation tokens — DO NOT CHANGE

| Token | Value |
|---|---|
| Background | `#010102` (near-black) |
| Primary accent | `#494fdf` (purple/violet) |
| Typography | Geist (`--sans` token) |
| Card radius | `--radius-card` = 18px |
| Control radius | `--radius-control` = 10px |

## 2. Component-type reference table

Apply references **by component type, consistently everywhere that type appears** —
not per individual card. Two cards of the same type must look and behave identically.

| # | Component type | Where it appears | Reference |
|---|---|---|---|
| 1 | Navigation shell | Sidebar, top bar, step pills (Psychology flow) | One consistent treatment — must not vary by page |
| 2 | Stat/number cards | Today's Summary, Trading Dashboard, Calendar month/year stats, Profile, AI Snapshot | Refero Adoption dashboard |
| 3 | Action/text + rule-list cards | Best Next Action, Status, Tomorrow Rule, Today AI Notes, Live Trade Rules | shadcn/ui — https://ui.shadcn.com/docs/components/base/card |
| 4 | Line/area charts (incl. mini trend cards) | Today Equity Curve; Calendar's monthly revenue-vs-expense mini charts | Bklit UI; chart family reference: https://www.shadcn.io/charts |
| 5 | Bar charts | Back-to-back Re-entry Map, Weekday P&L, Duration, Lot Size | Bklit UI (same source as #4, for visual consistency) |
| 6 | Donut/radial charts | Exit Reason, Trade Outcome Mix, P&L Composition, Session Activity | shadcn/ui radial/donut pattern |
| 7 | Grid/heatmap | Trade Heatmap | Refero heatmap variant, or Bento tile treatment (#9) |
| 8 | Calendar day-grid | Trading Calendar month view (day cells with mini P&L bars) | Distinct from #7 — own treatment; day-cell bars currently flat red/green, needs palette tokens |
| 9 | Multi-metric/bento panels | Risk/Reward, Today Summary, Goals/Account Phase, Session Controller | Aceternity Bento Grid (hover-reveal tiles) |
| 10 | Forms & form controls | Profile Settings, Account Setup, Upload Data sync, Trade Journal text fields/dropdowns | shadcn/ui shell + Uiverse controls: https://uiverse.io/checkboxes , https://uiverse.io/ui/toggle-switches |
| 11 | Data tables | Trades tab, Saved Trade Journals list | shadcn/ui table pattern — confirm exact block before implementing, not yet finalized |
| 12 | Filter/segment chips | All / Wins / Losses / BE pills, "All Sessions" dropdown | Same control language as nav step pills (#1), but visually distinct context — don't merge the two |
| 13 | AI insight blocks (colored left border) | Current Phase Status, Target Path, AI Coach note panel | Not yet finalized — propose a shadcn/ui "Alert"-style callout and confirm before rolling out everywhere |
| 14 | Action-button grids | AI Coach quick actions (Review Performance, Biggest Weakness, Improve Today, Psychology Check, Best Setup), AI Widget action rows (Open Trades / Journal Weakest / Ask AI / Copy) | Uiverse button set, arranged as a grid |
| 15 | Psychology checklist controls | Setup Scan checkbox, Pre-Trade Checklist radios, Debrief form fields | shadcn/ui + Uiverse controls (same as #10) — this is the fix for the currently unstyled default checkboxes |
| 16 | Empty/loading states | Empty chart placeholder, empty sparkline | Current icon + message pattern — keep as-is, already working |

## 3. Full screen list and execution order

Work through these in order. Each ends with its own commit.

1. **Phase A — Safety tag.** `git tag pre-redesign-v2` before anything else.
2. **Phase B — Navigation shell** (#1), app-wide. Commit.
3. **Phase C — Form controls** (#10, #15), app-wide — includes fixing the unstyled
   Psychology checkboxes. Commit.
4. **Phase D — Shared chart functions.** Write ONE function per chart type (#4, #5, #6,
   #7, #8) before styling any individual screen. Commit.
5. **Phase E — Screen by screen**, using the shared functions/components above:
   - Trading Dashboard (command center — stat cards and action/status cards only)
   - Today's Summary (stat/action/bento/chart/notes cards — proceed as a normal Phase E screen pass)
   - Analytics tab (heatmap, bar charts, donuts)
   - Trades tab (data table — confirm reference for #11 first)
   - Trade Journal tab (forms, filter chips #12, saved-journals list/table)
   - Trading Calendar (day-grid #8, monthly mini charts #4)
   - Psychology Command Room (checklist controls #15, rule cards #3)
   - Account Phase / Goals tab (bento panels #9, AI insight blocks #13; owns alert banner + Session Controller; verified zero-config and zero-trade metric fallbacks are graceful, and AI goals expose pending/error states rather than a stray spinner)
   - AI Coach tab (action-button grids #14, AI snapshot stat cards #2, insight blocks #13)
   - Profile tab (profile card, stat cards, settings form)
   - Upload Data sync tab (form fields #10, sync-status panel)
   - Each screen: verify live (hover states, empty states, console clean), then commit.
6. **Phase F — Final verification.** Full click-through, console clean, confirm hover
   states actually work visually. Tag `redesign-v2-complete`.

## 4. What NOT to do

- Don't introduce new color/font/radius values outside section 1.
- Don't style the same component type differently on different screens.
- Don't skip ahead to the next phase before the current one is committed.
- Don't silently pick a reference for rows 11 or 13, or anything not in this table —
  stop and ask.
- Don't restyle the Account Phase tab's empty cards without first checking why they're
  empty (see rule 7 above).
