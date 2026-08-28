import { useEffect, useState } from 'react'
import { formatAmount } from '../../utils/format'
import CategoryIcon from '../CategoryIcon'

const SIZE = 180
const CX = SIZE / 2
const CY = SIZE / 2
const RADIUS = 68
const STROKE = 16
const CIRCUMFERENCE = 2 * Math.PI * RADIUS
const GAP = 2

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
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 18 }}>
      <div style={{ position: 'relative', width: SIZE, height: SIZE }}>
        <svg width={SIZE} height={SIZE} style={{ transform: 'rotate(-90deg)' }}>
          {/* Background track */}
          <circle cx={CX} cy={CY} r={RADIUS}
            fill="none" stroke="var(--c-bg)" strokeWidth={STROKE} />
          {/* Segments */}
          {drawn.map((seg, i) => (
            <circle key={i} cx={CX} cy={CY} r={RADIUS}
              fill="none"
              stroke={seg.color}
              strokeWidth={STROKE}
              strokeLinecap="butt"
              strokeDasharray={seg.dash}
              strokeDashoffset={seg.dashOffset}
              style={{ transition: `stroke-dasharray 0.7s cubic-bezier(0.4,0,0.2,1) ${i * 0.06}s` }}
            />
          ))}
        </svg>
        {/* Center */}
        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
        }}>
          <div style={{ fontSize: 11.5, color: 'var(--c-text2)', fontWeight: 500, marginBottom: 3 }}>
            {centerLabel}
          </div>
          <div dir="ltr" className="num" style={{ fontSize: 21, fontWeight: 700, letterSpacing: -0.6 }}>
            {formatAmount(total, currency)}
          </div>
        </div>
      </div>

      {/* Legend */}
      <div style={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
        {drawn.map((seg, i) => (
          <div key={i} style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '10px 0',
            borderTop: '1px solid var(--c-sep)',
          }}>
            <div style={{
              width: 26, height: 26, borderRadius: 7, flexShrink: 0,
              background: seg.color + '14', color: seg.color,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <CategoryIcon id={seg.id} size={14} strokeWidth={2} />
            </div>
            <span style={{ flex: 1, fontSize: 13.5, fontWeight: 500 }}>
              {seg.label}
            </span>
            <span className="num" style={{ fontSize: 12.5, color: 'var(--c-text3)', minWidth: 32, textAlign: 'end' }}>
              {seg.pct}%
            </span>
            <span dir="ltr" className="num" style={{ fontSize: 13.5, fontWeight: 600, minWidth: 68, textAlign: 'end' }}>
              {formatAmount(seg.value, currency)}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
