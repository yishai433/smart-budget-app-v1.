import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { AlertTriangle, X } from 'lucide-react'
import { useApp } from '../../contexts/AppContext'
import { formatAmount } from '../../utils/format'
import { budgetAlerts } from '../../utils/alerts'

// Heads-up when a category (or the whole month) reaches 80% of its budget or
// passes it. Current month only. Dismissing hides it until something changes.
export default function BudgetAlerts() {
  const { t } = useTranslation()
  const { transactions, monthKey, isCurrentMonth, effectiveCategoryBudgets, monthlyBudget, settings } = useApp()
  const [, force] = useState(0)
  if (!isCurrentMonth) return null
  const he = (settings.language || 'he') === 'he'
  const cur = settings.currency
  const alerts = budgetAlerts({ transactions, monthKey, categoryBudgets: effectiveCategoryBudgets, monthlyBudget })
  if (alerts.length === 0) return null

  // dismissed until the set of alerts (which ones, and near/over) changes
  const signature = `${monthKey}:${alerts.map(a => `${a.id}-${a.level}`).join(',')}`
  let dismissed = false
  try { dismissed = localStorage.getItem('sb_alerts_dismissed') === signature } catch {}
  if (dismissed) return null
  const dismiss = () => { try { localStorage.setItem('sb_alerts_dismissed', signature) } catch {} ; force(n => n + 1) }

  const name = (a) => a.id === '__total' ? (he ? 'התקציב החודשי' : 'Monthly budget') : t(`categories.${a.id}`)
  const text = (a) => a.level === 'over'
    ? (he ? `חריגה של ${formatAmount(Math.round(a.spent - a.limit), cur)}` : `Over by ${formatAmount(Math.round(a.spent - a.limit), cur)}`)
    : (he ? `${a.pct}% מהתקציב, נשארו ${formatAmount(Math.round(a.limit - a.spent), cur)}` : `${a.pct}% used, ${formatAmount(Math.round(a.limit - a.spent), cur)} left`)

  return (
    <div style={{ padding: '14px 16px 0' }}>
      <div className="card" style={{ padding: 0, overflow: 'hidden', border: '1px solid var(--c-danger)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px' }}>
          <AlertTriangle size={18} strokeWidth={2.2} color="var(--c-danger)" />
          <div style={{ flex: 1, fontSize: 14, fontWeight: 600 }}>{he ? 'שימו לב לתקציב' : 'Budget heads-up'}</div>
          <button className="btn-icon" style={{ width: 30, height: 30 }} onClick={dismiss} aria-label={he ? 'סגור' : 'Dismiss'}>
            <X size={16} strokeWidth={2} />
          </button>
        </div>
        {alerts.slice(0, 4).map(a => (
          <div key={a.id} style={{ display: 'flex', alignItems: 'baseline', gap: 8, padding: '9px 14px', borderTop: '1px solid var(--c-sep)' }}>
            <div style={{ flex: 1, minWidth: 0, fontSize: 13.5, fontWeight: 500 }}>{name(a)}</div>
            <div style={{ fontSize: 12.5, color: a.level === 'over' ? 'var(--c-danger)' : 'var(--c-text2)', fontWeight: a.level === 'over' ? 700 : 500 }}>{text(a)}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
