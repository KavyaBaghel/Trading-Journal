const RESULT_THRESHOLD = 2

function toNumber(value, fallback = 0) {
  const number = Number(value)
  return Number.isFinite(number) ? number : fallback
}

function todayDateKey(now) {
  return now.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' })
}

function sortedTrades(trades) {
  return [...trades].sort((first, second) => new Date(first.openUtc) - new Date(second.openUtc))
}

function tradeResult(pnl) {
  const value = toNumber(pnl)
  if (value > RESULT_THRESHOLD) return 'profit'
  if (value < -RESULT_THRESHOLD) return 'loss'
  return 'breakeven'
}

function tradePlannedRr(trade) {
  const configuredRr = Number(trade.rr || trade.riskReward || trade.rewardRisk || 0)
  if (Number.isFinite(configuredRr) && configuredRr > 0) return configuredRr

  const entry = Number(trade.entry)
  const stopLoss = Number(trade.sl)
  const takeProfit = Number(trade.tp)

  if (Number.isFinite(entry) && Number.isFinite(stopLoss) && Number.isFinite(takeProfit) && Math.abs(entry - stopLoss) > 0) {
    return Math.abs(takeProfit - entry) / Math.abs(entry - stopLoss)
  }

  return null
}

function previousTradeFor(trade, trades) {
  const ordered = sortedTrades(trades)
  const index = ordered.indexOf(trade)
  return index > 0 ? ordered[index - 1] : null
}

function mistakes(trade, trades, accountConfig) {
  const previousTrade = previousTradeFor(trade, trades)
  const plannedRr = tradePlannedRr(trade)
  const minRrValue = Number(accountConfig?.minRr)
  const minRr = Number.isFinite(minRrValue) && minRrValue > 0 ? minRrValue : 3
  const volume = Number(trade.volume || trade.lot || trade.size || 0)
  const previousVolume = previousTrade ? Number(previousTrade.volume || previousTrade.lot || previousTrade.size || 0) : 0
  const differenceMinutes = previousTrade
    ? (new Date(trade.openUtc) - new Date(previousTrade.openUtc)) / 60000
    : Infinity
  const detected = []

  // LEGACY QUIRK: the 15-minute revenge-trade window is preserved as-is.
  if (previousTrade && Number(previousTrade.pnl) < 0 && differenceMinutes >= 0 && differenceMinutes <= 15) detected.push('Revenge Trade')
  if (previousTrade && previousVolume > 0 && volume > previousVolume) detected.push('Increased Lot Size')
  if (String(trade.stopMoved || trade.movedStop || trade.slAdjusted || '').toLowerCase() === 'yes') detected.push('Moved Stop Loss')
  if (String(trade.entryConfirmed || trade.entryConfirmation || '').toLowerCase() === 'no') detected.push('No Confirmation Entry')
  const todayCount = sortedTrades(trades).filter((item) => item.date === trade.date && new Date(item.openUtc) <= new Date(trade.openUtc)).length
  const maxTradesValue = Number(accountConfig?.maxTradesPerDay)
  const maxTrades = Number.isFinite(maxTradesValue) && maxTradesValue > 0 ? maxTradesValue : null

  if (maxTrades && todayCount > maxTrades) detected.push('Overtrading')
  if (plannedRr != null && plannedRr < minRr) detected.push('No Patience')
  if (!detected.length && trade.reason && /revenge|fomo/i.test(String(trade.reason))) detected.push('Revenge Trade')

  return detected
}

function getBackToBackCount(trades) {
  const ordered = sortedTrades(trades)
  let count = 0

  for (let index = 1; index < ordered.length; index += 1) {
    const current = ordered[index]
    const previous = ordered[index - 1]
    const currentTimestamp = current.timestamp || (current.openUtc
      ? new Date(current.openUtc).getTime()
      : new Date(`${current.date}T${current.time}`).getTime())
    const previousTimestamp = previous.timestamp || (previous.openUtc
      ? new Date(previous.openUtc).getTime()
      : new Date(`${previous.date}T${previous.time}`).getTime())
    const differenceMinutes = (currentTimestamp - previousTimestamp) / 60000

    if (!Number.isNaN(currentTimestamp) && !Number.isNaN(previousTimestamp) && differenceMinutes >= 0 && differenceMinutes <= 30) count += 1
  }

  return count
}

