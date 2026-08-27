// Phase 1 data contract: read the legacy account-config key only; never write or migrate it.
const ACCOUNT_CONFIG_KEY = 'journall_account_config_v1'
const DEFAULT_RISK_PERCENT = 1

function clampNumber(value, minimum, maximum) {
  return Math.min(maximum, Math.max(minimum, Number(value) || 0))
}

function todayDate() {
  return new Date().toISOString().slice(0, 10)
}

export function readLocalAccountConfig() {
  if (typeof window === 'undefined') return null

  try {
    const raw = JSON.parse(window.localStorage.getItem(ACCOUNT_CONFIG_KEY) || 'null')

    if (!raw || !Number(raw.accountSize)) return null

    return {
      accountSize: Number(raw.accountSize),
      phase: raw.phase || 'Phase 1',
      profitTarget: Number(raw.profitTarget) || 0,
      profitTargetType: raw.profitTargetType || 'percent',
      maxDailyLoss: raw.maxDailyLoss === '' || raw.maxDailyLoss == null ? null : Number(raw.maxDailyLoss),
      maxDailyLossType: raw.maxDailyLossType || 'percent',
      maxDrawdown: raw.maxDrawdown === '' || raw.maxDrawdown == null ? null : Number(raw.maxDrawdown),
      maxDrawdownType: raw.maxDrawdownType || 'percent',
      riskPercent: clampNumber(raw.riskPercent || DEFAULT_RISK_PERCENT, 0.5, 2),
      maxTradesPerDay: raw.maxTradesPerDay === '' || raw.maxTradesPerDay == null ? null : Number(raw.maxTradesPerDay),
      minRr: raw.minRr === '' || raw.minRr == null ? null : Number(raw.minRr),
      phaseDeadline: raw.phaseDeadline || '',
      userSetupCriteria: Array.isArray(raw.userSetupCriteria)
        ? raw.userSetupCriteria.map((item) => String(item || '').trim()).filter(Boolean)
        : [],
      startDate: raw.startDate || todayDate(),
    }
  } catch {
    return null
  }
}
