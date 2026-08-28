// Phase 2 Goals: present Phase 1 derived metrics without creating account or trade calculation logic.
import { useTradeStore } from '../store/useTradeStore'

function formatAmount(value) {
  if (value == null) return 'Not configured'

  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(value)
}

function MetricCard({ label, value, detail }) {
  return (
    <article className="border border-terminal-border bg-terminal p-5">
      <p className="font-mono text-[10px] font-bold tracking-[0.14em] text-muted">{label}</p>
      <p className="mt-3 text-2xl font-semibold tracking-[-0.04em] text-foreground">{value}</p>
      <p className="mt-2 text-xs leading-5 text-muted">{detail}</p>
    </article>
  )
}

export default function Goals() {
  const accountMetrics = useTradeStore((state) => state.accountMetrics)

  if (!accountMetrics) {
    return (
      <section className="border border-terminal-border bg-terminal p-6 md:p-8" aria-labelledby="goals-heading">
        <p className="font-mono text-[10px] font-bold tracking-[0.16em] text-signal">ACCOUNT PHASE</p>
        <h2 id="goals-heading" className="mt-3 text-2xl font-semibold tracking-[-0.04em] text-foreground">Goals need account configuration.</h2>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-muted">No valid account configuration is available in this browser origin. This view remains presentational and reads its metrics from the Phase 1 trade store.</p>
      </section>
    )
  }

  const targetProgress = `${accountMetrics.profitProgress.toFixed(0)}%`
  const dailyLossLimit = formatAmount(accountMetrics.maxDailyLossAmount)
  const drawdownLimit = formatAmount(accountMetrics.maxDrawdownAmount)
  const daysRemaining = accountMetrics.daysRemaining == null ? 'No deadline' : `${accountMetrics.daysRemaining} days`

  return (
    <section aria-labelledby="goals-heading">
      <div className="border border-terminal-border bg-terminal p-6 md:p-8">
        <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
          <div>
            <p className="font-mono text-[10px] font-bold tracking-[0.16em] text-signal">ACCOUNT PHASE</p>
            <h2 id="goals-heading" className="mt-3 text-3xl font-semibold tracking-[-0.05em] text-foreground">Profit target progress</h2>
          </div>
          <p className="font-mono text-sm text-primary">{targetProgress} COMPLETE</p>
        </div>

        <div className="mt-6 h-2 overflow-hidden bg-background" aria-label={`Profit target progress: ${targetProgress}`}>
          <div className="h-full bg-primary" style={{ width: targetProgress }} />
        </div>
        <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted">
          <span>Current balance: <strong className="font-medium text-foreground">{formatAmount(accountMetrics.currentBalance)}</strong></span>
          <span>Target balance: <strong className="font-medium text-foreground">{formatAmount(accountMetrics.targetBalance)}</strong></span>
          <span>Remaining: <strong className="font-medium text-foreground">{formatAmount(accountMetrics.remainingToTarget)}</strong></span>
        </div>
      </div>

      <div className="mt-5 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="DAILY LOSS"
          value={formatAmount(accountMetrics.dailyLossUsed)}
          detail={`Limit ${dailyLossLimit} · Remaining ${formatAmount(accountMetrics.maxDailyLossRemaining)}`}
        />
        <MetricCard
          label="DRAWDOWN"
          value={formatAmount(accountMetrics.maxDrawdownUsed)}
          detail={`Limit ${drawdownLimit} · Remaining ${formatAmount(accountMetrics.maxDrawdownRemaining)}`}
        />
        <MetricCard label="DEADLINE" value={daysRemaining} detail="Legacy browser-local deadline calculation." />
        <MetricCard
          label="ACCOUNT STATUS"
          value={accountMetrics.funded ? 'Funded rules active' : 'Standard rules'}
          detail="Phase status is preserved from the legacy derived-metrics contract."
        />
      </div>
    </section>
  )
}
