import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts'
import { formatAmount } from '../../utils/format'

const SPENT = '#c67139'  // terracotta — this month's cumulative spending
const REF = '#8a8272'    // warm gray — the budget pace / last month

function compactNumber(n) {
  if (n >= 1000) return `${(n / 1000).toFixed(n % 1000 === 0 ? 0 : 1)}K`
  return String(Math.round(n))
}

function PaceTooltip({ active, payload, label, currency, lang, refLabel }) {
  if (!active || !payload?.length) return null
  const spent = payload.find(p => p.dataKey === 'spent')?.value
  const ref = payload.find(p => p.dataKey === 'ref')?.value
  return (
    <div style={{
      background: 'var(--c-card)', border: '1px solid var(--c-border)',
      borderRadius: 'var(--r-md)', padding: '11px 14px', boxShadow: 'var(--shadow-lg)',
      direction: lang === 'he' ? 'rtl' : 'ltr', minWidth: 150,
    }}>
      <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 9, color: 'var(--c-text)' }}>
        {lang === 'he' ? `יום ${label}` : `Day ${label}`}
      </div>
      {spent != null && (
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, marginBottom: 6 }}>
          <span style={{ fontSize: 12, color: 'var(--c-text2)' }}>{lang === 'he' ? 'הוצאתם' : 'Spent'}</span>
          <span dir="ltr" style={{ fontSize: 13, fontWeight: 700, color: SPENT }}>{formatAmount(spent, currency)}</span>
        </div>
      )}
      {ref != null && (
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16 }}>
          <span style={{ fontSize: 12, color: 'var(--c-text2)' }}>{refLabel}</span>
          <span dir="ltr" style={{ fontSize: 13, fontWeight: 700, color: REF }}>{formatAmount(ref, currency)}</span>
        </div>
      )}
    </div>
  )
}

// Cumulative spending through the month vs a reference line.
// data: [{ day, spent (null after today), ref (null when there's nothing to compare) }]
export default function PaceChart({ data, currency = '₪', lang = 'he', refLabel }) {
  if (!data?.length) return null
  const maxVal = Math.max(1, ...data.flatMap(d => [d.spent || 0, d.ref || 0]))
  const lastDay = data[data.length - 1].day
  const hasRef = data.some(d => d.ref != null)

  return (
    <div>
      <div style={{ display: 'flex', gap: 16, marginBottom: 14, justifyContent: 'flex-end' }}>
        {[
          { color: SPENT, label: lang === 'he' ? 'הוצאות מצטברות' : 'Spent so far', dashed: false },
          ...(hasRef ? [{ color: REF, label: refLabel, dashed: true }] : []),
        ].map(({ color, label, dashed }) => (
          <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 14, height: 0, borderTop: `2.5px ${dashed ? 'dashed' : 'solid'} ${color}` }} />
            <span style={{ fontSize: 12, color: 'var(--c-text2)', fontWeight: 600 }}>{label}</span>
          </div>
        ))}
      </div>

      <ResponsiveContainer width="100%" height={210}>
        <LineChart data={data} margin={{ top: 4, right: 8, left: 4, bottom: 0 }}>
          <CartesianGrid strokeDasharray="2 4" vertical={false} stroke="var(--c-border)" />
          <XAxis
            dataKey="day"
            axisLine={false}
            tickLine={false}
            ticks={[1, 8, 15, 22, lastDay]}
            tick={{ fontSize: 11.5, fill: 'var(--c-text2)', fontFamily: 'inherit', fontWeight: 600 }}
            dy={6}
          />
          <YAxis
            axisLine={false}
            tickLine={false}
            width={34}
            domain={[0, Math.ceil(maxVal * 1.05)]}
            tickCount={4}
            tickFormatter={compactNumber}
            tick={{ fontSize: 10.5, fill: 'var(--c-text3)', fontFamily: 'inherit' }}
          />
          <Tooltip
            content={(props) => <PaceTooltip {...props} currency={currency} lang={lang} refLabel={refLabel} />}
            cursor={{ stroke: 'var(--c-text)', strokeOpacity: 0.15 }}
          />
          {hasRef && (
            <Line
              type="monotone" dataKey="ref" stroke={REF} strokeWidth={2}
              strokeDasharray="5 5" dot={false} isAnimationActive={false}
            />
          )}
          <Line
            type="monotone" dataKey="spent" stroke={SPENT} strokeWidth={3}
            dot={false} connectNulls={false} animationDuration={600}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
