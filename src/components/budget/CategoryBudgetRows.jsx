import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { motion, AnimatePresence } from 'framer-motion'
import { CalendarDays } from 'lucide-react'
import { useApp } from '../../contexts/AppContext'
import { formatAmount } from '../../utils/format'
import { monthLabel } from '../../utils/months'
import CategoryIcon from '../CategoryIcon'
import CategoryBudgetSheet from './CategoryBudgetSheet'

const WARN_COLOR = '#D08A2E' // 80%–100% of the category budget
const WARN_AT = 80

// Expense-category rows with optional per-category budgets.
// rows: [{ catId, amount }] — the caller decides which categories to list.
// Tapping a row opens the budget sheet. Categories with a budget show
// "spent / limit" and a bar that turns amber at 80% and red past 100%;
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
          const warn = hasLimit && !over && usedPct >= WARN_AT
          const barColor = over ? 'var(--c-danger)' : warn ? WARN_COLOR : catDef.color
          const barWidth = hasLimit ? Math.min(usedPct, 100) : sharePct

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
              <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
                <div style={{
                  width: 32, height: 32, borderRadius: 'var(--r-sm)', flexShrink: 0,
                  background: catDef.color + '14', color: catDef.color,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <CategoryIcon id={catId} size={17} strokeWidth={2} />
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 8 }}>
                    <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--c-text)', display: 'flex', alignItems: 'center', gap: 5 }}>
                      {t(`categories.${catId}`)}
                      {overriddenCategoryIds.includes(catId) && (
                        <CalendarDays size={13} strokeWidth={2} color="var(--c-text2)" aria-hidden="true" />
                      )}
                    </span>
                    <span dir="ltr" className="num" style={{ fontSize: 14, fontWeight: 600, color: over ? 'var(--c-danger)' : 'var(--c-text)' }}>
                      {money(amount)}{hasLimit && <span style={{ color: 'var(--c-text3)', fontWeight: 500 }}> / {money(limit)}</span>}
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 7 }}>
                    <div className="progress-bar" style={{ flex: 1, height: 4 }}>
                      <motion.div
                        className="progress-fill"
                        style={{ background: barColor }}
                        initial={{ width: 0 }}
                        animate={{ width: `${barWidth}%` }}
                        transition={{ duration: 0.5, ease: 'easeOut' }}
                      />
                    </div>
                    {!hasLimit && (
                      <span className="num" style={{
                        fontSize: 11.5, color: 'var(--c-text3)', fontWeight: 500,
                        minWidth: 30, textAlign: 'end',
                      }}>
                        {Math.round(sharePct)}%
                      </span>
                    )}
                  </div>

                  {hasLimit && (
                    <div className="num" style={{
                      fontSize: 11.5, marginTop: 5, fontWeight: over ? 600 : 500,
                      color: over ? 'var(--c-danger)' : 'var(--c-text2)',
                    }}>
                      {over
                        ? (he ? `חריגה של ${money(amount - limit)}` : `Over by ${money(amount - limit)}`)
                        : (he ? `נשארו ${money(limit - amount)}` : `${money(limit - amount)} left`)}
                    </div>
                  )}
                </div>
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
