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

const INC = '#12B76A'
const EXP = '#F04438'

function ChartTooltip({ active, payload, label, currency, lang }) {
  if (!active || !payload?.length) return null
  const income  = payload.find(p => p.dataKey === 'income')
  const expense = payload.find(p => p.dataKey === 'expense')
  return (
    <div style={{
      background: 'var(--c-card)',
      border: '1px solid var(--c-border)',
      borderRadius: 'var(--r-md)',
      padding: '10px 13px',
      boxShadow: 'var(--shadow-lg)',
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
      <div style={{ display: 'flex', gap: 14, marginBottom: 12, justifyContent: 'flex-end' }}>
        {[
          { color: INC, label: lang === 'he' ? 'הכנסות' : 'Income' },
          { color: EXP, label: lang === 'he' ? 'הוצאות' : 'Expenses' },
        ].map(({ color, label }) => (
          <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 8, height: 8, borderRadius: 2, background: color }} />
            <span style={{ fontSize: 11.5, color: 'var(--c-text2)', fontWeight: 500 }}>{label}</span>
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
            strokeDasharray="2 4"
            vertical={false}
            stroke="var(--c-border)"
          />
          <XAxis
            dataKey="label"
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 11, fill: 'var(--c-text3)', fontFamily: 'inherit' }}
            dy={4}
          />
          <YAxis hide />
          <Tooltip
            content={(props) => <ChartTooltip {...props} currency={currency} lang={lang} />}
            cursor={{ fill: 'var(--c-text)', opacity: 0.04 }}
          />
          <Bar
            dataKey="income"
            radius={[3, 3, 0, 0]}
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
            radius={[3, 3, 0, 0]}
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
