import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { useApp } from '../../contexts/AppContext'
import { useEffect, useRef, useState } from 'react'
import { ArrowDownLeft, ArrowUpRight, Wallet } from 'lucide-react'
import { formatNumber, formatAmount } from '../../utils/format'

function AnimatedNumber({ value }) {
  const [display, setDisplay] = useState(0)
  const raf = useRef(null)
  const prev = useRef(0)

  useEffect(() => {
    const start = prev.current
    const end = value
    prev.current = value
    if (start === end) return
    const duration = 600
    const startTime = performance.now()
    const tick = (now) => {
      const p = Math.min((now - startTime) / duration, 1)
      const eased = 1 - Math.pow(1 - p, 3)
      // Settle on the exact value (with cents) on the final frame; count up otherwise
      setDisplay(p >= 1 ? end : start + (end - start) * eased)
      if (p < 1) raf.current = requestAnimationFrame(tick)
    }
    raf.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf.current)
  }, [value])

  return <>{formatNumber(display)}</>
}

// Compact progress ring drawn on the dark hero — reads "month state" instantly.
function StateRing({ pct }) {
  const R = 26
  const C = 2 * Math.PI * R
  const clamped = Math.max(0, Math.min(100, pct))
  const over = pct > 100
  const stroke = over ? '#F97066' : '#32D583'
  return (
    <div style={{ position: 'relative', width: 64, height: 64, flexShrink: 0 }}>
      <svg width="64" height="64" style={{ transform: 'rotate(-90deg)' }}>
        <circle cx="32" cy="32" r={R} fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="6" />
        <motion.circle
          cx="32" cy="32" r={R} fill="none" stroke={stroke} strokeWidth="6" strokeLinecap="round"
          strokeDasharray={C}
          initial={{ strokeDashoffset: C }}
          animate={{ strokeDashoffset: C - (clamped / 100) * C }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
        />
      </svg>
      <div style={{
        position: 'absolute', inset: 0, display: 'flex',
        alignItems: 'center', justifyContent: 'center',
        fontSize: 13, fontWeight: 700, color: 'white',
      }} className="num">
        {clamped}%
      </div>
    </div>
  )
}

function Kpi({ icon: Icon, label, children, tint, color }) {
  return (
    <div className="kpi">
      <div className="kpi-chip" style={{ background: tint, color }}>
        <Icon size={15} strokeWidth={2.2} />
      </div>
      <div>
        <div className="kpi-label">{label}</div>
        <div className="kpi-value" dir="ltr" style={{ color: 'var(--c-text)', textAlign: 'start', marginTop: 2 }}>
          {children}
        </div>
      </div>
    </div>
  )
}

export default function SummaryCard() {
  const { t } = useTranslation()
  const { totalIncome, totalExpenses, balance, settings } = useApp()
  const cur = settings.currency
  const lang = settings.language || 'he'

  const positive = balance >= 0
  const spentPct = totalIncome > 0
    ? Math.round((totalExpenses / totalIncome) * 100)
    : (totalExpenses > 0 ? 100 : 0)
  const savingsRate = totalIncome > 0 ? Math.round((balance / totalIncome) * 100) : 0

  const money = (v) => `${v < 0 ? '−' : ''}${formatAmount(v, cur)}`

  return (
    <div style={{ padding: '16px 16px 0', display: 'flex', flexDirection: 'column', gap: 12 }}>

      {/* Ink hero — balance is unmistakable in one second */}
      <motion.div
        className="hero-ink"
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 280, damping: 28 }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
          <div style={{ minWidth: 0 }}>
            <div className="t-overline" style={{ color: 'var(--c-ink-text2)' }}>
              {lang === 'he' ? 'נשאר החודש' : 'Left this month'}
            </div>
            <div dir="ltr" className="t-display" style={{
              color: positive ? 'var(--c-ink-text)' : '#FDA29B',
              marginTop: 8, textAlign: 'start',
            }}>
              <span className="cur" style={{ fontSize: 24 }}>{positive ? '' : '−'}{cur}</span>
              <AnimatedNumber value={Math.abs(balance)} />
            </div>
          </div>
          <StateRing pct={spentPct} />
        </div>

        {/* Status line: spent X of Y */}
        <div dir="ltr" style={{
          marginTop: 16, paddingTop: 14, borderTop: '1px solid var(--c-ink-line)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          fontSize: 13, color: 'var(--c-ink-text2)',
        }}>
          <span className="num" style={{ direction: 'rtl' }}>
            {lang === 'he' ? 'הוצאת' : 'Spent'} <b style={{ color: '#FDA29B', fontWeight: 600 }}>{money(totalExpenses)}</b>
          </span>
          <span className="num" style={{ direction: 'rtl' }}>
            {lang === 'he' ? 'מתוך' : 'of'} <b style={{ color: 'white', fontWeight: 600 }}>{money(totalIncome)}</b>
          </span>
        </div>
      </motion.div>

      {/* KPI row */}
      <motion.div
        className="kpi-row"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.08, type: 'spring', stiffness: 280, damping: 28 }}
      >
        <Kpi icon={ArrowDownLeft} label={t('budget.income')} tint="var(--c-success-light)" color="var(--c-success)">
          {money(totalIncome)}
        </Kpi>
        <Kpi icon={ArrowUpRight} label={t('budget.expenses')} tint="var(--c-danger-light)" color="var(--c-danger)">
          {money(totalExpenses)}
        </Kpi>
        <Kpi icon={Wallet} label={lang === 'he' ? 'חיסכון' : 'Saved'} tint="var(--c-primary-light)" color="var(--c-primary)">
          <span style={{ color: savingsRate >= 0 ? 'var(--c-primary)' : 'var(--c-danger)' }}>{savingsRate}%</span>
        </Kpi>
      </motion.div>

    </div>
  )
}
