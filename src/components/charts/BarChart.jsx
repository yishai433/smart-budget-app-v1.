import { useEffect, useState } from 'react'

const W = 340
const H = 200
const PAD = { top: 40, bottom: 32, left: 12, right: 12 }
const CHART_H = H - PAD.top - PAD.bottom
const CHART_W = W - PAD.left - PAD.right
const BAR_R = 5
const INC = '#30D158'
const EXP = '#FF453A'

function fmt(v) {
  if (v >= 1000) return `${(v / 1000).toFixed(1)}K`
  return `${Math.round(v)}`
}

export default function BarChart({ data, currency = '₪', lang = 'he', onBarClick, selectedIdx }) {
  const [animated, setAnimated] = useState(false)
  useEffect(() => {
    const t = setTimeout(() => setAnimated(true), 80)
    return () => clearTimeout(t)
  }, [])

  if (!data?.length) return null

  const maxVal = Math.max(...data.flatMap(d => [d.income, d.expense]), 1)
  const colW = CHART_W / data.length
  const barW = Math.max(10, colW * 0.31)
  const gap = 2

  const bh = (v) => animated ? (v / maxVal) * CHART_H : 0
  const by = (v) => PAD.top + CHART_H - bh(v)

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ overflow: 'visible', display: 'block' }}>
      <defs>
        <linearGradient id="grad-inc" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={INC} stopOpacity="1" />
          <stop offset="100%" stopColor={INC} stopOpacity="0.6" />
        </linearGradient>
        <linearGradient id="grad-exp" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={EXP} stopOpacity="1" />
          <stop offset="100%" stopColor={EXP} stopOpacity="0.6" />
        </linearGradient>
      </defs>

      {/* Grid lines */}
      {[0, 0.5, 1].map((pct, pi) => (
        <line key={pi}
          x1={PAD.left} y1={PAD.top + CHART_H * (1 - pct)}
          x2={W - PAD.right} y2={PAD.top + CHART_H * (1 - pct)}
          stroke="var(--c-sep)"
          strokeWidth={pi === 2 ? 1.2 : 0.5}
          strokeDasharray={pi < 2 ? '3,4' : undefined}
          opacity={0.45}
        />
      ))}

      {/* Bars per month */}
      {data.map((d, i) => {
        const cx = PAD.left + i * colW + colW / 2
        const incH = bh(d.income)
        const expH = bh(d.expense)
        const incY = by(d.income)
        const expY = by(d.expense)
        const isSelected = selectedIdx === i
        const hasData = d.income > 0 || d.expense > 0
        const delay = `${i * 0.06}s`
        const trans = `y 0.65s cubic-bezier(.34,1.4,.64,1) ${delay}, height 0.65s cubic-bezier(.34,1.4,.64,1) ${delay}, opacity 0.4s ease ${delay}`

        return (
          <g key={i} onClick={() => onBarClick?.(i)} style={{ cursor: 'pointer' }}>
            {/* Hover/selected column highlight */}
            <rect
              x={PAD.left + i * colW + 1} y={PAD.top - 8}
              width={colW - 2} height={CHART_H + 10}
              rx={10}
              fill="var(--c-primary)"
              opacity={isSelected ? 0.07 : 0}
              style={{ transition: 'opacity 0.2s ease' }}
            />

            {/* Income bar */}
            <rect
              x={cx - barW - gap} y={incY}
              width={barW} height={incH}
              rx={BAR_R}
              fill={isSelected ? 'url(#grad-inc)' : INC}
              opacity={!hasData ? 0 : isSelected ? 1 : 0.65}
              style={{ transition: trans }}
            />

            {/* Expense bar */}
            <rect
              x={cx + gap} y={expY}
              width={barW} height={expH}
              rx={BAR_R}
              fill={isSelected ? 'url(#grad-exp)' : EXP}
              opacity={!hasData ? 0 : isSelected ? 1 : 0.65}
              style={{ transition: trans }}
            />

            {/* Value labels on selected bars */}
            {isSelected && animated && d.income > 0 && (
              <text
                x={cx - gap - barW / 2} y={incY - 4}
                textAnchor="middle" fontSize="8.5" fontWeight="700"
                fill={INC} fontFamily="inherit"
              >
                {currency}{fmt(d.income)}
              </text>
            )}
            {isSelected && animated && d.expense > 0 && (
              <text
                x={cx + gap + barW / 2} y={expY - 4}
                textAnchor="middle" fontSize="8.5" fontWeight="700"
                fill={EXP} fontFamily="inherit"
              >
                {currency}{fmt(d.expense)}
              </text>
            )}

            {/* Month label */}
            <text
              x={cx} y={H - 6}
              textAnchor="middle" fontSize="10.5"
              fill={isSelected ? 'var(--c-primary)' : hasData ? 'var(--c-text)' : 'var(--c-text2)'}
              fontWeight={isSelected ? '700' : hasData ? '600' : '400'}
              fontFamily="inherit"
            >
              {d.label}
            </text>

            {/* Selected dot indicator */}
            {isSelected && (
              <circle cx={cx} cy={H - 1} r={2.5} fill="var(--c-primary)" />
            )}
          </g>
        )
      })}

      {/* Legend — top-left of SVG */}
      <rect x={PAD.left} y={6} width={9} height={9} rx={2.5} fill={INC} opacity={0.9} />
      <text x={PAD.left + 13} y={14} fontSize="10" fill="var(--c-text2)" fontFamily="inherit">
        {lang === 'he' ? 'הכנסות' : 'Income'}
      </text>
      <rect x={PAD.left + 76} y={6} width={9} height={9} rx={2.5} fill={EXP} opacity={0.9} />
      <text x={PAD.left + 90} y={14} fontSize="10" fill="var(--c-text2)" fontFamily="inherit">
        {lang === 'he' ? 'הוצאות' : 'Expenses'}
      </text>
    </svg>
  )
}
