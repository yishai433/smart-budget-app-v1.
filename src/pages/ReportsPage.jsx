import { useState, useMemo, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'
import { useApp } from '../contexts/AppContext'
import BarChart from '../components/charts/BarChart'
import UserAvatar from '../components/UserAvatar'
import { formatMoney, formatAmount } from '../utils/format'
import CategoryIcon from '../components/CategoryIcon'
import SupermarketTrips from '../components/budget/SupermarketTrips'
import MonthSwitcher from '../components/budget/MonthSwitcher'
import CategoryBudgetRows from '../components/budget/CategoryBudgetRows'
import PaceChart from '../components/charts/PaceChart'
import { buildInsights, cumulativeByDay, daysInMonth } from '../utils/insights'
import { monthName } from '../utils/months'
import { Pencil, Check, PieChart, TrendingUp, TrendingDown, Info } from 'lucide-react'

const HE_MONTHS = ['ינואר','פברואר','מרץ','אפריל','מאי','יוני',
                   'יולי','אוגוסט','ספטמבר','אוקטובר','נובמבר','דצמבר']
const EN_MONTHS = ['Jan','Feb','Mar','Apr','May','Jun',
                   'Jul','Aug','Sep','Oct','Nov','Dec']

// The n months ending at endKey ("YYYY-MM"), oldest first
function getLastMonths(n, endKey) {
  const months = []
  const [endY, endM] = endKey.split('-').map(Number)
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(endY, endM - 1 - i, 1)
    months.push({
      key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
      label: EN_MONTHS[d.getMonth()],
      heLabel: HE_MONTHS[d.getMonth()],
      year: d.getFullYear(),
      monthIdx: d.getMonth(),
    })
  }
  return months
}

