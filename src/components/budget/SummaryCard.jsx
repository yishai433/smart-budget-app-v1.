import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { useApp } from '../../contexts/AppContext'
import { useEffect, useRef, useState } from 'react'

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

export default function SummaryCard() {
  const { t } = useTranslation()
  const { totalIncome, totalExpenses, balance, settings } = useApp()
  const cur = settings.currency

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 280, damping: 26 }}
      style={{ padding: '0 16px', marginTop: '-28px', position: 'relative', zIndex: 10 }}
    >
      <div className="card">

        {/* ── TOP: הוצאות גדול ── */}
        <div style={{
          background: 'linear-gradient(135deg, #0A2E1A 0%, #1B5E38 100%)',
          padding: '22px 20px 26px',
          borderRadius: 'var(--r-lg) var(--r-lg) 0 0',
          color: 'white',
          textAlign: 'center',
        }}>
          <p style={{ fontSize: 13, opacity: 0.65, marginBottom: 6, fontWeight: 500, letterSpacing: 0.5 }}>
            {t('budget.expenses')} — {t('budget.thisMonth')}
          </p>
          <div style={{
            fontSize: 52,
            fontWeight: 800,
            letterSpacing: -2,
            lineHeight: 1,
            color: totalExpenses > 0 ? '#FFFFFF' : 'rgba(255,255,255,0.4)',
          }}>
            {cur}<AnimatedNumber value={totalExpenses} />
          </div>
        </div>

        {/* ── BOTTOM: הוצאות | הכנסות ── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1px 1fr' }}>

          {/* הוצאות */}
          <div style={{ padding: '16px 12px', textAlign: 'center' }}>
            <p style={{ fontSize: 12, color: 'var(--c-text2)', fontWeight: 500, marginBottom: 6 }}>
              {t('budget.expenses')}
            </p>
            <div dir="ltr" style={{ fontSize: 22, fontWeight: 800, color: '#B83030', letterSpacing: -0.5 }}>
              {cur}−<AnimatedNumber value={totalExpenses} />
            </div>
          </div>

          {/* Separator */}
          <div style={{ background: 'var(--c-sep)' }} />

          {/* הכנסות */}
          <div style={{ padding: '16px 12px', textAlign: 'center' }}>
            <p style={{ fontSize: 12, color: 'var(--c-text2)', fontWeight: 500, marginBottom: 6 }}>
              {t('budget.income')}
            </p>
            <div dir="ltr" style={{ fontSize: 22, fontWeight: 800, color: 'var(--c-success)', letterSpacing: -0.5 }}>
              {cur}+<AnimatedNumber value={totalIncome} />
            </div>
          </div>

        </div>
      </div>
    </motion.div>
  )
}
