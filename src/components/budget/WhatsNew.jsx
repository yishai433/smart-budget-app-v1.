import { useState } from 'react'
import { Bell } from 'lucide-react'
import { useApp } from '../../contexts/AppContext'
import ActivityRows from './ActivityRows'

// "What's new" — changes other household members made since this user last
// dismissed the card. Renders nothing when there is nothing from others.
export default function WhatsNew() {
  const { unseenActivity, markActivitySeen, settings } = useApp()
  const [open, setOpen] = useState(false)
  const he = (settings.language || 'he') === 'he'
  if (unseenActivity.length === 0) return null

  const names = [...new Set(unseenActivity.map(a => (a.name || '').trim().split(/\s+/)[0] || (he ? 'בן בית' : 'A member')))]
  const count = unseenActivity.length
  const title = he
    ? `${names.join(', ')} ${count === 1 ? 'ביצע/ה שינוי' : `ביצעו ${count} שינויים`} מאז הביקור האחרון`
    : `${names.join(', ')}: ${count} change${count === 1 ? '' : 's'} since your last visit`

  const LIMIT = 4
  const shown = open ? unseenActivity : unseenActivity.slice(0, LIMIT)
  const more = unseenActivity.length - LIMIT

  return (
    <div style={{ padding: '14px 16px 0' }}>
      <div className="card" style={{ padding: 0, overflow: 'hidden', border: '1px solid var(--c-primary)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px' }}>
          <div style={{ width: 32, height: 32, borderRadius: 'var(--r-sm)', background: 'var(--c-primary-light)', color: 'var(--c-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Bell size={16} strokeWidth={2.2} />
          </div>
          <div style={{ flex: 1, minWidth: 0, fontSize: 14, fontWeight: 600, color: 'var(--c-text)' }}>{title}</div>
          <button className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: 13 }} onClick={markActivitySeen}>
            {he ? 'הבנתי' : 'Got it'}
          </button>
        </div>
        <ActivityRows items={shown} />
        {more > 0 && (
          <button onClick={() => setOpen(o => !o)} style={{ width: '100%', padding: '10px 14px', background: 'none', border: 'none', borderTop: '1px solid var(--c-sep)', color: 'var(--c-primary)', font: 'inherit', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
            {open ? (he ? 'הצג פחות' : 'Show less') : (he ? `הצג עוד ${more}` : `Show ${more} more`)}
          </button>
        )}
      </div>
    </div>
  )
}
