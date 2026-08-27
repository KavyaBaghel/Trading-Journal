// Phase 1 bridge: reuse the existing localStorage event subscriptions and publish read-only snapshots to Zustand.
import { useEffect } from 'react'
import { readLocalAccountConfig } from '../lib/readLocalAccountConfig'
import { useTradeStore } from '../store/useTradeStore'
import { useLocalTrades } from './useLocalTrades'

export function useLocalTradeStoreBridge() {
  const localTrades = useLocalTrades()
  const replaceLocalSnapshot = useTradeStore((state) => state.replaceLocalSnapshot)
  const localSnapshotSignature = JSON.stringify({
    mainTradeCount: localTrades.mainTradeCount,
    tradingPageTradeCount: localTrades.tradingPageTradeCount,
    myTradesCount: localTrades.myTradesCount,
    mergedTradeCount: localTrades.mergedTradeCount,
    syncedStorageKeys: localTrades.syncedStorageKeys,
    trades: localTrades.trades,
  })

  useEffect(() => {
    replaceLocalSnapshot({
      ...localTrades,
      accountConfig: readLocalAccountConfig(),
    })
  }, [localSnapshotSignature, replaceLocalSnapshot])

  return localTrades.refresh
}
