import { useTranslation } from 'react-i18next'
import { useApp } from '../../contexts/AppContext'
import { formatAmount } from '../../utils/format'
import { monthLabel } from '../../utils/months'

// Rows for change-log entries (what changed, before ← after, who and when).
// Used by the "what's new" card and the full history in Settings.
export default function ActivityRows({ items, showSelf = false }) {
  const { t } = useTranslation()
  const { settings, user } = useApp()
  const he = (settings.language || 'he') === 'he'
  const cur = settings.currency
  const money = (n) => formatAmount(n || 0, cur)
  const cat = (id) => t(`categories.${id}`)
  const label = (x) => x.description || cat(x.category)
  const FIELD = he
    ? { amount: 'סכום', category: 'קטגוריה', description: 'תיאור', date: 'תאריך', type: 'סוג' }
    : { amount: 'Amount', category: 'Category', description: 'Description', date: 'Date', type: 'Type' }
  const fmtField = (k, v) =>
    k === 'amount' ? money(v)
    : k === 'category' ? cat(v)
    : k === 'type' ? (v === 'income' ? (he ? 'הכנסה' : 'Income') : (he ? 'הוצאה' : 'Expense'))
    : (v || '—')

  const describe = (a) => {
    switch (a.kind) {
      case 'add': return { icon: '＋', text: `${he ? 'נוספה' : 'Added'} ${label(a.after)} · ${money(a.after.amount)}` }
      case 'delete': return { icon: '✕', text: `${he ? 'נמחקה' : 'Deleted'} ${label(a.before)} · ${money(a.before.amount)}` }
      case 'edit': {
        const changes = Object.keys(a.after).filter(k => a.after[k] !== a.before[k])
          .map(k => `${FIELD[k] || k}: ${fmtField(k, a.before[k])} ← ${fmtField(k, a.after[k])}`)
        return { icon: '✎', text: `${he ? 'עודכנה' : 'Edited'} ${label(a.before)}`, detail: changes.join(' · ') }
      }
      case 'goalAdd': return { icon: '🎯', text: `${he ? 'יעד חיסכון חדש' : 'New savings goal'}: ${a.goal?.name} (${money(a.goal?.target)})` }
      case 'goalDeposit': return { icon: '🎯', text: `${a.delta > 0 ? (he ? 'הפקדה ליעד' : 'Deposit to') : (he ? 'משיכה מיעד' : 'Withdrawal from')} ${a.goal?.name}: ${money(Math.abs(a.delta))}` }
      case 'goalDelete': return { icon: '🎯', text: `${he ? 'יעד נמחק' : 'Goal deleted'}: ${a.goal?.name}` }
      case 'budget': return {
        icon: '₪',
        text: `${he ? 'תקציב חודשי' : 'Monthly budget'} ${monthLabel(a.month, he ? 'he' : 'en')}`,
        detail: `${a.before == null ? '—' : money(a.before)} ← ${money(a.after)}`,
      }
      default: return { icon: '•', text: a.kind }
    }
  }
  const when = (at) => new Date(at).toLocaleString(he ? 'he-IL' : 'en-GB', { day: 'numeric', month: 'numeric', hour: '2-digit', minute: '2-digit' })

  return items.map(a => {
    const d = describe(a)
    const who = showSelf && a.by === user?.uid ? (he ? 'אתה' : 'You') : (a.name || (he ? 'בן בית' : 'Member'))
    return (
      <div key={a.id} style={{ display: 'flex', gap: 10, padding: '10px 14px', borderTop: '1px solid var(--c-sep)' }}>
        <span style={{ width: 18, textAlign: 'center', color: 'var(--c-text3)' }}>{d.icon}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13.5, color: 'var(--c-text)' }}>{d.text}</div>
          {d.detail && <div style={{ fontSize: 12, color: 'var(--c-text2)', marginTop: 2 }}>{d.detail}</div>}
          <div style={{ fontSize: 11.5, color: 'var(--c-text3)', marginTop: 2 }}>{who} · {when(a.at)}</div>
        </div>
      </div>
    )
  })
}
