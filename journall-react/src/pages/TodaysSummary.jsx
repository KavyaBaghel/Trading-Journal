import { deriveTodaysSummary } from '../lib/deriveTodaysSummary'
import { useTradeStore } from '../store/useTradeStore'

function formatCurrency(value) {
  if (value == null) return 'Not set'

  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)
}

function toneClass(value) {
  if (value > 0) return 'text-profit'
  if (value < 0) return 'text-loss'
  return 'text-muted'
}

function SummaryCard({ label, value, detail, className = '' }) {
  return (
    <article className={`border border-terminal-border bg-terminal p-5 ${className}`}>
      <p className="font-mono text-[10px] font-bold tracking-[0.14em] text-muted">{label}</p>
      <p className="mt-3 text-2xl font-semibold tracking-[-0.04em] text-foreground">{value}</p>
      <p className="mt-2 text-xs leading-5 text-muted">{detail}</p>
    </article>
  )
}

function Insight({ tone = 'neutral', title, children }) {
  const toneText = tone === 'danger' ? 'text-loss' : tone === 'warn' ? 'text-signal' : 'text-foreground'

  return (
    <div className="border-l-2 border-terminal-border py-1 pl-3 text-sm leading-6 text-muted">
      <strong className={toneText}>{title}:</strong> {children}
    </div>
  )
}

function EquitySeries({ points }) {
  if (!points.length) {
    return <p className="text-sm leading-6 text-muted">Upload today’s trading page export to generate an intraday equity curve.</p>
  }

  const values = [0, ...points.map((point) => point.value)]
  const min = Math.min(...values)
  const max = Math.max(...values)
  const span = max - min || 1
  const width = 720
  const height = 180
  const path = values
    .map((value, index) => {
      const x = (index / Math.max(values.length - 1, 1)) * width
      const y = height - ((value - min) / span) * height
      return `${index === 0 ? 'M' : 'L'} ${x.toFixed(2)} ${y.toFixed(2)}`
    })
    .join(' ')

  return (
    <div>
      <svg className="h-44 w-full overflow-visible" viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Today equity curve">
        <path d={path} fill="none" stroke="currentColor" strokeWidth="3" className="text-primary" vectorEffect="non-scaling-stroke" />
      </svg>
      <div className="mt-3 flex justify-between gap-4 text-xs text-muted">
        <span>Session start: $0.00</span>
        <span>Latest: {formatCurrency(points.at(-1)?.value ?? 0)}</span>
      </div>
    </div>
  )
}

