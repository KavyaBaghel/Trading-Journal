// Phase 1 active data source: read legacy browser storage only; this hook performs no writes.
import { useCallback, useEffect, useState } from 'react'

const SYNC_PREFIXES = ['viz', 'viztrade', 'krishna', 'journall']
const SYNC_EXACT_KEYS = ['theme', 'selectedDate']
const MAIN_TRADES_STORAGE_KEY = 'viztrade_trades'
const TRADING_PAGE_TRADES_STORAGE_KEY = 'viztrade_trading_page_trades'
const LEGACY_MY_TRADES_STORAGE_KEY = 'myTrades'

function shouldReadLegacyKey(key) {
  return SYNC_EXACT_KEYS.includes(key) || SYNC_PREFIXES.some((prefix) => key === prefix || key.startsWith(prefix))
}

function parseStoredTradeList(value) {
  if (typeof value !== 'string' || !value.trim()) return []

  try {
    const parsed = JSON.parse(value)
    return Array.isArray(parsed) ? parsed.filter((trade) => trade && typeof trade === 'object') : []
  } catch {
    return []
  }
}

function legacyTradeImportKey(trade) {
  if (!trade) return ''

  const id = String(trade.id || trade.position || trade.positionId || trade.ticket || trade.deal || '').trim()
  if (id) return id

  const symbol = String(trade.symbol || 'UNKNOWN').trim().toUpperCase()
  const side = String(trade.side || '').trim().toUpperCase()
  const date = String(trade.date || '').trim()
  const time = String(trade.time || '').trim().slice(0, 5)
  const pnl = Number(trade.pnl || 0).toFixed(2)
  const volume = Number(trade.volume || trade.lot || 0).toFixed(2)

  return `${date}|${time}|${symbol}|${side}|${pnl}|${volume}`
}

function mergeLegacyTradeSources(...sources) {
  const merged = {}

  sources.flat().forEach((trade) => {
    const key = legacyTradeImportKey(trade)
    if (key) merged[key] = trade
  })

  return Object.values(merged).sort((first, second) => {
    const firstDate = `${first.date || ''} ${first.time || ''}`
    const secondDate = `${second.date || ''} ${second.time || ''}`
    return firstDate.localeCompare(secondDate)
  })
}

function readLocalTradeState() {
  if (typeof window === 'undefined') {
    return {
      mainTradeCount: 0,
      tradingPageTradeCount: 0,
      myTradesCount: 0,
      mergedTradeCount: 0,
      syncedStorageKeys: [],
      trades: [],
    }
  }

  const { localStorage } = window
  const syncedStorageKeys = []

  for (let index = 0; index < localStorage.length; index += 1) {
    const key = localStorage.key(index)
    if (key && shouldReadLegacyKey(key)) syncedStorageKeys.push(key)
  }

  const mainTrades = parseStoredTradeList(localStorage.getItem(MAIN_TRADES_STORAGE_KEY))
  const tradingPageTrades = parseStoredTradeList(localStorage.getItem(TRADING_PAGE_TRADES_STORAGE_KEY))
  const myTrades = parseStoredTradeList(localStorage.getItem(LEGACY_MY_TRADES_STORAGE_KEY))
  const trades = mergeLegacyTradeSources(mainTrades, tradingPageTrades, myTrades)

  return {
    mainTradeCount: mainTrades.length,
    tradingPageTradeCount: tradingPageTrades.length,
    myTradesCount: myTrades.length,
    mergedTradeCount: trades.length,
    syncedStorageKeys: syncedStorageKeys.sort(),
    trades,
  }
}

export function useLocalTrades() {
  const [revision, setRevision] = useState(0)
  const refresh = useCallback(() => setRevision((current) => current + 1), [])

  useEffect(() => {
    const handleStorage = () => refresh()
    const handleVisible = () => {
      if (document.visibilityState === 'visible') refresh()
    }

    window.addEventListener('storage', handleStorage)
    window.addEventListener('focus', refresh)
    document.addEventListener('visibilitychange', handleVisible)

    return () => {
      window.removeEventListener('storage', handleStorage)
      window.removeEventListener('focus', refresh)
      document.removeEventListener('visibilitychange', handleVisible)
    }
  }, [refresh])

  void revision
  return { ...readLocalTradeState(), refresh }
}
