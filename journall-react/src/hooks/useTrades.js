// Phase 1 data layer: read-only subscription to the legacy Firestore state document; no data writes occur here.
import { useEffect, useMemo, useState } from 'react'
import { doc, onSnapshot } from 'firebase/firestore'
import { db } from '../lib/firebase'

const LEGACY_MAIN_TRADES_KEY = 'viztrade_trades'
const LEGACY_TRADING_PAGE_TRADES_KEY = 'viztrade_trading_page_trades'

function parseTradeList(value) {
  if (Array.isArray(value)) return value
  if (typeof value !== 'string' || !value.trim()) return []

  try {
    const parsed = JSON.parse(value)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function tradeIdentity(trade) {
  return [
    trade?.id ?? '',
    trade?.ticket ?? '',
    trade?.date ?? '',
    trade?.time ?? '',
    trade?.symbol ?? '',
    trade?.side ?? '',
    trade?.entry ?? '',
    trade?.exit ?? '',
    trade?.pnl ?? '',
  ].join('|')
}

function mergeLegacyTradeLists(mainTrades, tradingPageTrades) {
  const uniqueTrades = {}

  ;[...mainTrades, ...tradingPageTrades].forEach((trade) => {
    if (!trade || typeof trade !== 'object') return
    uniqueTrades[tradeIdentity(trade)] = trade
  })

  return Object.values(uniqueTrades)
}

export function useTrades(user) {
  const [state, setState] = useState({
    uid: null,
    error: null,
    exists: false,
    mainTradeCount: 0,
    tradingPageTradeCount: 0,
    storageKeys: [],
    trades: [],
  })

  useEffect(() => {
    if (!user?.uid) return undefined

    const stateDocument = doc(db, 'users', user.uid, 'journallState', 'main')
    const unsubscribe = onSnapshot(
      stateDocument,
      (snapshot) => {
        const storage = snapshot.exists() ? snapshot.data()?.storage ?? {} : {}
        const mainTrades = parseTradeList(storage[LEGACY_MAIN_TRADES_KEY])
        const tradingPageTrades = parseTradeList(storage[LEGACY_TRADING_PAGE_TRADES_KEY])

        setState({
          uid: user.uid,
          error: null,
          exists: snapshot.exists(),
          mainTradeCount: mainTrades.length,
          tradingPageTradeCount: tradingPageTrades.length,
          storageKeys: Object.keys(storage).sort(),
          trades: mergeLegacyTradeLists(mainTrades, tradingPageTrades),
        })
      },
      (snapshotError) => {
        setState((current) => ({ ...current, uid: user.uid, error: snapshotError }))
      },
    )

    return unsubscribe
  }, [user?.uid])

  return useMemo(() => {
    if (!user?.uid) {
      return {
        uid: null,
        loading: false,
        error: null,
        exists: false,
        mainTradeCount: 0,
        tradingPageTradeCount: 0,
        storageKeys: [],
        trades: [],
      }
    }

    return { ...state, loading: state.uid !== user.uid }
  }, [state, user?.uid])
}
