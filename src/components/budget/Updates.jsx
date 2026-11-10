import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown } from 'lucide-react'
import { useApp } from '../../contexts/AppContext'
import { budgetAlerts, monthSummary, prevKeyOf } from '../../utils/alerts'
import { getUpcomingRecurring } from '../../utils/recurring'
import WhatsNew from './WhatsNew'
import BudgetAlerts from './BudgetAlerts'
import MonthSummary from './MonthSummary'
import UpcomingRecurring from './UpcomingRecurring'
import GettingStarted from './GettingStarted'

const read = (k) => { try { return localStorage.getItem(k) } catch { return null } }

// One mustard line on the home screen that gathers everything new: changes by
// other members, budget alerts, last month's summary, recurring expenses due
// soon and first steps. Tapping it opens the cards themselves.
export default function Updates() {
  const app = useApp()
  const { settings, unseenActivity, transactions, monthKey, currentMonthKey, isCurrentMonth, effectiveCategoryBudgets, monthlyBudget, household, recurringOff, recurringStopped, currentMonthlyBudget } = app
  const [open, setOpen] = useState(false)
  const he = (settings.language || 'he') === 'he'

  const parts = []
  if (unseenActivity.length > 0) {
    const names = [...new Set(unseenActivity.map(a => (a.name || '').trim().split(/\s+/)[0]).filter(Boolean))]
    parts.push(he ? `${names.join(', ') || 'בן בית'}: ${unseenActivity.length} שינויים` : `${names.join(', ') || 'A member'}: ${unseenActivity.length} changes`)
  }
  if (isCurrentMonth) {
    const alerts = budgetAlerts({ transactions, monthKey, categoryBudgets: effectiveCategoryBudgets, monthlyBudget })
    const sig = `${monthKey}:${alerts.map(a => `${a.id}-${a.level}`).join(',')}`
    if (alerts.length > 0 && read('sb_alerts_dismissed') !== sig) {
      const over = alerts.filter(a => a.level === 'over').length
      parts.push(over > 0 ? (he ? `${over} חריגות מתקציב` : `${over} over budget`) : (he ? 'מתקרבים לתקציב' : 'Nearing a budget'))
    }
    const prevKey = prevKeyOf(currentMonthKey)
    if (new Date().getDate() <= 10 && read('sb_summary_seen') !== prevKey &&
        monthSummary({ transactions, monthKey: prevKey, monthlyBudget: household?.monthlyBudgets?.[prevKey] ?? null })) {
      parts.push(he ? 'סיכום החודש הקודם' : "Last month's summary")
    }
    const upcoming = getUpcomingRecurring(transactions, new Date(), 7, { stopped: recurringStopped, includeToday: recurringOff })
    if (upcoming.length > 0) parts.push(he ? `${upcoming.length} הוצאות קבועות בקרוב` : `${upcoming.length} recurring due soon`)
    if (read('sb_start_dismissed') !== '1' && household &&
        (currentMonthlyBudget == null || transactions.length === 0 || (household.members || []).length < 2)) {
      parts.push(he ? 'צעדים ראשונים' : 'First steps')
    }
  }
  if (parts.length === 0) return null

  return (
    <div style={{ padding: '12px 16px 0' }}>
      <button
        onClick={() => setOpen(o => !o)}
        aria-expanded={open}
        style={{
          width: '100%', minHeight: 50, border: 'none', borderRadius: 'var(--r-md)',
          background: 'var(--c-accent2-light)', color: 'var(--c-text)', font: 'inherit',
          display: 'flex', alignItems: 'center', gap: 10, padding: '11px 16px', textAlign: 'start', cursor: 'pointer',
        }}
      >
        <span className="num" style={{ minWidth: 22, height: 22, borderRadius: 11, background: 'var(--c-accent2)', color: '#2A2006', fontSize: 12, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          {parts.length}
        </span>
        <span style={{ flex: 1, minWidth: 0, fontSize: 14, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {parts.join(' · ')}
        </span>
        <ChevronDown size={17} strokeWidth={2.2} style={{ flexShrink: 0, transform: open ? 'rotate(180deg)' : 'none', transition: 'transform .2s' }} />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22 }} style={{ overflow: 'hidden', margin: '0 -16px' }}
          >
            <GettingStarted />
            <WhatsNew />
            <BudgetAlerts />
            <MonthSummary />
            <UpcomingRecurring />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
