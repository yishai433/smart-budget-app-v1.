import { useState, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'
import { useApp } from '../contexts/AppContext'
import DonutChart from '../components/charts/DonutChart'
import BarChart from '../components/charts/BarChart'
import UserAvatar from '../components/UserAvatar'
import { formatMoney, formatAmount } from '../utils/format'

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
      <div style={{ fontSize: 20, fontWeight: 800, color, letterSpacing: -0.5 }}>
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
      label: lang === 'he' ? m.heLabel.slice(0,3) : m.label,
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
            <h3 style={{ fontWeight: 700, fontSize: 16, marginBottom: 16 }}>
              {lang==='he'?'טרנד 6 חודשים':'6-Month Trend'}
            </h3>
            <BarChart data={barData} currency={cur} lang={lang} />
          </div>
        </div>

        {/* Top expenses list */}
        {monthTxs.filter(t=>t.type==='expense').length > 0 && (
          <div>
            <h3 style={{ fontWeight: 700, fontSize: 16, marginBottom: 10 }}>
              {lang==='he'?'הוצאות גדולות':'Top Expenses'}
            </h3>
            <div className="card-list">
              {monthTxs
                .filter(t => t.type === 'expense')
                .sort((a,b) => b.amount - a.amount)
                .slice(0, 5)
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
                      <div className="list-icon" style={{ background: def.color+'20' }}>
                        {def.emoji}
                      </div>
                      <div style={{ flex:1 }}>
                        <div style={{ fontWeight:600, fontSize:14 }}>
                          {tx.description || tx.category}
                        </div>
                        <div style={{ fontSize:12, color:'var(--c-text2)' }}>{tx.date}</div>
                      </div>
                      <div style={{ fontWeight:700, color:'var(--c-danger)' }}>
                        {formatMoney(tx.amount, 'expense', cur)}
                      </div>
                    </motion.div>
                  )
                })
              }
            </div>
          </div>
        )}

        <div style={{ height: 8 }} />
      </div>
    </div>
  )
}
