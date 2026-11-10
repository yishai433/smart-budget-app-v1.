import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Bell, ChevronDown } from 'lucide-react'
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
              <ActivityRows items={unseenActivity} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