function SectionCard({ title, subtitle, action, children }) {
  return (
    <div className="card">
      <div style={{ padding: '14px 16px 0' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
          <div>
            <h3 style={{ fontSize: 14.5, fontWeight: 600, letterSpacing: -0.2 }}>{title}</h3>
            {subtitle && (
              <p style={{ fontSize: 12, color: 'var(--c-text2)', marginTop: 2 }}>{subtitle}</p>
            )}
          </div>
          {action}
        </div>
      </div>
      <div style={{ padding: '14px 16px 16px' }}>{children}</div>
    </div>
  )
}

export default function ReportsPage() {
  const { t } = useTranslation()
  const { transactions, CATEGORIES, settings, monthKey, effectiveCategoryBudgets, monthlyBudget, isCurrentMonth } = useApp()
  const cur = settings.currency
  const lang = settings.language || 'he'

  const months = useMemo(() => getLastMonths(6, monthKey), [monthKey])
  const selected = months[months.length - 1] // the month chosen in the switcher
  const [barSelectedIdx, setBarSelectedIdx] = useState(null)
  useEffect(() => { setBarSelectedIdx(null) }, [monthKey])

  const [bigExpenseThreshold, setBigExpenseThreshold] = useState(() => {
    const saved = localStorage.getItem('sb_big_expense_threshold')
    return saved ? parseFloat(saved) : 500
  })
  const [editingThreshold, setEditingThreshold] = useState(false)
  const [thresholdInput, setThresholdInput] = useState(String(bigExpenseThreshold))

  const saveThreshold = () => {
    const val = Math.max(0, parseFloat(thresholdInput) || 0)
    setBigExpenseThreshold(val)
    localStorage.setItem('sb_big_expense_threshold', String(val))
    setEditingThreshold(false)
  }

  // Stats for the current month
  const monthTxs = transactions.filter(t => t.date?.startsWith(selected.key))
  const expenses = monthTxs.filter(t => t.type === 'expense').reduce((s,t) => s + (t.amount||0), 0)

  // Donut segments from expense categories
  const expByCat = monthTxs
    .filter(t => t.type === 'expense')
    .reduce((acc, t) => { acc[t.category] = (acc[t.category]||0) + t.amount; return acc }, {})

  const donutSegments = Object.entries(expByCat)
    .sort(([,a],[,b]) => b - a)
    .map(([catId, value]) => {
      const def = CATEGORIES.expense.find(c => c.id === catId) || { color:'#667085' }
      return { id: catId, label: t(`categories.${catId}`), value, color: def.color }
    })

  // Category rows: everything spent this month, plus categories that have a budget
  const reportRows = [...new Set([...Object.keys(expByCat), ...Object.keys(effectiveCategoryBudgets)])]
    .map(catId => ({ catId, amount: expByCat[catId] || 0 }))
    .sort((a, b) => b.amount - a.amount)

  // Spending pace: cumulative spending per day vs the budget pace (or last month when there's no budget)
  const prevMonthKey = months[months.length - 2]?.key
  const paceRefLabel = monthlyBudget > 0
    ? (lang === 'he' ? 'קצב התקציב' : 'Budget pace')
    : (lang === 'he' ? `ב${monthName(prevMonthKey, lang)}` : monthName(prevMonthKey, lang))
  const paceData = useMemo(() => {
    const days = daysInMonth(selected.key)
    const lastDay = isCurrentMonth ? new Date().getDate() : days
    const cum = cumulativeByDay(transactions, selected.key)
    const prevCum = prevMonthKey ? cumulativeByDay(transactions, prevMonthKey) : []
    const hasPrev = prevCum.length > 0 && prevCum[prevCum.length - 1] > 0
    if (cum[days - 1] === 0 && !(monthlyBudget > 0)) return []
    return Array.from({ length: days }, (_, i) => {
      const day = i + 1
      let ref = null
      if (monthlyBudget > 0) ref = Math.round((monthlyBudget * day) / days)
      else if (hasPrev) ref = prevCum[Math.min(day, prevCum.length) - 1]
      return { day, spent: day <= lastDay ? cum[i] : null, ref }
    })
  }, [transactions, selected.key, prevMonthKey, monthlyBudget, isCurrentMonth])

  // Automatic insights vs the previous month
  const insights = useMemo(() => buildInsights({
    transactions, monthKey: selected.key, isCurrentMonth, lang, cur,
    catName: id => t(`categories.${id}`),
  }), [transactions, selected.key, isCurrentMonth, lang, cur, t])

  // Bar chart data: last 6 months
  const barData = months.map(m => {
    const txs = transactions.filter(t => t.date?.startsWith(m.key))
    return {
      label: lang === 'he' ? m.heLabel.slice(0, 4) : m.label.slice(0, 3),
      income:  txs.filter(t => t.type==='income').reduce((s,t) => s+(t.amount||0), 0),
      expense: txs.filter(t => t.type==='expense').reduce((s,t) => s+(t.amount||0), 0),
    }
  })

  const bigExpenses = monthTxs
    .filter(t => t.type === 'expense' && t.amount >= bigExpenseThreshold)
    .sort((a,b) => b.amount - a.amount)

  return (
    <div className="page">
      {/* Header — compact, light */}
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h1 className="page-title">{lang === 'he' ? 'דוחות' : 'Reports'}</h1>
          <UserAvatar />
        </div>
        <MonthSwitcher style={{ marginTop: 14 }} />
      </div>

      <div style={{ padding: '16px 16px 0', display: 'flex', flexDirection: 'column', gap: 20 }}>

        {/* 1 — Income vs expenses trend, now the first thing on the page */}
        <SectionCard
          title={lang==='he'?'גרפים':'Graphs'}
          subtitle={lang==='he'?'לחץ על חודש לפירוט':'Tap a month for details'}
        >
          <BarChart
            data={barData} currency={cur} lang={lang}
            selectedIdx={barSelectedIdx}
            onBarClick={i => setBarSelectedIdx(prev => prev === i ? null : i)}
          />

          {/* Month detail panel */}
          {barSelectedIdx !== null && (() => {
            const m = months[barSelectedIdx]
            const mTxs = transactions.filter(tx => tx.date?.startsWith(m.key))
            const mIncome = mTxs.filter(tx => tx.type === 'income').reduce((s, tx) => s + (tx.amount||0), 0)
            const mExpense = mTxs.filter(tx => tx.type === 'expense').reduce((s, tx) => s + (tx.amount||0), 0)
            const mBalance = mIncome - mExpense
            const mTitle = lang === 'he'
              ? `${HE_MONTHS[m.monthIdx]} ${m.year}`
              : `${EN_MONTHS[m.monthIdx]} ${m.year}`
            const rows = [
              { label: lang==='he'?'הכנסות':'Income',   value: mIncome,  color: 'var(--c-success)' },
              { label: lang==='he'?'הוצאות':'Expenses', value: mExpense, color: 'var(--c-danger)' },
              { label: lang==='he'?'יתרה':'Balance',    value: mBalance, color: mBalance >= 0 ? 'var(--c-text)' : 'var(--c-danger)' },
            ]
            return (
              <motion.div
                key={barSelectedIdx}
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
                style={{
                  marginTop: 14,
                  border: '1px solid var(--c-border)',
                  borderRadius: 'var(--r-md)',
                  overflow: 'hidden',
                }}
              >
                <div style={{
                  padding: '9px 13px',
                  background: 'var(--c-bg)',
                  borderBottom: '1px solid var(--c-border)',
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                }}>
                  <span style={{ fontWeight: 600, fontSize: 13 }}>{mTitle}</span>
                  <span style={{ fontSize: 11.5, color: 'var(--c-text2)' }}>
                    {mTxs.length} {lang === 'he' ? 'עסקאות' : 'transactions'}
                  </span>
                </div>
                {rows.map((row, ri) => (
                  <div key={row.label} style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '10px 13px',
                    borderBottom: ri < rows.length - 1 ? '1px solid var(--c-sep)' : undefined,
                  }}>
                    <span style={{ fontSize: 13, color: 'var(--c-text2)' }}>{row.label}</span>
                    <span dir="ltr" className="num" style={{
                      fontWeight: 600, fontSize: 14, color: row.color,
                    }}>
                      {formatAmount(Math.abs(row.value), cur)}
                    </span>
                  </div>
                ))}
              </motion.div>
            )
          })()}
        </SectionCard>

        {/* Spending pace through the month */}
        {paceData.length > 0 && (
          <SectionCard
            title={lang==='he'?'קצב הוצאות':'Spending pace'}
            subtitle={monthlyBudget > 0
              ? (lang==='he'?'הוצאות מצטברות מול הקצב שמתאים לתקציב':'Cumulative spending vs the pace your budget allows')
              : (lang==='he'?'הוצאות מצטברות מול החודש הקודם':'Cumulative spending vs last month')}
          >
            <PaceChart data={paceData} currency={cur} lang={lang} refLabel={paceRefLabel} />
          </SectionCard>
        )}

        {/* Automatic insights */}
        {insights.length > 0 && (
          <SectionCard
            title={lang==='he'?'תובנות':'Insights'}
            subtitle={isCurrentMonth
              ? (lang==='he'?'בהשוואה לאותה תקופה בחודש שעבר':'Compared with the same period last month')
              : (lang==='he'?'בהשוואה לחודש הקודם':'Compared with the previous month')}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {insights.map(ins => {
                const Icon = ins.tone === 'up' ? TrendingUp : ins.tone === 'down' ? TrendingDown : Info
                const color = ins.tone === 'up' ? 'var(--c-danger)' : ins.tone === 'down' ? 'var(--c-accent2-dark)' : 'var(--c-text2)'
                return (
                  <div key={ins.id} style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
                    <div style={{
                      width: 30, height: 30, borderRadius: 'var(--r-sm)', flexShrink: 0,
                      background: 'var(--c-bg)', color,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <Icon size={16} strokeWidth={2.2} />
                    </div>
                    <span className="num" style={{ fontSize: 13.5, lineHeight: 1.45, color: 'var(--c-text)' }}>{ins.text}</span>
                  </div>
                )
              })}
            </div>
          </SectionCard>
        )}

        {/* 2 — Expenses by category — bar list, per approved design */}
        {reportRows.length > 0 ? (
          <SectionCard title={lang==='he'?'הוצאות לפי קטגוריה':'Expenses by category'}>
            <div style={{ margin: '-10px -16px -12px' }}>
              <CategoryBudgetRows rows={reportRows} totalExpenses={expenses} />
            </div>
          </SectionCard>
        ) : (
          <div className="card">
            <div className="empty-state" style={{ padding: '40px 24px' }}>
              <div className="empty-icon"><PieChart size={22} strokeWidth={1.8} /></div>
              <h3>{lang==='he'?'אין נתונים לחודש זה':'No data for this month'}</h3>
            </div>
          </div>
        )}

        {/* 3 — Insights: big expenses */}
        <div>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 8, padding: '0 4px' }}>
            <div>
              <div style={{ fontSize: 14.5, fontWeight: 600, letterSpacing: -0.2 }}>
                {lang==='he'?'הוצאות גדולות':'Big expenses'}
              </div>
              {editingThreshold ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6 }}>
                  <input
                    className="input-field"
                    type="text"
                    inputMode="decimal"
                    autoFocus
                    value={thresholdInput}
                    onChange={e => setThresholdInput(e.target.value.replace(/[^0-9.]/g, ''))}
                    onKeyDown={e => e.key === 'Enter' && saveThreshold()}
                    style={{ width: 76, height: 30, fontSize: 13, fontWeight: 600, textAlign: 'center', padding: '0 6px', lineHeight: '30px' }}
                  />
                  <button
                    onClick={saveThreshold}
                    style={{
                      background: 'var(--c-primary)', border: 'none', borderRadius: 8,
                      width: 30, height: 30, cursor: 'pointer', color: 'white',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                    }}
                  >
                    <Check size={15} strokeWidth={2.5} />
                  </button>
                </div>
              ) : (
                <div dir="ltr" className="num" style={{ fontSize: 12, color: 'var(--c-text2)', marginTop: 2, textAlign: 'start' }}>
                  &gt; {formatAmount(bigExpenseThreshold, cur)}
                </div>
              )}
            </div>
            {!editingThreshold && (
              <button
                onClick={() => { setThresholdInput(String(bigExpenseThreshold)); setEditingThreshold(true) }}
                className="btn-icon"
                style={{ width: 30, height: 30, borderRadius: 8, background: 'var(--c-primary-light)', border: 'none', color: 'var(--c-primary)' }}
                aria-label="edit threshold"
              >
                <Pencil size={14} strokeWidth={2} />
              </button>
            )}
          </div>

          {bigExpenses.length > 0 ? (
            <div className="card-list">
              {bigExpenses.map((tx, i) => {
                const def = CATEGORIES.expense.find(c=>c.id===tx.category)||{color:'#667085'}
                return (
                  <motion.div
                    key={tx.id}
                    className="list-item"
                    initial={{ opacity:0, y:6 }}
                    animate={{ opacity:1, y:0 }}
                    transition={{ delay: Math.min(i, 8) * 0.04, duration: 0.22 }}
                    style={{
                      cursor: 'default',
                      borderBottom: i < bigExpenses.length - 1 ? '1px solid var(--c-sep)' : 'none',
                    }}
                  >
                    <div className="list-icon" style={{ background: def.color+'14', color: def.color }}>
                      <CategoryIcon id={tx.category} size={17} strokeWidth={2} />
                    </div>
                    <div style={{ flex:1, minWidth: 0 }}>
                      <div style={{ fontWeight:500, fontSize:14, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
                        {tx.description || t(`categories.${tx.category}`)}
                      </div>
                      <div className="num" style={{ fontSize:12, color:'var(--c-text2)', marginTop: 2 }}>
                        {tx.date}
                      </div>
                    </div>
                    <div dir="ltr" className="num" style={{ fontWeight:600, fontSize: 14.5, color: 'var(--c-danger)' }}>
                      {formatMoney(tx.amount, 'expense', cur)}
                    </div>
                  </motion.div>
                )
              })}
            </div>
          ) : (
            <div className="card">
              <div style={{ textAlign: 'center', color: 'var(--c-text2)', fontSize: 13, padding: '24px 16px' }}>
                {lang==='he'
                  ? `אין הוצאות מעל ${formatAmount(bigExpenseThreshold, cur)} החודש`
                  : `No expenses above ${formatAmount(bigExpenseThreshold, cur)} this month`}
              </div>
            </div>
          )}
        </div>

        {/* 4 — Supermarket trips */}
        <SupermarketTrips cur={cur} />

        <div style={{ height: 4 }} />
      </div>
    </div>
  )
}
