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

const INC = '#34C759'
const EXP = '#FF3B30'

function ChartTooltip({ active, payload, label, currency, lang }) {
  if (!active || !payload?.length) return null
  const income  = payload.find(p => p.dataKey === 'income')
  const expense = payload.find(p => p.dataKey === 'expense')
  return (
    <div style={{
      background: 'var(--c-card)',
      border: '1px solid var(--c-sep)',
      borderRadius: 12,
      padding: '10px 14px',
      boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
      direction: 'rtl',
      minWidth: 145,
    }}>
      <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 8, color: 'var(--c-text)' }}>
        {label}
      </div>
      {income?.value > 0 && (
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, marginBottom: 5 }}>
          <span style={{ fontSize: 12, color: 'var(--c-text2)' }}>
            {lang === 'he' ? 'הכנסות' : 'Income'}
          </span>
          <span dir="ltr" style={{ fontSize: 13, fontWeight: 700, color: INC }}>
            {currency}{income.value.toLocaleString()}
          </span>
        </div>
      )}
      {expense?.value > 0 && (
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16 }}>
          <span style={{ fontSize: 12, color: 'var(--c-text2)' }}>
            {lang === 'he' ? 'הוצאות' : 'Expenses'}
          </span>
          <span dir="ltr" style={{ fontSize: 13, fontWeight: 700, color: EXP }}>
            {currency}{expense.value.toLocaleString()}
          </span>
        </div>
      )}
    </div>
  )
}

export default function BarChart({ data, currency = '₪', lang = 'he', onBarClick, selectedIdx }) {
  if (!data?.length) return null

  return (
    <div>
      {/* Legend */}
      <div style={{ display: 'flex', gap: 14, marginBottom: 14, justifyContent: 'flex-end' }}>
        {[
          { color: INC, label: lang === 'he' ? 'הכנסות' : 'Income' },
          { color: EXP, label: lang === 'he' ? 'הוצאות' : 'Expenses' },
        ].map(({ color, label }) => (
          <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <div style={{ width: 10, height: 10, borderRadius: 3, background: color }} />
            <span style={{ fontSize: 11, color: 'var(--c-text2)', fontWeight: 500 }}>{label}</span>
          </div>
        ))}
      </div>

      <ResponsiveContainer width="100%" height={185}>
        <ReBarChart
          data={data}
          barGap={3}
          barCategoryGap="28%"
          margin={{ top: 4, right: 4, left: 4, bottom: 0 }}
        >
          <CartesianGrid
            strokeDasharray="3 3"
            vertical={false}
            stroke="var(--c-sep)"
            opacity={0.55}
          />
          <XAxis
            dataKey="label"
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 11, fill: 'var(--c-text2)', fontFamily: 'inherit' }}
          />
          <YAxis hide />
          <Tooltip
            content={(props) => <ChartTooltip {...props} currency={currency} lang={lang} />}
            cursor={{ fill: 'var(--c-primary)', opacity: 0.06 }}
          />
          <Bar
            dataKey="income"
            radius={[5, 5, 0, 0]}
            onClick={(_, index) => onBarClick?.(index)}
            style={{ cursor: 'pointer' }}
            animationDuration={550}
          >
            {data.map((_, i) => (
              <Cell
                key={i}
                fill={INC}
                fillOpacity={selectedIdx === null || selectedIdx === i ? 0.85 : 0.3}
              />
            ))}
          </Bar>
          <Bar
            dataKey="expense"
            radius={[5, 5, 0, 0]}
            onClick={(_, index) => onBarClick?.(index)}
            style={{ cursor: 'pointer' }}
            animationDuration={550}
          >
            {data.map((_, i) => (
              <Cell
                key={i}
                fill={EXP}
                fillOpacity={selectedIdx === null || selectedIdx === i ? 0.85 : 0.3}
              />
            ))}
          </Bar>
        </ReBarChart>
      </ResponsiveContainer>
    </div>
  )
}