function TodayTradeTable({ trades }) {
  if (!trades.length) {
    return <p className="text-sm leading-6 text-muted">No trades found for today. Upload today’s trading page export.</p>
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[680px] border-collapse text-left text-sm">
        <thead className="border-b border-terminal-border font-mono text-[10px] tracking-[0.12em] text-muted">
          <tr>
            <th className="px-3 py-3">TIME IST</th>
            <th className="px-3 py-3">SYMBOL</th>
            <th className="px-3 py-3">SIDE</th>
            <th className="px-3 py-3">SESSION</th>
            <th className="px-3 py-3">P&amp;L</th>
          </tr>
        </thead>
        <tbody>
          {trades.map((trade, index) => (
            <tr key={`${trade.openUtc || trade.date}-${trade.time || index}-${index}`} className="border-b border-terminal-border/60 text-muted last:border-0">
              <td className="px-3 py-3 text-foreground">{trade.time || 'Unknown'}</td>
              <td className="px-3 py-3 text-foreground">{trade.symbol || 'Unknown'}</td>
              <td className="px-3 py-3">{trade.side || 'Unknown'}</td>
              <td className="px-3 py-3">{trade.session || 'Unknown'}</td>
              <td className={`px-3 py-3 font-medium ${toneClass(Number(trade.pnl) || 0)}`}>{formatCurrency(Number(trade.pnl) || 0)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default function TodaysSummary() {
  const trades = useTradeStore((state) => state.trades)
  const accountMetrics = useTradeStore((state) => state.accountMetrics)
  const summary = deriveTodaysSummary({ trades, accountMetrics })

  return (
    <section aria-labelledby="today-summary-heading" className="space-y-5">
      <div className="flex flex-col justify-between gap-3 border-b border-terminal-border pb-5 md:flex-row md:items-end">
        <div>
          <p className="font-mono text-[10px] font-bold tracking-[0.16em] text-signal">TODAY’S SUMMARY</p>
          <h2 id="today-summary-heading" className="mt-3 text-3xl font-semibold tracking-[-0.05em] text-foreground">Trading command center</h2>
        </div>
        <p className="font-mono text-xs tracking-[0.12em] text-muted">{summary.today} IST · {summary.tradeCount} TRADES</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <SummaryCard label="TODAY P&amp;L" value={summary.todayPnlLabel} detail="Only trades dated today in Asia/Kolkata time." />
        <SummaryCard label="DAILY LOSS USED" value={summary.lossUsedLabel} detail={`Limit ${summary.maxDailyLossLabel} · Remaining ${summary.maxDailyLossRemainingLabel}`} />
        <SummaryCard label="TRADES" value={String(summary.tradeCount)} detail="Today’s trading page records." />
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        <div className="border border-terminal-border bg-terminal p-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="font-mono text-[10px] font-bold tracking-[0.14em] text-muted">RISK / REWARD</p>
              <h3 className="mt-2 text-xl font-semibold tracking-[-0.03em] text-foreground">Today only</h3>
            </div>
            <p className="font-mono text-xl text-signal">{summary.averageRrLabel}</p>
          </div>
          <p className="mt-4 text-sm leading-6 text-muted">{summary.averageRr == null ? 'Planned risk and reward values are not available for today’s trades.' : 'Average planned risk-to-reward across today’s valid trades.'}</p>
        </div>

        <div className="border border-terminal-border bg-terminal p-6">
          <p className="font-mono text-[10px] font-bold tracking-[0.14em] text-muted">ACCOUNT PACE</p>
          <div className="mt-3 flex items-end justify-between gap-4">
            <h3 className="text-xl font-semibold tracking-[-0.03em] text-foreground">Trades to target</h3>
            <p className="font-mono text-xl text-primary">{summary.progressLabel}</p>
          </div>
          <div className="mt-5 h-2 overflow-hidden bg-background" aria-label={`Profit target progress: ${summary.progressLabel}`}>
            <div className="h-full bg-primary" style={{ width: `${Math.min(100, Math.max(0, summary.progress || 0))}%` }} />
          </div>
          <p className="mt-3 text-sm leading-6 text-muted">{summary.progress == null ? 'Need account setup and target data.' : 'Current account progress toward the configured profit target.'}</p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard label="AVG WIN / AVG LOSS" value={summary.averageWinLossLabel} detail="Average of today’s winning and losing trades." />
        <SummaryCard label="WIN STREAK TODAY" value={summary.winStreak.value} detail={summary.winStreak.detail} />
        <SummaryCard label="MISTAKES" value={String(summary.mistakeCount)} detail="Detected from today’s trade fields and legacy thresholds." />
        <SummaryCard label="BACK-TO-BACK" value={String(summary.backToBackCount)} detail="Trades opened within the legacy 30-minute window." />
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        <div className="border border-terminal-border bg-terminal p-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="font-mono text-[10px] font-bold tracking-[0.14em] text-muted">TODAY EQUITY CURVE</p>
              <h3 className="mt-2 text-xl font-semibold tracking-[-0.03em] text-foreground">Intraday result</h3>
            </div>
            <span className="font-mono text-xs text-muted">{summary.today}</span>
          </div>
          <div className="mt-6"><EquitySeries points={summary.equitySeries} /></div>
        </div>

        <div className="border border-terminal-border bg-terminal p-6">
          <p className="font-mono text-[10px] font-bold tracking-[0.14em] text-muted">TODAY AI NOTES</p>
          <h3 className="mt-2 text-xl font-semibold tracking-[-0.03em] text-foreground">Live review</h3>
          <div className="mt-5 space-y-3">
            {!summary.todayTrades.length ? <Insight title="Today focus">Upload today’s trading page export to generate live review notes.</Insight> : null}
            <Insight tone={summary.mistakeCount ? 'danger' : 'neutral'} title="Mistakes">Detected mistakes today: <strong className="text-foreground">{summary.mistakeCount}</strong>.</Insight>
            <Insight tone={summary.backToBackCount ? 'warn' : 'neutral'} title="Cooldown">Back-to-back trades today: <strong className="text-foreground">{summary.backToBackCount}</strong>.</Insight>
            <Insight tone={summary.losses.length ? 'warn' : 'neutral'} title="Loss control">Losses today: <strong className="text-foreground">{summary.losses.length}</strong>. Legacy note: 1 loss = session over.</Insight>
          </div>
        </div>
      </div>

      <div className="border border-terminal-border bg-terminal p-6">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="font-mono text-[10px] font-bold tracking-[0.14em] text-muted">TODAY’S TRADES</p>
            <h3 className="mt-2 text-xl font-semibold tracking-[-0.03em] text-foreground">Executed records</h3>
          </div>
          <span className="font-mono text-xs text-muted">{summary.tradeCount} records</span>
        </div>
        <div className="mt-5"><TodayTradeTable trades={summary.todayTrades} /></div>
      </div>
    </section>
  )
}
