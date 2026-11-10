import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Check, X } from 'lucide-react'
import { useApp } from '../../contexts/AppContext'

// First steps for a new account: set a budget, add a first expense, invite a
// partner. Each row ticks itself when done; the card disappears when all are
// done or when it is closed.
export default function GettingStarted() {
  const navigate = useNavigate()
  const { currentMonthlyBudget, transactions, household, settings } = useApp()
  const [, force] = useState(0)
  let dismissed = false
  try { dismissed = localStorage.getItem('sb_start_dismissed') === '1' } catch {}
  if (dismissed || !household) return null
  const he = (settings.language || 'he') === 'he'

  const steps = [
    { id: 'budget', done: currentMonthlyBudget != null, label: he ? 'קבעו תקציב חודשי' : 'Set a monthly budget', hint: he ? 'בהגדרות' : 'In Settings', go: () => navigate('/settings') },
    { id: 'tx', done: transactions.length > 0, label: he ? 'הוסיפו הוצאה ראשונה' : 'Add your first expense', hint: he ? 'בכפתור הפלוס למטה' : 'With the plus button below' },
    { id: 'invite', done: (household.members || []).length > 1, label: he ? 'הזמינו בן זוג או שותף' : 'Invite a partner or flatmate', hint: he ? 'בהגדרות, קוד הזמנה' : 'In Settings, invite code', go: () => navigate('/settings') },
  ]
  const left = steps.filter(s => !s.done).length
  if (left === 0) return null
  const close = () => { try { localStorage.setItem('sb_start_dismissed', '1') } catch {} ; force(n => n + 1) }

  return (
    <div style={{ padding: '14px 16px 0' }}>
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px' }}>
          <div style={{ flex: 1, fontSize: 14, fontWeight: 700 }}>
            {he ? `מתחילים: נשארו ${left} צעדים` : `Getting started: ${left} step${left === 1 ? '' : 's'} left`}
          </div>
          <button className="btn-icon" style={{ width: 30, height: 30 }} onClick={close} aria-label={he ? 'סגור' : 'Close'}>
            <X size={16} strokeWidth={2} />
          </button>
        </div>
        {steps.map(s => (
          <button key={s.id} onClick={s.done ? undefined : s.go} disabled={s.done || !s.go}
            style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', background: 'none', border: 'none', borderTop: '1px solid var(--c-sep)', font: 'inherit', color: 'var(--c-text)', textAlign: 'start', cursor: !s.done && s.go ? 'pointer' : 'default' }}>
            <span style={{ width: 22, height: 22, borderRadius: '50%', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: s.done ? 'var(--c-primary)' : 'transparent', border: s.done ? 'none' : '1.5px solid var(--c-border)', color: '#fff' }}>
              {s.done && <Check size={14} strokeWidth={3} />}
            </span>
            <span style={{ flex: 1, minWidth: 0 }}>
              <span style={{ display: 'block', fontSize: 14, fontWeight: 500, textDecoration: s.done ? 'line-through' : 'none', color: s.done ? 'var(--c-text3)' : 'var(--c-text)' }}>{s.label}</span>
              {!s.done && <span style={{ display: 'block', fontSize: 12, color: 'var(--c-text2)', marginTop: 1 }}>{s.hint}</span>}
            </span>
            {!s.done && s.go && <span style={{ color: 'var(--c-text3)', fontSize: 18 }}>›</span>}
          </button>
        ))}
      </div>
    </div>
  )
}
