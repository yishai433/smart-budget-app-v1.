import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { Bell, ChevronDown } from 'lucide-react'
import { useApp } from '../../contexts/AppContext'
import { formatAmount } from '../../utils/format'
import { monthLabel } from '../../utils/months'

// "What's new" — changes other household members made since this user last
// dismissed the card. Renders nothing when there is nothing from others.
export default function WhatsNew() {
  const { t } = useTranslation()
  const { unseenActivity, markActivitySeen, settings } = useApp()
  const [open, setOpen] = useState(false)
  const he = (settings.language || 'he') === 'he'
  const cur = settings.currency
  if (unseenActivity.length === 0) return null

  const money = (n) => formatAmount(n || 0, cur)
  const cat = (id) => t(`categories.${id}`)
  const label = (x) => x.description || cat(x.category)
  const FIELD = he
    ? { amount: 'סכום', category: 'קטגוריה', description: 'תיאור', date: 'תאריך', type: 'סוג' }
    : { amount: 'Amount', category: 'Category', description: 'Description', date: 'Date', type: 'Type' }
  const fmtField = (k, v) => k === 'amount' ? money(v) : k === 'category' ? cat(v) : k === 'type' ? (v === 'income' ? (he ? 'הכנסה' : 'Income') : (he ? 'הוצאה' : 'Expense')) : (v || '—')

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
  const names = [...new Set(unseenActivity.map(a => a.name || (he ? 'בן בית' : 'A member')))]
  const count = unseenActivity.length
  const title = he
    ? `${names.join(', ')} ${count === 1 ? 'ביצע/ה שינוי' : `ביצעו ${count} שינויים`} מאז הביקור האחרון`
    : `${names.join(', ')}: ${count} change${count === 1 ? '' : 's'} since your last visit`

  return (
    <div style={{ padding: '14px 16px 0' }}>
      <div className="card" style={{ padding: 0, overflow: 'hidden', border: '1px solid var(--c-primary)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px' }}>
          <div style={{ width: 32, height: 32, borderRadius: 'var(--r-sm)', background: 'var(--c-primary-light)', color: 'var(--c-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Bell size={16} strokeWidth={2.2} />
          </div>
          <button onClick={() => setOpen(o => !o)} style={{ flex: 1, minWidth: 0, textAlign: 'start', background: 'none', border: 'none', padding: 0, color: 'var(--c-text)', font: 'inherit', cursor: 'pointer' }}>
            <div style={{ fontSize: 14, fontWeight: 600 }}>{title}</div>
            <div style={{ fontSize: 12, color: 'var(--c-text2)', marginTop: 2, display: 'flex', alignItems: 'center', gap: 4 }}>
              {open ? (he ? 'הסתר פירוט' : 'Hide details') : (he ? 'הצג מה השתנה' : 'See what changed')}
              <ChevronDown size={13} style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform .2s' }} />
            </div>
          </button>
          <button className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: 13 }} onClick={markActivitySeen}>
            {he ? 'הבנתי' : 'Got it'}
          </button>
        </div>
        <AnimatePresence initial={false}>
          {open && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} style={{ overflow: 'hidden' }}>
              {unseenActivity.map(a => {
                const d = describe(a)
                return (
                  <div key={a.id} style={{ display: 'flex', gap: 10, padding: '10px 14px', borderTop: '1px solid var(--c-sep)' }}>
                    <span style={{ width: 18, textAlign: 'center', color: 'var(--c-text3)' }}>{d.icon}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13.5, color: 'var(--c-text)' }}>{d.text}</div>
                      {d.detail && <div style={{ fontSize: 12, color: 'var(--c-text2)', marginTop: 2 }}>{d.detail}</div>}
                      <div style={{ fontSize: 11.5, color: 'var(--c-text3)', marginTop: 2 }}>{a.name} · {when(a.at)}</div>
                    </div>
                  </div>
                )
              })}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
