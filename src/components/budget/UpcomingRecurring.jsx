import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { Repeat } from 'lucide-react'
import { useApp } from '../../contexts/AppContext'
import { formatAmount } from '../../utils/format'
import { getUpcomingRecurring } from '../../utils/recurring'
import { monthName } from '../../utils/months'

// "Coming up" — recurring expenses expected in the next 7 days, projected from
// the recurring transactions already logged. Current month only; hidden when empty.
export default function UpcomingRecurring() {
  const { t } = useTranslation()
  const { transactions, settings, isCurrentMonth, recurringOff, recurringStopped } = useApp()
  const cur = settings.currency
  const lang = settings.language || 'he'
  const he = lang === 'he'

  if (!isCurrentMonth) return null
  const items = getUpcomingRecurring(transactions, new Date(), 7, { stopped: recurringStopped, includeToday: recurringOff }).slice(0, 4)
  if (items.length === 0) return null

  const when = (it) => {
    const rel = it.daysUntil === 0 ? (he ? 'היום' : 'Today')
      : it.daysUntil === 1 ? (he ? 'מחר' : 'Tomorrow')
      : (he ? `בעוד ${it.daysUntil} ימים` : `In ${it.daysUntil} days`)
    const key = `${it.due.getFullYear()}-${String(it.due.getMonth() + 1).padStart(2, '0')}`
    const date = he ? `${it.due.getDate()} ב${monthName(key, lang)}` : `${monthName(key, lang)} ${it.due.getDate()}`
    return `${rel} · ${date}`
  }

  return (
    <div style={{ padding: '26px 16px 0' }}>
      <div className="section-head-row">
        <h2>{he ? 'בקרוב' : 'Coming up'}</h2>
        <span className="t-caption">{he ? 'הוצאות קבועות' : 'Recurring expenses'}</span>
      </div>

      <div className="card" style={{ padding: '4px 0' }}>
        {items.map((it, i) => (
          <motion.div
            key={it.key}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05, duration: 0.25 }}
            style={{
              display: 'flex', alignItems: 'center', gap: 11, padding: '12px 16px',
              borderBottom: i < items.length - 1 ? '1px solid var(--c-sep)' : 'none',
            }}
          >
            <div style={{
              width: 32, height: 32, borderRadius: 'var(--r-sm)', flexShrink: 0,
              background: 'var(--c-primary-light)', color: 'var(--c-primary)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Repeat size={16} strokeWidth={2.2} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--c-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {it.name || t(`categories.${it.category}`)}
              </div>
              <div style={{ fontSize: 12, color: it.daysUntil <= 1 ? 'var(--c-primary)' : 'var(--c-text2)', fontWeight: it.daysUntil <= 1 ? 600 : 400, marginTop: 2 }}>
                {when(it)}
              </div>
            </div>
            <span dir="ltr" className="num" style={{ fontSize: 14, fontWeight: 600, color: 'var(--c-text)' }}>
              {formatAmount(it.amount, cur)}
            </span>
          </motion.div>
        ))}
      </div>
    </div>
  )
}