function money(value) {
  const amount = toNumber(value)
  return `${amount < 0 ? '-' : ''}$${Math.abs(amount).toFixed(2)}`
}

function streakSummary(todayTrades) {
  if (!todayTrades.length) return { value: 'No trades yet', tone: 'neutral', detail: 'No trades yet today.' }

  let index = todayTrades.length - 1
  while (index >= 0 && tradeResult(todayTrades[index]?.pnl) === 'breakeven') index -= 1
  if (index < 0) return { value: '—', tone: 'neutral', detail: 'Today finished at breakeven.' }

  const kind = tradeResult(todayTrades[index]?.pnl)
  let count = 0
  while (index >= 0 && tradeResult(todayTrades[index]?.pnl) === kind) {
    count += 1
    index -= 1
  }

  return {
    value: `${count}${kind === 'profit' ? 'W' : 'L'}`,
    tone: kind === 'profit' ? 'positive' : 'negative',
    detail: 'Today only.',
  }
}

export function deriveTodaysSummary({ trades = [], accountMetrics = null, now = new Date() } = {}) {
  const allTrades = Array.isArray(trades) ? trades : []
  const today = todayDateKey(now)
  const todayTrades = sortedTrades(allTrades).filter((trade) => trade && trade.date === today)
  const wins = todayTrades.filter((trade) => tradeResult(trade.pnl) === 'profit')
  const losses = todayTrades.filter((trade) => tradeResult(trade.pnl) === 'loss')
  const breakevens = todayTrades.filter((trade) => tradeResult(trade.pnl) === 'breakeven')
  const todayPnl = todayTrades.reduce((sum, trade) => sum + toNumber(trade.pnl), 0)
  const plannedRrs = todayTrades.map(tradePlannedRr).filter((value) => value != null)
  const averageRr = plannedRrs.length ? plannedRrs.reduce((sum, value) => sum + value, 0) / plannedRrs.length : null
  const averageWin = wins.length ? wins.reduce((sum, trade) => sum + toNumber(trade.pnl), 0) / wins.length : null
  const averageLoss = losses.length ? losses.reduce((sum, trade) => sum + toNumber(trade.pnl), 0) / losses.length : null
  const lossUsed = Math.abs(Math.min(0, todayPnl))
  const maxDailyLoss = accountMetrics?.maxDailyLossAmount ?? null
  const mistakeCount = todayTrades.reduce((sum, trade) => sum + mistakes(trade, allTrades, accountMetrics?.config).length, 0)
  const backToBackCount = getBackToBackCount(todayTrades)
  let cumulativePnl = 0
  const equitySeries = todayTrades.map((trade) => {
    cumulativePnl += toNumber(trade.pnl)
    return {
      label: `${trade.date || ''} ${trade.time || ''}`.trim() || 'Unknown',
      value: Number(cumulativePnl.toFixed(2)),
    }
  })

  return {
    today,
    todayTrades,
    todayPnl,
    todayPnlLabel: money(todayPnl),
    tradeCount: todayTrades.length,
    wins,
    losses,
    breakevens,
    averageRr,
    averageRrLabel: averageRr == null ? 'R:R not tracked' : `${averageRr.toFixed(2)}R`,
    averageWin,
    averageLoss,
    averageWinLossLabel: averageWin == null || averageLoss == null ? 'Not enough data' : `${money(averageWin)} / ${money(averageLoss)}`,
    lossUsed,
    lossUsedLabel: money(lossUsed),
    maxDailyLoss,
    maxDailyLossLabel: maxDailyLoss == null ? 'Not set' : money(maxDailyLoss),
    maxDailyLossRemaining: accountMetrics?.maxDailyLossRemaining ?? null,
    maxDailyLossRemainingLabel: accountMetrics?.maxDailyLossRemaining == null ? 'Not set' : money(accountMetrics.maxDailyLossRemaining),
    progress: accountMetrics?.profitProgress ?? null,
    progressLabel: accountMetrics?.profitProgress == null ? 'Not enough data' : `${accountMetrics.profitProgress.toFixed(1)}%`,
    mistakeCount,
    backToBackCount,
    equitySeries,
    winStreak: streakSummary(todayTrades),
  }
}
