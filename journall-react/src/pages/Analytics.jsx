// Analytics page: read-only derived analytics mirroring legacy index.html dashboard tab.
import { useTradeStore } from '../store/useTradeStore';
import { deriveAnalytics } from '../lib/deriveAnalytics';

export default function Analytics() {
  const trades = useTradeStore((state) => state.trades);
  const metrics = deriveAnalytics(trades);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-[10px] border border-terminal-border bg-terminal p-4">
          <p className="font-mono text-[10px] tracking-[0.14em] text-muted">TOTAL TRADES</p>
          <p className="mt-2 text-2xl font-bold font-mono text-foreground">{metrics.totalTrades}</p>
        </div>
        <div className="rounded-[10px] border border-terminal-border bg-terminal p-4">
          <p className="font-mono text-[10px] tracking-[0.14em] text-muted">WIN RATE</p>
          <p className="mt-2 text-2xl font-bold font-mono text-signal">{metrics.winRate.toFixed(1)}%</p>
        </div>
        <div className="rounded-[10px] border border-terminal-border bg-terminal p-4">
          <p className="font-mono text-[10px] tracking-[0.14em] text-muted">NET P&L</p>
          <p className={`mt-2 text-2xl font-bold font-mono ${metrics.totalPnl >= 0 ? 'text-profit' : 'text-loss'}`}>
            ${metrics.totalPnl.toFixed(2)}
          </p>
        </div>
        <div className="rounded-[10px] border border-terminal-border bg-terminal p-4">
          <p className="font-mono text-[10px] tracking-[0.14em] text-muted">PROFIT FACTOR</p>
          <p className="mt-2 text-2xl font-bold font-mono text-foreground">
            {metrics.profitFactor === Infinity ? 'CLEAN' : metrics.profitFactor.toFixed(2)}
          </p>
        </div>
      </div>

      <div className="rounded-[10px] border border-terminal-border bg-terminal p-6">
        <h2 className="font-mono text-xs font-bold tracking-[0.14em] text-foreground mb-4">LEGACY DASHBOARD CITED METRICS (index.html:5549-5564)</h2>
        <div className="space-y-4">
          <p className="text-xs text-muted leading-relaxed">
            Derived entirely from read-only Zustand store records. Parity-ported from legacy index.html dashboard tab logic.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-2 text-[10px] font-mono text-muted uppercase tracking-wider">
            <div className="flex justify-between border-b border-terminal-border/50 pb-1">
              <span>Gross Profit</span>
              <span className="text-profit">${metrics.grossProfit.toFixed(2)}</span>
            </div>
            <div className="flex justify-between border-b border-terminal-border/50 pb-1">
              <span>Gross Loss</span>
              <span className="text-loss">${metrics.grossLoss.toFixed(2)}</span>
            </div>
            <div className="flex justify-between border-b border-terminal-border/50 pb-1">
              <span>Wins</span>
              <span>{metrics.winningTrades}</span>
            </div>
            <div className="flex justify-between border-b border-terminal-border/50 pb-1">
              <span>Losses</span>
              <span>{metrics.losingTrades}</span>
            </div>
            <div className="flex justify-between border-b border-terminal-border/50 pb-1">
              <span>Break-even</span>
              <span>{metrics.breakEvenTrades}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
