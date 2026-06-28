import { useEffect, useRef, useState } from 'react'

const SIZE = 200
const CX = SIZE / 2
const CY = SIZE / 2
const RADIUS = 72
const STROKE = 22
const CIRCUMFERENCE = 2 * Math.PI * RADIUS
const GAP = 3

export default function DonutChart({ segments, currency = '₪', centerLabel = '' }) {
  const [animated, setAnimated] = useState(false)
  useEffect(() => { const t = setTimeout(() => setAnimated(true), 80); return () => clearTimeout(t) }, [])

  const total = segments.reduce((s, seg) => s + seg.value, 0)
  if (!total) return null

  // Build segments with correct offsets
  let offset = 0
  const drawn = segments.map(seg => {
    const ratio = seg.value / total
    const len = ratio * (CIRCUMFERENCE - segments.length * GAP)
    const dash = animated ? `${len} ${CIRCUMFERENCE - len}` : `0 ${CIRCUMFERENCE}`
    const dashOffset = -offset
    offset += len + GAP
    return { ...seg, dash, dashOffset, pct: Math.round(ratio * 100) }
  })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
      <div style={{ position: 'relative', width: SIZE, height: SIZE }}>
        <svg width={SIZE} height={SIZE} style={{ transform: 'rotate(-90deg)' }}>
          {/* Background track */}
          <circle cx={CX} cy={CY} r={RADIUS}
            fill="none" stroke="var(--c-sep)" strokeWidth={STROKE} />
          {/* Segments */}
          {drawn.map((seg, i) => (
            <circle key={i} cx={CX} cy={CY} r={RADIUS}
              fill="none"
              stroke={seg.color}
              strokeWidth={STROKE}
              strokeLinecap="round"
              strokeDasharray={seg.dash}
              strokeDashoffset={seg.dashOffset}
              style={{ transition: `stroke-dasharray 0.7s cubic-bezier(0.4,0,0.2,1) ${i * 0.08}s` }}
            />
          ))}
        </svg>
        {/* Center */}
        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
        }}>
          <div style={{ fontSize: 11, color: 'var(--c-text2)', fontWeight: 500, marginBottom: 2 }}>
            {centerLabel}
          </div>
          <div style={{ fontSize: 20, fontWeight: 800, letterSpacing: -0.5 }}>
            {currency}{total.toLocaleString()}
          </div>
        </div>
      </div>

      {/* Legend */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, width: '100%' }}>
        {drawn.map((seg, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 10, height: 10, borderRadius: '50%', background: seg.color, flexShrink: 0 }} />
            <span style={{ flex: 1, fontSize: 13, fontWeight: 500 }}>
              {seg.emoji} {seg.label}
            </span>
            <span style={{ fontSize: 13, color: 'var(--c-text2)' }}>{seg.pct}%</span>
            <span style={{ fontSize: 13, fontWeight: 700 }}>{currency}{seg.value.toLocaleString()}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
