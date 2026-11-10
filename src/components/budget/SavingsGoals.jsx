import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { CheckCircle2, Plus } from 'lucide-react'
import { useApp } from '../../contexts/AppContext'
import { formatAmount } from '../../utils/format'
import { monthLabel } from '../../utils/months'
import SavingsGoalSheet from './SavingsGoalSheet'

// Savings goals section on the budget page. Tap a goal to deposit / withdraw / delete it.
export default function SavingsGoals() {
  const { savingsGoals, addSavingsGoal, addToSavingsGoal, deleteSavingsGoal, settings, currentMonthKey } = useApp()
  const cur = settings.currency
  const lang = settings.language || 'he'
  const he = lang === 'he'
  const [sheet, setSheet] = useState(null) // null | 'new' | goalId

  const money = (v) => formatAmount(v, cur)
  const activeGoal = sheet && sheet !== 'new' ? savingsGoals.find(g => g.id === sheet) : null

  // Months from now until the goal month (at least 1)
  const monthsLeft = (date) => {
    const [ty, tm] = date.split('-').map(Number)
    const [cy, cm] = currentMonthKey.split('-').map(Number)
    return Math.max(1, (ty - cy) * 12 + (tm - cm))
  }

  return (
    <div style={{ padding: '26px 16px 0' }}>
      <div className="section-head-row">
        <h2>{he ? 'יעדי חיסכון' : 'Savings goals'}</h2>
        <button
          onClick={() => setSheet('new')}
          className="btn-icon"
          style={{ width: 32, height: 32 }}
          aria-label={he ? 'יעד חדש' : 'New goal'}
        >
          <Plus size={18} strokeWidth={2.2} />
        </button>
      </div>

      {savingsGoals.length === 0 ? (
        <div className="card" style={{ padding: '18px 16px', textAlign: 'center' }}>
          <p style={{ fontSize: 14, fontWeight: 500, color: 'var(--c-text)' }}>
            {he ? 'התחילו לחסוך ליעד הראשון' : 'Start saving toward your first goal'}
          </p>
          <p style={{ fontSize: 12.5, color: 'var(--c-text2)', marginTop: 4 }}>
            {he ? 'חופשה, קרן חירום, מחשב חדש. הפקדות ליעד לא נחשבות הוצאה.' : "A trip, an emergency fund, a new laptop. Deposits don't count as spending."}
          </p>
          <button className="btn btn-primary" onClick={() => setSheet('new')} style={{ marginTop: 12 }}>
            {he ? 'יעד חדש' : 'New goal'}
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {savingsGoals.map((g, i) => {
            const pct = g.target > 0 ? Math.min(100, (g.saved / g.target) * 100) : 0
            const done = g.saved >= g.target
            return (
              <motion.div
                key={g.id}
                role="button"
                tabIndex={0}
                className="card"
                onClick={() => setSheet(g.id)}
                onKeyDown={e => (e.key === 'Enter' || e.key === ' ') && setSheet(g.id)}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
                style={{ padding: '13px 15px', cursor: 'pointer' }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 }}>
                  <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--c-text)' }}>{g.name}</span>
                  <span dir="ltr" className="num" style={{ fontSize: 14, fontWeight: 600, color: 'var(--c-text)' }}>
                    {money(g.saved)} <span style={{ color: 'var(--c-text3)', fontWeight: 500 }}>/ {money(g.target)}</span>
                  </span>
                </div>

                <div className="progress-bar" style={{ height: 6, marginTop: 9 }}>
                  <motion.div
                    className="progress-fill"
                    style={{ background: done ? 'var(--c-accent2-dark)' : g.color }}
                    initial={{ width: 0 }}
                    animate={{ width: `${pct}%` }}
                    transition={{ duration: 0.6, ease: 'easeOut' }}
                  />
                </div>

                <div className="num" style={{ fontSize: 11.5, marginTop: 7, color: 'var(--c-text2)' }}>
                  {done ? (
                    <span style={{ color: 'var(--c-accent2-dark)', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                      <CheckCircle2 size={14} strokeWidth={2.2} />
                      {he ? 'היעד הושג' : 'Goal reached'}
                    </span>
                  ) : (
                    <>
                      {he ? `חסרים ${money(g.target - g.saved)}` : `${money(g.target - g.saved)} to go`}
                      {g.date && (
                        <span style={{ color: 'var(--c-text3)' }}>
                          {' · '}
                          {he
                            ? `${money(Math.ceil((g.target - g.saved) / monthsLeft(g.date)))} בחודש עד ${monthLabel(g.date, lang)}`
                            : `${money(Math.ceil((g.target - g.saved) / monthsLeft(g.date)))}/month by ${monthLabel(g.date, lang)}`}
                        </span>
                      )}
                    </>
                  )}
                </div>
              </motion.div>
            )
          })}
        </div>
      )}

      <AnimatePresence>
        {sheet && (sheet === 'new' || activeGoal) && (
          <SavingsGoalSheet
            key={sheet}
            goal={activeGoal}
            currentMonthKey={currentMonthKey}
            lang={lang}
            cur={cur}
            onCreate={(goal) => { addSavingsGoal(goal); setSheet(null) }}
            onChange={(delta) => { addToSavingsGoal(activeGoal.id, delta); setSheet(null) }}
            onDelete={() => { deleteSavingsGoal(activeGoal.id); setSheet(null) }}
            onClose={() => setSheet(null)}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
