import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { X } from 'lucide-react'
import { useApp } from '../../contexts/AppContext'
import { formatAmount } from '../../utils/format'
import { monthSummary, prevKeyOf } from '../../utils/alerts'
import { monthName } from '../../utils/months'

// During the first 10 days of a month: a short summary of the month that just
// ended. Shown once; closing it hides it for good.
export default function MonthSummary() {
  const { t } = useTranslation()
  const { transactions, currentMonthKey, isCurrentMonth, household, settings } = useApp()
  const [, force] = useState(0)
  if (!isCurrentMonth || new Date().getDate() > 10) return null
  const lang = settings.language || 'he'
  const he = lang === 'he'
  const cur = settings.currency
  const prevKey = prevKeyOf(currentMonthKey)
  let seen = false
  try { seen = localStorage.getItem('sb_summary_seen') === prevKey } catch {}
  if (seen) return null
  const s = monthSummary({ transactions, monthKey: prevKey, monthlyBudget: household?.monthlyBudgets?.[prevKey] ?? null })
  if (!s) return null
  const close = () => { try { localStorage.setItem('sb_summary_seen', prevKey) } catch {} ; force(n => n + 1) }
  const money = (v) => formatAmount(Math.round(v), cur)

  const lines = []
  lines.push(he ? `הוצאתם ${money(s.total)}${s.income > 0 ? ` והכנסתם ${money(s.income)}` : ''}` : `You spent ${money(s.total)}${s.income > 0 ? ` and earned ${money(s.income)}` : ''}`)
  if (s.changePct !== null && Math.abs(s.changePct) >= 3) {
    lines.push(he
      ? `${Math.abs(s.changePct)}% ${s.changePct > 0 ? 'יותר' : 'פחות'} מהחודש שלפניו`
      : `${Math.abs(s.changePct)}% ${s.changePct > 0 ? 'more' : 'less'} than the month before`)
  }
  if (s.budgetDiff !== null) {
    lines.push(s.budgetDiff >= 0
      ? (he ? `עמדתם בתקציב, נשארו ${money(s.budgetDiff)}` : `Within budget, ${money(s.budgetDiff)} left`)
      : (he ? `חרגתם מהתקציב ב-${money(-s.budgetDiff)}` : `Over budget by ${money(-s.budgetDiff)}`))
  }
  if (s.topCategory) {
    lines.push(he
      ? `הקטגוריה הגדולה: ${t(`categories.${s.topCategory.id}`)} (${money(s.topCategory.amount)})`
      : `Biggest category: ${t(`categories.${s.topCategory.id}`)} (${money(s.topCategory.amount)})`)
  }

  return (
    <div style={{ padding: '14px 16px 0' }}>
      <div className="card" style={{ padding: '12px 14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
          <div style={{ flex: 1, fontSize: 14, fontWeight: 700 }}>{he ? `סיכום ${monthName(prevKey, lang)}` : `${monthName(prevKey, lang)} summary`}</div>
          <button className="btn-icon" style={{ width: 30, height: 30 }} onClick={close} aria-label={he ? 'סגור' : 'Close'}>
            <X size={16} strokeWidth={2} />
          </button>
        </div>
        {lines.map((l, i) => (
          <div key={i} style={{ fontSize: 13.5, color: i === 0 ? 'var(--c-text)' : 'var(--c-text2)', padding: '3px 0' }}>{l}</div>
        ))}
      </div>
    </div>
  )
}
