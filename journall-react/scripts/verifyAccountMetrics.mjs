import assert from 'node:assert/strict'
import { deriveAccountMetrics } from '../src/lib/deriveAccountMetrics.js'

const NOW = new Date('2026-08-27T12:00:00Z')
const INDIA_TODAY = NOW.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' })

function makeConfig(overrides = {}) {
  return {
    accountSize: 10000,
    phase: 'Phase 1',
    profitTarget: 10,
    profitTargetType: 'percent',
    maxDailyLoss: 5,
    maxDailyLossType: 'percent',
    maxDrawdown: 10,
    maxDrawdownType: 'percent',
    riskPercent: 1,
    maxTradesPerDay: 3,
    minRr: 3,
    phaseDeadline: '',
    userSetupCriteria: [],
    startDate: '2026-08-01',
    ...overrides,
  }
}

function makeTrade(overrides = {}) {
  return {
    date: INDIA_TODAY,
    time: '09:00:00',
    openUtc: `${INDIA_TODAY}T09:00:00Z`,
    pnl: 0,
    ...overrides,
  }
}

assert.equal(deriveAccountMetrics({ trades: [makeTrade({ pnl: 500 })], now: NOW }), null)

const zeroTradeMetrics = deriveAccountMetrics({ accountConfig: makeConfig(), trades: [], now: NOW })
assert.equal(zeroTradeMetrics.startBalance, 10000)
assert.equal(zeroTradeMetrics.currentBalance, 10000)
assert.equal(zeroTradeMetrics.profitProgress, 0)
assert.equal(zeroTradeMetrics.dailyLossUsed, 0)
assert.equal(zeroTradeMetrics.maxDrawdownUsed, 0)
assert.equal(zeroTradeMetrics.s.total, 0)
assert.equal(zeroTradeMetrics.s.discipline, 100)

const phaseOneMetrics = deriveAccountMetrics({ accountConfig: makeConfig({ maxDailyLoss: null, maxDrawdown: null }), now: NOW })
assert.equal(phaseOneMetrics.funded, true)
assert.equal(phaseOneMetrics.maxDailyLossAmount, null)
assert.equal(phaseOneMetrics.maxDrawdownAmount, null)

const targetMetrics = deriveAccountMetrics({
  accountConfig: makeConfig(),
  trades: [makeTrade({ pnl: 1400 })],
  now: NOW,
})
assert.equal(targetMetrics.profitTargetAmount, 1000)
assert.equal(targetMetrics.targetBalance, 11000)
assert.equal(targetMetrics.profitProgress, 100)
assert.equal(targetMetrics.remainingToTarget, 0)

const absoluteTargetMetrics = deriveAccountMetrics({
  accountConfig: makeConfig({ profitTarget: 650, profitTargetType: 'amount' }),
  now: NOW,
})
assert.equal(absoluteTargetMetrics.profitTargetAmount, 650)

const dailyLossMetrics = deriveAccountMetrics({
  accountConfig: makeConfig(),
  trades: [
    makeTrade({ pnl: -300 }),
    makeTrade({ date: '2026-08-01', openUtc: '2026-08-01T09:00:00Z', pnl: -900 }),
  ],
  now: NOW,
})
assert.equal(dailyLossMetrics.todayPnl, -300)
assert.equal(dailyLossMetrics.dailyLossUsed, 300)
assert.equal(dailyLossMetrics.maxDailyLossAmount, 500)
assert.equal(dailyLossMetrics.maxDailyLossRemaining, 200)
assert.equal(dailyLossMetrics.maxDrawdownUsed, 1200)
assert.equal(dailyLossMetrics.maxDrawdownRemaining, 0)

const pastDeadlineMetrics = deriveAccountMetrics({
  accountConfig: makeConfig({ phaseDeadline: '2020-01-01' }),
  now: NOW,
})
assert.equal(pastDeadlineMetrics.daysRemaining, 0)

const invalidDeadlineMetrics = deriveAccountMetrics({
  accountConfig: makeConfig({ phaseDeadline: 'not-a-date' }),
  now: NOW,
})
assert.equal(invalidDeadlineMetrics.daysRemaining, null)

const timezoneBoundaryNow = new Date('2026-08-27T18:45:00Z')
const indiaTomorrow = timezoneBoundaryNow.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' })
const timezoneMetrics = deriveAccountMetrics({
  accountConfig: makeConfig({ phaseDeadline: '2026-08-28' }),
  trades: [makeTrade({ date: indiaTomorrow, openUtc: '2026-08-27T18:45:00Z', pnl: -25 })],
  now: timezoneBoundaryNow,
})
assert.equal(timezoneMetrics.todayTrades.length, 1)
assert.equal(timezoneMetrics.dailyLossUsed, 25)

console.log('Account metrics parity assertions passed: 9 scenarios')
