import { useTranslation } from 'react-i18next'
import { useApp } from '../../contexts/AppContext'
import { formatAmount } from '../../utils/format'
import { monthLabel } from '../../utils/months'

// Rows for change-log entries (what changed, before ← after, who and when).
// Used by the "what's new" card and the full history in Settings.
export default function ActivityRows({ items, showSelf = false }) {
  const { t } = useTranslation()
  const { settings, user, avatarUrl, members } = useApp()
  const he = (settings.language || 'he') === 'he'
  const nameOf = (uid) => members.find(m => m.uid === uid)?.firstName || (he ? 'בן בית' : 'Member')
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
      case 'settle': return { icon: '⇄', text: he ? `${nameOf(a.from)} החזיר/ה ל${nameOf(a.to)} ${money(a.amount)}` : `${nameOf(a.from)} paid back ${nameOf(a.to)} ${money(a.amount)}` }
      default: return { icon: '•', text: a.kind }
    }
  }
  const when = (at) => new Date(at).toLocaleString(he ? 'he-IL' : 'en-GB', { day: 'numeric', month: 'numeric', hour: '2-digit', minute: '2-digit' })

  // avatar saved with the entry; older entries fall back to the known profiles
  const avatarOf = (a) => a.avatar
    || (a.by === user?.uid ? avatarUrl : members.find(m => m.uid === a.by)?.avatarUrl || null)

  return items.map(a => {
    const d = describe(a)
    const who = showSelf && a.by === user?.uid ? (he ? 'אתה' : 'You') : ((a.name || '').trim().split(/\s+/)[0] || (he ? 'בן בית' : 'Member'))
    const img = avatarOf(a)
    return (
      <div key={a.id} style={{ display: 'flex', gap: 12, padding: '10px 14px', borderTop: '1px solid var(--c-sep)', alignItems: 'flex-start' }}>
        <div style={{ width: 52, flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
          {img ? (
            <img src={img} alt="" style={{ width: 34, height: 34, borderRadius: '50%', objectFit: 'cover', background: 'var(--c-primary-light)' }} />
          ) : (
            <div style={{ width: 34, height: 34, borderRadius: '50%', background: 'var(--c-primary-light)', color: 'var(--c-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 15 }}>
              {(who || '?').trim().charAt(0).toUpperCase()}
            </div>
          )}
          <div style={{ fontSize: 11, color: 'var(--c-text2)', maxWidth: 52, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{who}</div>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13.5, color: 'var(--c-text)' }}>{d.text}</div>
          {d.detail && <div style={{ fontSize: 12, color: 'var(--c-text2)', marginTop: 2 }}>{d.detail}</div>}
          <div style={{ fontSize: 11.5, color: 'var(--c-text3)', marginTop: 3 }}>{when(a.at)}</div>
        </div>
      </div>
    )
  })
}
