// Phase 1 parity: pure account metrics extracted from legacy behavior; no storage, Firebase, or store writes.
const RESULT_THRESHOLD = 2

function toNumber(value, fallback = 0) {
  const number = Number(value)
  return Number.isFinite(number) ? number : fallback
}

function clampNumber(value, minimum, maximum) {
  return Math.min(maximum, Math.max(minimum, Number(value) || 0))
}

// LEGACY QUIRK: preserved as-is for parity
function isFundedPhase(phase = '') {
  return /funded|phase|challenge|prop/i.test(String(phase || ''))
}

function limitAmount(value, type, accountSize) {
  const number = Number(value)
  if (!Number.isFinite(number) || number <= 0) return null
  return type === 'percent' ? accountSize * number / 100 : number
}

function todayDateKey(now) {
  return now.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' })
}

function sortedTrades(trades) {
  return [...trades].sort((first, second) => new Date(first.openUtc) - new Date(second.openUtc))
}

function tradeResult(pnl) {
  const value = Number(pnl) || 0
  if (value > RESULT_THRESHOLD) return 'profit'
  if (value < -RESULT_THRESHOLD) return 'loss'
  return 'breakeven'
}

function accountMaxTrades(config) {
  const value = Number(config?.maxTradesPerDay)
  return Number.isFinite(value) && value > 0 ? value : null
}

