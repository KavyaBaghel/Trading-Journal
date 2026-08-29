// Minimal dev-only debug panel: restore visibility into auth and trade-store state without full JSON dump.
import { useAuth } from '../../hooks/useAuth';
import { useTradeStore } from '../../store/useTradeStore';
export function MinimalDebugView() {
  const { user, loading: authLoading, error: authError } = useAuth();
  const tradeStore = useTradeStore();
  return (
    <section data-dev-only="minimal-debug" className="mt-6 rounded-[10px] border border-terminal-border bg-terminal p-4">
      <h2 className="font-mono text-xs font-bold tracking-[0.14em] text-muted mb-3">DEBUG STATE</h2>
      <div className="space-y-3 text-xs">
        <div className="grid grid-cols-2 gap-x-4">
          <p className="font-mono text-muted">AUTH STATE</p>
          <p className={`font-mono ${authError ? 'text-loss' : 'text-foreground'}`}>
            {authLoading ? 'LOADING' : user ? user.email : 'SIGNED OUT'}
            {authError && ` (${authError.message})`}
          </p>
        </div>
        <div className="grid grid-cols-2 gap-x-4">
          <p className="font-mono text-muted">TRADE SOURCE</p>
          <p className="font-mono text-foreground">{tradeStore.source}</p>
        </div>
        <div className="grid grid-cols-2 gap-x-4">
          <p className="font-mono text-muted">TRADE COUNTS</p>
          <p className="font-mono text-foreground">
            main: {tradeStore.tradeCounts.main}, tradingPage: {tradeStore.tradeCounts.tradingPage}, myTrades: {tradeStore.tradeCounts.myTrades}, merged: {tradeStore.tradeCounts.merged}
          </p>
        </div>
        <div className="grid grid-cols-2 gap-x-4">
          <p className="font-mono text-muted">STORE STATUS</p>
          <p className="font-mono text-foreground">
            {tradeStore.status.error
              ? `ERROR: ${tradeStore.status.error}`
              : tradeStore.status.hydrated
              ? `READY${tradeStore.status.lastRefreshedAt ? ` (${tradeStore.status.lastRefreshedAt})` : ''}`
              : 'LOADING'}
          </p>
        </div>
      </div>
    </section>
  );
}