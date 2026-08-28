import { useState, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'
import { useApp } from '../contexts/AppContext'
import DonutChart from '../components/charts/DonutChart'
import BarChart from '../components/charts/BarChart'
import UserAvatar from '../components/UserAvatar'
import { formatMoney, formatAmount, formatNumber } from '../utils/format'
import CategoryIcon from '../components/CategoryIcon'
import SupermarketTrips from '../components/budget/SupermarketTrips'
import { ChevronLeft, ChevronRight, Pencil, Check, PieChart } from 'lucide-react'

const HE_MONTHS = ['ינואר','פברואר','מרץ','אפריל','מאי','יוני',
                   'יולי','אוגוסט','ספטמבר','אוקטובר','נובמבר','דצמבר']
const EN_MONTHS = ['Jan','Feb','Mar','Apr','May','Jun',
                   'Jul','Aug','Sep','Oct','Nov','Dec']

function getLastMonths(n) {
  const months = []
  const now = new Date()
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
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
  const { transactions, CATEGORIES, settings } = useApp()
  const cur = settings.currency
  const lang = settings.language || 'he'

  const months = useMemo(() => getLastMonths(6), [])
  const [selectedIdx, setSelectedIdx] = useState(months.length - 1)
  const selected = months[selectedIdx]
  const [barSelectedIdx, setBarSelectedIdx] = useState(null)

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

  // Stats for selected month
  const monthTxs = transactions.filter(t => t.date?.startsWith(selected.key))
  const income   = monthTxs.filter(t => t.type === 'income').reduce((s,t) => s + (t.amount||0), 0)
  const expenses = monthTxs.filter(t => t.type === 'expense').reduce((s,t) => s + (t.amount||0), 0)
  const balance  = income - expenses
  const savingsRate = income > 0 ? Math.round((balance / income) * 100) : 0

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

  // Bar chart data: last 6 months
  const barData = months.map(m => {
    const txs = transactions.filter(t => t.date?.startsWith(m.key))
    return {
      label: lang === 'he' ? m.heLabel.slice(0, 4) : m.label.slice(0, 3),
      income:  txs.filter(t => t.type==='income').reduce((s,t) => s+(t.amount||0), 0),
      expense: txs.filter(t => t.type==='expense').reduce((s,t) => s+(t.amount||0), 0),
    }
  })

  const monthTitle = lang === 'he'
    ? `${HE_MONTHS[selected.monthIdx]} ${selected.year}`
    : `${EN_MONTHS[selected.monthIdx]} ${selected.year}`

  const bigExpenses = monthTxs
    .filter(t => t.type === 'expense' && t.amount >= bigExpenseThreshold)
    .sort((a,b) => b.amount - a.amount)

  const atStart = selectedIdx === 0
  const atEnd = selectedIdx === months.length - 1

  return (
    <div className="page">
      {/* Header — compact, light */}
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h1 className="page-title">{lang === 'he' ? 'דוחות' : 'Reports'}</h1>
          <UserAvatar />
        </div>
      </div>

      <div style={{ padding: '16px 16px 0', display: 'flex', flexDirection: 'column', gap: 20 }}>

        {/* 1+2 — Ink hero: month selector + balance + inline income/expense */}
        <motion.div
          className="hero-ink"
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 280, damping: 28 }}
        >
          {/* Month selector */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <button
              onClick={() => setSelectedIdx(i => Math.max(0, i - 1))}
              disabled={atStart}
              style={{
                width: 30, height: 30, borderRadius: 8, border: 'none', cursor: 'pointer',
                background: 'rgba(255,255,255,0.08)', color: 'white',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                opacity: atStart ? 0.3 : 1,
              }}
              aria-label="previous month"
            >
              {lang === 'he' ? <ChevronRight size={17} /> : <ChevronLeft size={17} />}
            </button>
            <span style={{ fontWeight: 600, fontSize: 14, color: 'white' }}>{monthTitle}</span>
            <button
              onClick={() => setSelectedIdx(i => Math.min(months.length - 1, i + 1))}
              disabled={atEnd}
              style={{
                width: 30, height: 30, borderRadius: 8, border: 'none', cursor: 'pointer',
                background: 'rgba(255,255,255,0.08)', color: 'white',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                opacity: atEnd ? 0.3 : 1,
              }}
              aria-label="next month"
            >
              {lang === 'he' ? <ChevronLeft size={17} /> : <ChevronRight size={17} />}
            </button>
          </div>

          {/* Balance for the month */}
          <div className="t-overline" style={{ color: 'var(--c-ink-text2)', textAlign: 'center' }}>
            {lang==='he'?'יתרה':'Balance'}
          </div>
          <div dir="ltr" className="t-display" style={{
            color: balance >= 0 ? 'white' : '#FDA29B', textAlign: 'center', marginTop: 6,
          }}>
            <span className="cur" style={{ fontSize: 22 }}>{balance < 0 ? '−' : ''}{cur}</span>
            {formatNumber(balance)}
          </div>

          {/* Inline income / expense / savings */}
          <div style={{
            display: 'flex', marginTop: 18, paddingTop: 16,
            borderTop: '1px solid var(--c-ink-line)',
          }}>
            {[
              { label: lang==='he'?'הכנסות':'Income',   val: formatAmount(income, cur),   c: '#32D583' },
              { label: lang==='he'?'הוצאות':'Expenses', val: formatAmount(expenses, cur), c: '#FDA29B' },
              { label: lang==='he'?'חיסכון':'Saved',    val: `${savingsRate}%`,           c: '#32D583' },
            ].map((s, i) => (
              <div key={s.label} style={{
                flex: 1, textAlign: 'center',
                borderInlineStart: i > 0 ? '1px solid var(--c-ink-line)' : 'none',
              }}>
                <div style={{ fontSize: 11, color: 'var(--c-ink-text2)', fontWeight: 500 }}>{s.label}</div>
                <div dir="ltr" className="num" style={{ fontSize: 14, fontWeight: 600, color: s.c, marginTop: 4 }}>
                  {s.val}
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* 3 — Expenses by category */}
        {donutSegments.length > 0 ? (
          <SectionCard title={lang==='he'?'הוצאות לפי קטגוריה':'Expenses by category'}>
            <DonutChart
              segments={donutSegments}
              currency={cur}
              centerLabel={lang==='he'?'סה״כ':'Total'}
            />
          </SectionCard>
        ) : (
          <div className="card">
            <div className="empty-state" style={{ padding: '40px 24px' }}>
              <div className="empty-icon"><PieChart size={22} strokeWidth={1.8} /></div>
              <h3>{lang==='he'?'אין נתונים לחודש זה':'No data for this month'}</h3>
            </div>
          </div>
        )}

        {/* 4 — Income vs expenses trend */}
        <SectionCard
          title={lang==='he'?'טרנד 6 חודשים':'6-month trend'}
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

        {/* 5 — Insights: big expenses */}
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

        {/* 6 — Supermarket trips */}
        <SupermarketTrips cur={cur} />

        <div style={{ height: 4 }} />
      </div>
    </div>
  )
}
