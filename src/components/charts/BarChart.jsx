import {
  ResponsiveContainer,
  BarChart as ReBarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
} from 'recharts'
import { formatAmount } from '../../utils/format'

const INC = '#7a8a5e'
const EXP = '#c67139'

// Compact axis labels: 12,400 → 12.4K
function compactNumber(n) {
  if (n >= 1000) return `${(n / 1000).toFixed(n % 1000 === 0 ? 0 : 1)}K`
  return String(Math.round(n))
}

function ChartTooltip({ active, payload, label, currency, lang }) {
  if (!active || !payload?.length) return null
  const income  = payload.find(p => p.dataKey === 'income')
  const expense = payload.find(p => p.dataKey === 'expense')
  return (
    <div style={{
      background: 'var(--c-card)',
      border: '1px solid var(--c-border)',
      borderRadius: 'var(--r-md)',
      padding: '11px 14px',
      boxShadow: 'var(--shadow-lg)',
      direction: 'rtl',
      minWidth: 150,
    }}>
      <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 9, color: 'var(--c-text)' }}>
        {label}
      </div>
      {income?.value > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, marginBottom: 6 }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--c-text2)' }}>
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: INC, flexShrink: 0 }} />
            {lang === 'he' ? 'הכנסות' : 'Income'}
          </span>
          <span dir="ltr" style={{ fontSize: 13, fontWeight: 700, color: INC }}>
            {formatAmount(income.value, currency)}
          </span>
        </div>
      )}
      {expense?.value > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--c-text2)' }}>
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: EXP, flexShrink: 0 }} />
            {lang === 'he' ? 'הוצאות' : 'Expenses'}
          </span>
          <span dir="ltr" style={{ fontSize: 13, fontWeight: 700, color: EXP }}>
            {formatAmount(expense.value, currency)}
          </span>
        </div>
      )}
    </div>
  )
}

export default function BarChart({ data, currency = '₪', lang = 'he', onBarClick, selectedIdx }) {
  if (!data?.length) return null

  const maxVal = Math.max(1, ...data.flatMap(d => [d.income || 0, d.expense || 0]))

  return (
    <div>
      {/* Legend — circular swatches, matches the pill aesthetic */}
      <div style={{ display: 'flex', gap: 16, marginBottom: 14, justifyContent: 'flex-end' }}>
        {[
          { color: INC, label: lang === 'he' ? 'הכנסות' : 'Income' },
          { color: EXP, label: lang === 'he' ? 'הוצאות' : 'Expenses' },
        ].map(({ color, label }) => (
          <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 9, height: 9, borderRadius: '50%', background: color }} />
            <span style={{ fontSize: 12, color: 'var(--c-text2)', fontWeight: 600 }}>{label}</span>
          </div>
        ))}
      </div>

      <ResponsiveContainer width="100%" height={210}>
        <ReBarChart
          data={data}
          barGap={4}
          barCategoryGap="30%"
          margin={{ top: 4, right: 4, left: 4, bottom: 0 }}
        >
          <CartesianGrid
            strokeDasharray="2 4"
            vertical={false}
            stroke="var(--c-border)"
          />
          <XAxis
            dataKey="label"
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 11.5, fill: 'var(--c-text2)', fontFamily: 'inherit', fontWeight: 600 }}
            dy={6}
          />
          <YAxis
            axisLine={false}
            tickLine={false}
            width={34}
            domain={[0, maxVal]}
            tickCount={4}
            tickFormatter={compactNumber}
            tick={{ fontSize: 10.5, fill: 'var(--c-text3)', fontFamily: 'inherit' }}
          />
          <Tooltip
            content={(props) => <ChartTooltip {...props} currency={currency} lang={lang} />}
            cursor={{ fill: 'var(--c-text)', opacity: 0.05, radius: 8 }}
          />
          <Bar
            dataKey="income"
            radius={[6, 6, 0, 0]}
            maxBarSize={16}
            background={{ fill: 'var(--c-bg)', radius: 6 }}
            onClick={(_, index) => onBarClick?.(index)}
            style={{ cursor: 'pointer' }}
            animationDuration={550}
          >
            {data.map((_, i) => (
              <Cell
                key={i}
                fill={INC}
                fillOpacity={selectedIdx === null || selectedIdx === i ? 0.9 : 0.32}
              />
            ))}
          </Bar>
          <Bar
            dataKey="expense"
            radius={[6, 6, 0, 0]}
            maxBarSize={16}
            background={{ fill: 'var(--c-bg)', radius: 6 }}
            onClick={(_, index) => onBarClick?.(index)}
            style={{ cursor: 'pointer' }}
            animationDuration={550}
          >
            {data.map((_, i) => (
              <Cell
                key={i}
                fill={EXP}
                fillOpacity={selectedIdx === null || selectedIdx === i ? 0.9 : 0.32}
              />
            ))}
          </Bar>
        </ReBarChart>
      </ResponsiveContainer>
    </div>
  )
}
