import { useApp } from '../../contexts/AppContext'
import { formatAmount } from '../../utils/format'
import { computeNet, simplifyDebts } from '../../utils/split'

// "Who owes whom" — shown when the household splits expenses. Lists the fewest
// payments that even things out; "Paid" records a settlement.
export default function SettleUp() {
  const { splitEnabled, members, transactions, settlements, addSettlement, settings, user } = useApp()
  if (!splitEnabled || members.length < 2) return null
  const he = (settings.language || 'he') === 'he'
  const cur = settings.currency
  const uids = members.map(m => m.uid)
  const debts = simplifyDebts(computeNet(transactions, uids, settlements))
  const name = (uid) => uid === user?.uid ? (he ? 'אני' : 'Me') : (members.find(m => m.uid === uid)?.firstName || (he ? 'בן בית' : 'Member'))
  const line = (d) => {
    if (he) return d.from === user?.uid ? `אני חייב/ת ל${name(d.to)}` : `${name(d.from)} חייב/ת ל${d.to === user?.uid ? 'י' : name(d.to)}`
    return `${name(d.from)} owe${d.from === user?.uid ? '' : 's'} ${name(d.to)}`
  }

  return (
    <div style={{ padding: '26px 16px 0' }}>
      <div className="section-head-row">
        <h2>{he ? 'התחשבנות' : 'Settle up'}</h2>
        <span className="t-caption">{he ? 'הוצאות משותפות' : 'Shared expenses'}</span>
      </div>
      <div className="card" style={{ padding: '4px 0' }}>
        {debts.length === 0 ? (
          <div style={{ padding: '14px 16px', fontSize: 14, color: 'var(--c-text2)' }}>
            {he ? 'אתם מאוזנים, אף אחד לא חייב כלום' : 'All settled, nobody owes anything'}
          </div>
        ) : debts.map((d, i) => (
          <div key={`${d.from}-${d.to}`} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', borderBottom: i < debts.length - 1 ? '1px solid var(--c-sep)' : 'none' }}>
            <div style={{ flex: 1, minWidth: 0, fontSize: 14, fontWeight: 500, color: 'var(--c-text)' }}>{line(d)}</div>
            <span dir="ltr" className="num" style={{ fontSize: 14, fontWeight: 700 }}>{formatAmount(d.amount, cur)}</span>
            <button className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: 13 }} onClick={() => addSettlement(d)}>
              {he ? 'שולם' : 'Paid'}
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
