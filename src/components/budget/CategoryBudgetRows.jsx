import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { motion, AnimatePresence } from 'framer-motion'
import { CalendarDays } from 'lucide-react'
import { useApp } from '../../contexts/AppContext'
import { formatAmount } from '../../utils/format'
import { monthLabel } from '../../utils/months'
import CategoryBudgetSheet from './CategoryBudgetSheet'

const RING_C = 2 * Math.PI * 19

// Expense-category rows with optional per-category budgets.
// rows: [{ catId, amount }] — the caller decides which categories to list.
// Tapping a row opens the budget sheet. Categories with a budget show
// "spent / limit" and a ring that turns red past 100%;
// the rest show their share of total spending, as before.
export default function CategoryBudgetRows({ rows, totalExpenses }) {
  const { t } = useTranslation()
  const {
    CATEGORIES, settings, monthKey, isCurrentMonth,
    effectiveCategoryBudgets, overriddenCategoryIds, setCategoryBudget,
  } = useApp()
  const cur = settings.currency
  const lang = settings.language || 'he'
  const he = lang === 'he'
  const [sheetCat, setSheetCat] = useState(null)

  const money = (v) => formatAmount(v, cur)
  const anyBudget = Object.keys(effectiveCategoryBudgets).length > 0
  const sheetRow = sheetCat ? rows.find(r => r.catId === sheetCat) : null

  return (
    <>
      <div style={{ padding: '4px 0' }}>
        {rows.map(({ catId, amount }, i) => {
          const catDef = CATEGORIES.expense.find(c => c.id === catId) || { color: '#667085' }
          const limit = effectiveCategoryBudgets[catId] ?? null
          const hasLimit = limit != null
          const sharePct = totalExpenses > 0 ? (amount / totalExpenses) * 100 : 0
          const usedPct = hasLimit ? (amount / limit) * 100 : 0
          const over = hasLimit && amount > limit
          const ringColor = over ? 'var(--c-danger)' : hasLimit ? '#E0B74E' : catDef.color
          const ringPct = hasLimit ? usedPct : sharePct

          return (
            <motion.div
              key={catId}
              role="button"
              tabIndex={0}
              onClick={() => setSheetCat(catId)}
              onKeyDown={e => (e.key === 'Enter' || e.key === ' ') && setSheetCat(catId)}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
              style={{
                padding: '12px 16px', cursor: 'pointer',
                borderBottom: i < rows.length - 1 ? '1px solid var(--c-sep)' : 'none',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ position: 'relative', width: 48, height: 48, flexShrink: 0 }}>
                  <svg width="48" height="48" style={{ transform: 'rotate(-90deg)' }} aria-hidden="true">
                    <circle cx="24" cy="24" r="19" fill="none" stroke="var(--c-sep)" strokeWidth="5" />
                    <motion.circle
                      cx="24" cy="24" r="19" fill="none" stroke={ringColor} strokeWidth="5" strokeLinecap="round"
                      strokeDasharray={RING_C}
                      initial={{ strokeDashoffset: RING_C }}
                      animate={{ strokeDashoffset: RING_C - (Math.min(ringPct, 100) / 100) * RING_C }}
                      transition={{ duration: 0.5, ease: 'easeOut' }}
                    />
                  </svg>
                  <div className="num" style={{
                    position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 11, fontWeight: 700, color: over ? 'var(--c-danger)' : 'var(--c-text)',
                  }}>
                    {Math.round(ringPct)}%
                  </div>
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--c-text)', display: 'flex', alignItems: 'center', gap: 5 }}>
                    {t(`categories.${catId}`)}
                    {overriddenCategoryIds.includes(catId) && (
                      <CalendarDays size={13} strokeWidth={2} color="var(--c-text2)" aria-hidden="true" />
                    )}
                  </div>
                  <div dir="ltr" className="num" style={{ fontSize: 12, color: 'var(--c-text2)', marginTop: 2, textAlign: 'right' }}>
                    {money(amount)}{hasLimit && <> / {money(limit)}</>}
                  </div>
                </div>

                {hasLimit && (
                  <div style={{ textAlign: 'start' }}>
                    <div style={{ fontSize: 11, color: over ? 'var(--c-danger)' : 'var(--c-text2)' }}>
                      {over ? (he ? 'חריגה' : 'Over') : (he ? 'נשארו' : 'Left')}
                    </div>
                    <div dir="ltr" className="num" style={{ fontSize: 15, fontWeight: 700, marginTop: 2, color: over ? 'var(--c-danger)' : 'var(--c-remaining)' }}>
                      {money(Math.abs(limit - amount))}
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          )
        })}
      </div>

      {!anyBudget && (
        <p style={{ fontSize: 12, color: 'var(--c-text3)', textAlign: 'center', padding: '0 16px 12px' }}>
          {he ? 'לחצו על קטגוריה כדי להגדיר לה תקציב' : 'Tap a category to set a budget for it'}
        </p>
      )}

      <AnimatePresence>
        {sheetCat && (
          <CategoryBudgetSheet
            key={sheetCat}
            catId={sheetCat}
            spent={sheetRow?.amount || 0}
            currentLimit={effectiveCategoryBudgets[sheetCat] ?? null}
            hasOverride={overriddenCategoryIds.includes(sheetCat)}
            monthText={monthLabel(monthKey, lang)}
            isCurrentMonth={isCurrentMonth}
            lang={lang}
            cur={cur}
            onSave={(val, onlyThisMonth) => { setCategoryBudget(sheetCat, val, { onlyThisMonth }); setSheetCat(null) }}
            onClear={(onlyThisMonth) => { setCategoryBudget(sheetCat, null, { onlyThisMonth }); setSheetCat(null) }}
            onClose={() => setSheetCat(null)}
          />
        )}
      </AnimatePresence>
    </>
  )
}
