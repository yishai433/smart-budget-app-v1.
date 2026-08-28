import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { useApp } from '../../contexts/AppContext'
import { useEffect, useRef, useState } from 'react'
import { ArrowDownLeft, ArrowUpRight, PiggyBank } from 'lucide-react'

function AnimatedNumber({ value }) {
  const [display, setDisplay] = useState(0)
  const raf = useRef(null)
  const prev = useRef(0)

  useEffect(() => {
    const start = prev.current
    const end = value
    prev.current = value
    if (start === end) return
    const duration = 550
    const startTime = performance.now()
    const tick = (now) => {
      const p = Math.min((now - startTime) / duration, 1)
      const eased = 1 - Math.pow(1 - p, 3)
      setDisplay(Math.round(start + (end - start) * eased))
      if (p < 1) raf.current = requestAnimationFrame(tick)
    }
    raf.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf.current)
  }, [value])

  return <>{display.toLocaleString()}</>
}

function Stat({ icon: Icon, label, value, cur, tone, raw }) {
  const color =
    tone === 'income' ? 'var(--c-success)' :
    tone === 'expense' ? 'var(--c-danger)' :
    'var(--c-primary)'
  const tint =
    tone === 'income' ? 'var(--c-success-light)' :
    tone === 'expense' ? 'var(--c-danger-light)' :
    'var(--c-primary-light)'

  return (
    <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 7 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <div style={{
          width: 22, height: 22, borderRadius: 6, flexShrink: 0,
          background: tint, color,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Icon size={13} strokeWidth={2.2} />
        </div>
        <span style={{ fontSize: 12, color: 'var(--c-text2)', fontWeight: 500 }}>{label}</span>
      </div>
      <div dir={raw ? undefined : 'ltr'} className="num" style={{
        fontSize: 16, fontWeight: 600, color, letterSpacing: -0.3,
        textAlign: 'start', whiteSpace: 'nowrap',
      }}>
        {raw ? raw : <>{value < 0 ? '−' : ''}{cur}{Math.abs(value).toLocaleString()}</>}
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
  // Share of income already spent — drives the meter under the hero number
  const spentPct = totalIncome > 0
    ? Math.min(100, Math.round((totalExpenses / totalIncome) * 100))
    : (totalExpenses > 0 ? 100 : 0)
  const savingsRate = totalIncome > 0 ? Math.round((balance / totalIncome) * 100) : 0

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 300, damping: 28 }}
      style={{ padding: '16px 16px 0' }}
    >
      <div className="card">
        <div style={{ padding: '18px 16px 16px' }}>

          {/* Hero — balance for the month */}
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 10 }}>
            <span style={{ fontSize: 13, color: 'var(--c-text2)', fontWeight: 500 }}>
              {lang === 'he' ? 'נשאר החודש' : 'Left this month'}
            </span>
            <span className="badge badge-neutral" style={{ fontSize: 11 }}>
              {lang === 'he' ? `${spentPct}% נוצל` : `${spentPct}% used`}
            </span>
          </div>

          <div dir="ltr" className="amount-xl" style={{
            color: positive ? 'var(--c-text)' : 'var(--c-danger)',
            marginTop: 4,
            textAlign: 'start',
          }}>
            {positive ? '' : '−'}{cur}<AnimatedNumber value={Math.abs(balance)} />
          </div>

          {/* Spend meter */}
          <div className="progress-bar" style={{ marginTop: 14, height: 5 }}>
            <motion.div
              className="progress-fill"
              initial={{ width: 0 }}
              animate={{ width: `${spentPct}%` }}
              transition={{ duration: 0.7, ease: 'easeOut' }}
              style={{ background: spentPct >= 100 ? 'var(--c-danger)' : 'var(--c-primary)' }}
            />
          </div>

          {/* Income / expenses / saved */}
          <div style={{
            display: 'flex', gap: 12, marginTop: 16,
            paddingTop: 16, borderTop: '1px solid var(--c-sep)',
          }}>
            <Stat
              icon={ArrowDownLeft}
              label={t('budget.income')}
              value={totalIncome}
              cur={cur}
              tone="income"
            />
            <div style={{ width: 1, background: 'var(--c-sep)', alignSelf: 'stretch' }} />
            <Stat
              icon={ArrowUpRight}
              label={t('budget.expenses')}
              value={totalExpenses}
              cur={cur}
              tone="expense"
            />
            <div style={{ width: 1, background: 'var(--c-sep)', alignSelf: 'stretch' }} />
            <Stat
              icon={PiggyBank}
              label={lang === 'he' ? 'חיסכון' : 'Saved'}
              raw={`${savingsRate}%`}
              tone="neutral"
            />
          </div>

        </div>
      </div>
    </motion.div>
  )
}
