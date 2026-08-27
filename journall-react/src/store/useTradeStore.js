// Phase 1 data contract: non-persisted, read-only snapshots supplied by the existing localStorage hook.
import { create } from 'zustand'
import { deriveAccountMetrics } from '../lib/deriveAccountMetrics'

const EMPTY_TRADE_COUNTS = Object.freeze({
  main: 0,
  tradingPage: 0,
  myTrades: 0,
  merged: 0,
})

function normalizeLocalSnapshot(snapshot) {
  const trades = Array.isArray(snapshot?.trades) ? snapshot.trades : []
  const syncedStorageKeys = Array.isArray(snapshot?.syncedStorageKeys) ? snapshot.syncedStorageKeys : []

  return {
    source: 'localStorage',
    trades,
    tradeCounts: {
      main: Number(snapshot?.mainTradeCount) || 0,
      tradingPage: Number(snapshot?.tradingPageTradeCount) || 0,
      myTrades: Number(snapshot?.myTradesCount) || 0,
      merged: Number(snapshot?.mergedTradeCount) || 0,
    },
    syncedStorageKeys,
    accountConfig: snapshot?.accountConfig ?? null,
  }
}

function snapshotSignature(snapshot) {
  return JSON.stringify({
    tradeCounts: snapshot.tradeCounts,
    syncedStorageKeys: snapshot.syncedStorageKeys,
    trades: snapshot.trades,
    accountConfig: snapshot.accountConfig,
  })
}

export const useTradeStore = create((set) => ({
  source: 'localStorage',
  trades: [],
  tradeCounts: EMPTY_TRADE_COUNTS,
  syncedStorageKeys: [],
  accountConfig: null,
  accountMetrics: null,
  status: {
    hydrated: false,
    lastRefreshedAt: null,
    error: null,
  },
  _snapshotSignature: null,

  replaceLocalSnapshot: (nextSnapshot) => {
    const snapshot = normalizeLocalSnapshot(nextSnapshot)
    const nextSignature = snapshotSignature(snapshot)
    const accountMetrics = deriveAccountMetrics({
      accountConfig: snapshot.accountConfig,
      trades: snapshot.trades,
    })

    set((current) => {
      if (current._snapshotSignature === nextSignature) return current

      return {
        ...snapshot,
        accountMetrics,
        status: {
          hydrated: true,
          lastRefreshedAt: new Date().toISOString(),
          error: null,
        },
        _snapshotSignature: nextSignature,
      }
    })
  },
}))
