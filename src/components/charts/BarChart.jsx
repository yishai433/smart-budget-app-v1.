import { useEffect, useState } from 'react'

const W = 320
const H = 160
const PAD = { top: 10, bottom: 28, left: 8, right: 8 }
const CHART_H = H - PAD.top - PAD.bottom
const CHART_W = W - PAD.left - PAD.right
const BAR_RADIUS = 4

export default function BarChart({ data, currency = '₪' }) {
  const [animated, setAnimated] = useState(false)
  useEffect(() => { const t = setTimeout(() => setAnimated(true), 100); return () => clearTimeout(t) }, [])

  if (!data?.length) return null

  const maxVal = Math.max(...data.flatMap(d => [d.income, d.expense]), 1)
  const colW = CHART_W / data.length
  const barW = Math.max(10, colW * 0.3)

  const scaleY = (v) => CHART_H - (v / maxVal) * CHART_H

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ overflow: 'visible' }}>
      {/* Y gridlines */}
      {[0, 0.5, 1].map(pct => (
        <line key={pct}
          x1={PAD.left} y1={PAD.top + CHART_H * (1 - pct)}
          x2={W - PAD.right} y2={PAD.top + CHART_H * (1 - pct)}
          stroke="var(--c-sep)" strokeWidth="0.5" strokeDasharray="3,3"
        />
      ))}

      {data.map((d, i) => {
        const cx = PAD.left + i * colW + colW / 2
        const incomeH = animated ? (d.income / maxVal) * CHART_H : 0
        const expenseH = animated ? (d.expense / maxVal) * CHART_H : 0

        return (
          <g key={i}>
            {/* Income bar */}
            <rect
              x={cx - barW - 2}
              y={PAD.top + scaleY(d.income)}
              width={barW}
              height={incomeH}
              rx={BAR_RADIUS}
              fill="#34C759"
              opacity={0.85}
              style={{ transition: `y 0.6s ease ${i * 0.05}s, height 0.6s ease ${i * 0.05}s` }}
            />
            {/* Expense bar */}
            <rect
              x={cx + 2}
              y={PAD.top + scaleY(d.expense)}
              width={barW}
              height={expenseH}
              rx={BAR_RADIUS}
              fill="#D96B6B"
              opacity={0.75}
              style={{ transition: `y 0.6s ease ${i * 0.05}s, height 0.6s ease ${i * 0.05}s` }}
            />
            {/* Month label */}
            <text
              x={cx} y={H - 6}
              textAnchor="middle"
              fontSize="10"
              fill="var(--c-text2)"
              fontFamily="inherit"
            >
              {d.label}
            </text>
          </g>
        )
      })}

      {/* Legend */}
      <g>
        <circle cx={W - 80} cy={8} r={4} fill="#34C759" />
        <text x={W - 73} y={12} fontSize="10" fill="var(--c-text2)" fontFamily="inherit">הכנסות</text>
        <circle cx={W - 36} cy={8} r={4} fill="#D96B6B" />
        <text x={W - 29} y={12} fontSize="10" fill="var(--c-text2)" fontFamily="inherit">הוצאות</text>
      </g>
    </svg>
  )
}