function accountMinRr(config) {
  const value = Number(config?.minRr)
  return Number.isFinite(value) && value > 0 ? value : null
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

function getB2B(trades) {
  const sorted = sortedTrades(trades)
  const backToBackTrades = []

  for (let index = 1; index < sorted.length; index += 1) {
    const currentTrade = sorted[index]
    const previousTrade = sorted[index - 1]
    const currentTimestamp = currentTrade.timestamp || (currentTrade.openUtc
      ? new Date(currentTrade.openUtc).getTime()
      : new Date(`${currentTrade.date}T${currentTrade.time}`).getTime())
    const previousTimestamp = previousTrade.timestamp || (previousTrade.openUtc
      ? new Date(previousTrade.openUtc).getTime()
      : new Date(`${previousTrade.date}T${previousTrade.time}`).getTime())

    if (Number.isNaN(currentTimestamp) || Number.isNaN(previousTimestamp)) continue

    const differenceMinutes = (currentTimestamp - previousTimestamp) / 60000
    if (differenceMinutes >= 0 && differenceMinutes <= 30) {
      backToBackTrades.push({ ...currentTrade, prev: previousTrade, diff: differenceMinutes })
    }
  }

  return backToBackTrades
}

function previousTradeFor(trade, trades) {
  const sorted = sortedTrades(trades)
  const index = sorted.indexOf(trade)
  return index > 0 ? sorted[index - 1] : null
}

function mistakes(trade, trades, accountConfig) {
  const detectedMistakes = []
  const previousTrade = previousTradeFor(trade, trades)
  const minRr = accountMinRr(accountConfig) || 3
  const rr = tradePlannedRr(trade)
  const volume = Number(trade.volume || trade.lot || trade.size || 0)
  const previousVolume = previousTrade ? Number(previousTrade.volume || previousTrade.lot || previousTrade.size || 0) : 0
  const differenceMinutes = previousTrade
    ? (new Date(trade.openUtc) - new Date(previousTrade.openUtc)) / 60000
    : Infinity

  if (previousTrade && Number(previousTrade.pnl) < 0 && differenceMinutes >= 0 && differenceMinutes <= 15) {
    detectedMistakes.push('Revenge Trade')
  }
  if (previousTrade && previousVolume > 0 && volume > previousVolume) detectedMistakes.push('Increased Lot Size')
  if (String(trade.stopMoved || trade.movedStop || trade.slAdjusted || '').toLowerCase() === 'yes') {
    detectedMistakes.push('Moved Stop Loss')
  }
  if (String(trade.entryConfirmed || trade.entryConfirmation || '').toLowerCase() === 'no') {
    detectedMistakes.push('No Confirmation Entry')
  }

  const todayCount = sortedTrades(trades)
    .filter((item) => item.date === trade.date && new Date(item.openUtc) <= new Date(trade.openUtc))
    .length
  const maxTrades = accountMaxTrades(accountConfig)

  if (maxTrades && todayCount > maxTrades) detectedMistakes.push('Overtrading')
  if (rr != null && rr < minRr) detectedMistakes.push('No Patience')
  if (!detectedMistakes.length && trade.reason && /revenge|fomo/i.test(String(trade.reason))) {
    detectedMistakes.push('Revenge Trade')
  }

  return detectedMistakes
}

function deriveTradeStats(trades, accountConfig) {
  const total = trades.length
  const wins = trades.filter((trade) => tradeResult(trade.pnl) === 'profit')
  const losses = trades.filter((trade) => tradeResult(trade.pnl) === 'loss')
  const breakEvens = trades.filter((trade) => tradeResult(trade.pnl) === 'breakeven')
  const pnl = trades.reduce((sum, trade) => sum + toNumber(trade.pnl), 0)
  const grossWin = wins.reduce((sum, trade) => sum + toNumber(trade.pnl), 0)
  const grossLoss = Math.abs(losses.reduce((sum, trade) => sum + toNumber(trade.pnl), 0))
  const mistakeTotal = trades.reduce((sum, trade) => sum + mistakes(trade, trades, accountConfig).length, 0)
  const b2b = getB2B(trades).length
  let peak = 0
  let cumulativePnl = 0
  let maxDD = 0

  sortedTrades(trades).forEach((trade) => {
    cumulativePnl += toNumber(trade.pnl)
    peak = Math.max(peak, cumulativePnl)
    maxDD = Math.min(maxDD, cumulativePnl - peak)
  })

  return {
    total,
    wins,
    losses,
    breakEvens,
    pnl,
    wr: total ? wins.length / total * 100 : 0,
    pf: grossLoss ? grossWin / grossLoss : grossWin,
    avgWin: wins.length ? grossWin / wins.length : 0,
    avgLoss: losses.length ? losses.reduce((sum, trade) => sum + toNumber(trade.pnl), 0) / losses.length : 0,
    mistakeTotal,
    b2b,
    maxDD,
    discipline: Math.max(0, 100 - mistakeTotal * 5 - b2b * 2),
  }
}

export function deriveAccountMetrics({ accountConfig, trades = [], now = new Date() } = {}) {
  if (!accountConfig) return null

  const allTrades = Array.isArray(trades) ? trades : []
  const s = deriveTradeStats(allTrades, accountConfig)
  const today = todayDateKey(now)
  const todayTrades = sortedTrades(allTrades).filter((trade) => trade.date === today)
  const todayPnl = todayTrades.reduce((sum, trade) => sum + toNumber(trade.pnl), 0)
  const accountSize = Number(accountConfig.accountSize) || 0
  const startBalance = accountSize
  const currentBalance = accountSize + allTrades.reduce((sum, trade) => sum + toNumber(trade.pnl), 0)
  const profitTargetAmount = limitAmount(accountConfig.profitTarget, accountConfig.profitTargetType, accountSize) || 0
  const targetBalance = startBalance + profitTargetAmount
  const profitProgress = profitTargetAmount
    ? clampNumber(Math.max(0, currentBalance - startBalance) / profitTargetAmount * 100, 0, 100)
    : 0
  const remainingToTarget = Math.max(0, targetBalance - currentBalance)
  const funded = isFundedPhase(accountConfig.phase)
  const maxDailyLossAmount = (funded || accountConfig.maxDailyLoss != null)
    ? limitAmount(accountConfig.maxDailyLoss, accountConfig.maxDailyLossType, accountSize)
    : null
  const maxDrawdownAmount = (funded || accountConfig.maxDrawdown != null)
    ? limitAmount(accountConfig.maxDrawdown, accountConfig.maxDrawdownType, accountSize)
    : null
  const dailyLossUsed = Math.abs(Math.min(0, todayPnl))
  const maxDrawdownUsed = Math.max(0, startBalance - currentBalance)
  const maxDailyLossRemaining = maxDailyLossAmount == null ? null : Math.max(0, maxDailyLossAmount - dailyLossUsed)
  const maxDrawdownRemaining = maxDrawdownAmount == null ? null : Math.max(0, maxDrawdownAmount - maxDrawdownUsed)
  let daysRemaining = null

  // LEGACY QUIRK: today uses Asia/Kolkata, while this deadline comparison uses browser-local time.
  if (accountConfig.phaseDeadline) {
    const deadline = new Date(`${accountConfig.phaseDeadline}T23:59:59`)
    if (!Number.isNaN(deadline.getTime())) {
      daysRemaining = Math.max(0, Math.ceil((deadline - now) / 86400000))
    }
  }

  return {
    config: accountConfig,
    s,
    todayTrades,
    todayPnl,
    accountSize,
    startBalance,
    currentBalance,
    profitTargetAmount,
    targetBalance,
    profitProgress,
    remainingToTarget,
    funded,
    maxDailyLossAmount,
    maxDrawdownAmount,
    dailyLossUsed,
    maxDrawdownUsed,
    maxDailyLossRemaining,
    maxDrawdownRemaining,
    daysRemaining,
  }
}
