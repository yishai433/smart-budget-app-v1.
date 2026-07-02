import { useState, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'
import { useApp } from '../contexts/AppContext'
import DonutChart from '../components/charts/DonutChart'
import BarChart from '../components/charts/BarChart'
import UserAvatar from '../components/UserAvatar'
import { formatMoney, formatAmount } from '../utils/format'
import CategoryIcon from '../components/CategoryIcon'
import SupermarketTrips from '../components/budget/SupermarketTrips'

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

function StatCard({ label, value, color, currency }) {
  return (
    <div style={{
      background: 'var(--c-card)',
      borderRadius: 'var(--r-md)',
      padding: '14px 16px',
      flex: 1,
      boxShadow: 'var(--shadow-sm)',
    }}>
      <div style={{ fontSize: 12, color: 'var(--c-text2)', marginBottom: 4 }}>{label}</div>
      <div dir="ltr" style={{ fontSize: 20, fontWeight: 800, color, letterSpacing: -0.5 }}>
        {formatAmount(value, currency)}
      </div>
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
      const def = CATEGORIES.expense.find(c => c.id === catId) || { emoji:'📦', color:'#636366' }
      return { label: t(`categories.${catId}`), emoji: def.emoji, value, color: def.color }
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

  return (
    <div className="page">
      {/* Header */}
      <div className="page-header" style={{ paddingBottom: 28 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h1 style={{ fontSize: 28, fontWeight: 800 }}>
            {lang === 'he' ? 'דוחות' : 'Reports'}
          </h1>
          <UserAvatar />
        </div>
      </div>

      <div style={{ padding: '16px 16px 0', display: 'flex', flexDirection: 'column', gap: 20 }}>

        {/* Month selector */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          background: 'var(--c-card)', borderRadius: 'var(--r-lg)',
          padding: '12px 16px', boxShadow: 'var(--shadow-sm)',
        }}>
          <button
            onClick={() => setSelectedIdx(i => Math.max(0, i - 1))}
            disabled={selectedIdx === 0}
            style={{ background:'none', border:'none', fontSize:22, cursor:'pointer',
              opacity: selectedIdx === 0 ? 0.3 : 1, padding: '0 8px' }}
          >
            {lang === 'he' ? '›' : '‹'}
          </button>
          <span style={{ fontWeight: 700, fontSize: 17 }}>{monthTitle}</span>
          <button
            onClick={() => setSelectedIdx(i => Math.min(months.length - 1, i + 1))}
            disabled={selectedIdx === months.length - 1}
            style={{ background:'none', border:'none', fontSize:22, cursor:'pointer',
              opacity: selectedIdx === months.length - 1 ? 0.3 : 1, padding: '0 8px' }}
          >
            {lang === 'he' ? '‹' : '›'}
          </button>
        </div>

        {/* Stats row */}
        <div style={{ display: 'flex', gap: 10 }}>
          <StatCard label={lang==='he'?'הכנסות':'Income'}   value={income}   color="var(--c-success)" currency={cur} />
          <StatCard label={lang==='he'?'הוצאות':'Expenses'} value={expenses} color="var(--c-danger)"  currency={cur} />
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <StatCard label={lang==='he'?'יתרה':'Balance'}      value={balance}  color={balance>=0?'var(--c-success)':'var(--c-danger)'} currency={cur} />
          <div style={{
            background: 'var(--c-card)', borderRadius: 'var(--r-md)',
            padding: '14px 16px', flex: 1, boxShadow: 'var(--shadow-sm)',
          }}>
            <div style={{ fontSize: 12, color: 'var(--c-text2)', marginBottom: 4 }}>
              {lang==='he'?'אחוז חיסכון':'Savings Rate'}
            </div>
            <div style={{ fontSize: 20, fontWeight: 800, color: savingsRate >= 0 ? 'var(--c-blue)' : 'var(--c-danger)', letterSpacing: -0.5 }}>
              {savingsRate}%
            </div>
            <div style={{ marginTop: 6 }}>
              <div style={{ height: 4, background: 'var(--c-sep)', borderRadius: 2 }}>
                <motion.div
                  animate={{ width: `${Math.max(0, Math.min(100, savingsRate))}%` }}
                  transition={{ duration: 0.7, ease: 'easeOut' }}
                  style={{ height: '100%', borderRadius: 2, background: 'var(--c-blue)' }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Donut chart */}
        {donutSegments.length > 0 ? (
          <div className="card">
            <div className="card-inner">
              <h3 style={{ fontWeight: 700, fontSize: 16, marginBottom: 16 }}>
                {lang==='he'?'הוצאות לפי קטגוריה':'Expenses by Category'}
              </h3>
              <DonutChart
                segments={donutSegments}
                currency={cur}
                centerLabel={lang==='he'?'סה"כ הוצאות':'Total expenses'}
              />
            </div>
          </div>
        ) : (
          <div className="empty-state">
            <div className="empty-icon">📊</div>
            <h3>{lang==='he'?'אין נתונים לחודש זה':'No data for this month'}</h3>
          </div>
        )}

        {/* Bar chart - 6 month trend */}
        <div className="card">
          <div className="card-inner">
            <h3 style={{ fontWeight: 700, fontSize: 16, marginBottom: 4 }}>
              {lang==='he'?'טרנד 6 חודשים':'6-Month Trend'}
            </h3>
            <p style={{ fontSize: 12, color: 'var(--c-text2)', marginBottom: 12 }}>
              {lang==='he'?'לחץ על חודש לפירוט':'Tap a month for details'}
            </p>
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
                { label: lang==='he'?'הכנסות':'Income',  value: mIncome,   color: '#30D158', bg: '#30D15814', sign: '+' },
                { label: lang==='he'?'הוצאות':'Expenses', value: mExpense,  color: '#FF453A', bg: '#FF453A14', sign: '-' },
                { label: lang==='he'?'יתרה':'Balance',    value: mBalance,  color: mBalance >= 0 ? '#30D158' : '#FF453A', bg: mBalance >= 0 ? '#30D15814' : '#FF453A14', sign: mBalance >= 0 ? '+' : '-' },
              ]
              return (
                <motion.div
                  key={barSelectedIdx}
                  initial={{ opacity: 0, y: -6, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                  style={{
                    marginTop: 14,
                    background: 'var(--c-bg)',
                    borderRadius: 'var(--r-lg)',
                    overflow: 'hidden',
                    border: '1px solid var(--c-sep)',
                  }}
                >
                  {/* Title bar */}
                  <div style={{
                    padding: '10px 14px',
                    borderBottom: '1px solid var(--c-sep)',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  }}>
                    <span style={{ fontWeight: 700, fontSize: 14 }}>{mTitle}</span>
                    <span style={{ fontSize: 11, color: 'var(--c-text2)' }}>
                      {mTxs.length} {lang === 'he' ? 'עסקאות' : 'transactions'}
                    </span>
                  </div>

                  {/* Stats rows */}
                  {rows.map((row, ri) => (
                    <div key={row.label} style={{
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      padding: '10px 14px',
                      borderBottom: ri < rows.length - 1 ? '1px solid var(--c-sep)' : undefined,
                      background: ri === 2 ? row.bg : undefined,
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{
                          width: 8, height: 8, borderRadius: 2,
                          background: row.color, flexShrink: 0,
                        }} />
                        <span style={{ fontSize: 13, fontWeight: ri === 2 ? 700 : 500 }}>{row.label}</span>
                      </div>
                      <span dir="ltr" style={{
                        fontWeight: 700, fontSize: ri === 2 ? 16 : 14,
                        color: row.color, letterSpacing: -0.3,
                      }}>
                        {row.sign}{cur}{Math.abs(row.value).toLocaleString('he-IL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>
                  ))}
                </motion.div>
              )
            })()}
          </div>
        </div>

        {/* Supermarket trips — last 4 across all months */}
        <SupermarketTrips cur={cur} />

        {/* Big expenses list — user-defined threshold */}
        <div>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 10 }}>
            <div>
              <h3 style={{ fontWeight: 700, fontSize: 16 }}>
                {lang==='he'?'הוצאות גדולות':'Big Expenses'}
              </h3>
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
                    style={{ width: 64, height: 28, fontSize: 13, fontWeight: 700, textAlign: 'center', padding: '0 6px' }}
                  />
                  <button
                    onClick={saveThreshold}
                    style={{
                      background: 'var(--c-primary)', border: 'none', borderRadius: 14,
                      width: 28, height: 28, cursor: 'pointer', color: 'white', fontSize: 13,
                      display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                    }}
                  >✓</button>
                </div>
              ) : (
                <div dir="ltr" style={{ fontSize: 12.5, color: 'var(--c-text2)', marginTop: 2 }}>
                  מעל {cur}{bigExpenseThreshold.toLocaleString('he-IL')}
                </div>
              )}
            </div>
            {!editingThreshold && (
              <button
                onClick={() => { setThresholdInput(String(bigExpenseThreshold)); setEditingThreshold(true) }}
                style={{
                  background: 'var(--c-primary-light)', border: 'none', borderRadius: 16,
                  width: 32, height: 32, cursor: 'pointer', fontSize: 13,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                }}
              >
                ✏️
              </button>
            )}
          </div>

          {monthTxs.filter(t => t.type === 'expense' && t.amount >= bigExpenseThreshold).length > 0 ? (
            <div className="card-list">
              {monthTxs
                .filter(t => t.type === 'expense' && t.amount >= bigExpenseThreshold)
                .sort((a,b) => b.amount - a.amount)
                .map((tx, i) => {
                  const def = CATEGORIES.expense.find(c=>c.id===tx.category)||{emoji:'📦',color:'#636366'}
                  return (
                    <motion.div
                      key={tx.id}
                      className="list-item"
                      initial={{ opacity:0, x:-10 }}
                      animate={{ opacity:1, x:0 }}
                      transition={{ delay: i * 0.05 }}
                      style={{ cursor: 'default' }}
                    >
                      <div className="list-icon" style={{ background: def.color+'20', color: def.color }}>
                        <CategoryIcon id={tx.category} size={20} />
                      </div>
                      <div style={{ flex:1 }}>
                        <div style={{ fontWeight:600, fontSize:14 }}>
                          {tx.description || tx.category}
                        </div>
                        <div style={{ fontSize:12, color:'var(--c-text2)' }}>{tx.date}</div>
                      </div>
                      <div dir="ltr" style={{ fontWeight:700, color:'var(--c-danger)' }}>
                        {formatMoney(tx.amount, 'expense', cur)}
                      </div>
                    </motion.div>
                  )
                })
              }
            </div>
          ) : (
            <div style={{ textAlign: 'center', color: 'var(--c-text2)', fontSize: 13, padding: '20px 0' }}>
              {lang==='he' ? `אין הוצאות מעל ${cur}${bigExpenseThreshold.toLocaleString('he-IL')} החודש` : `No expenses above ${cur}${bigExpenseThreshold} this month`}
            </div>
          )}
        </div>

        <div style={{ height: 8 }} />
      </div>
    </div>
  )
}
