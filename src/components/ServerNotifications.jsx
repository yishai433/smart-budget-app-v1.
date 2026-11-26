import { useEffect, useState } from 'react'
import { Server } from 'lucide-react'
import InfoHeading, { InfoRow } from './InfoHeading'
import { useApp } from '../contexts/AppContext'
import {
  pushConfigured, pushSupport, currentToken, permissionState,
  enablePush, disablePush, loadPrefs, savePrefs,
} from '../utils/push'

function Switch({ checked, onChange, disabled }) {
  return (
    <label className="toggle" style={disabled ? { opacity: 0.5 } : undefined}>
      <input type="checkbox" checked={checked} disabled={disabled} onChange={e => onChange(e.target.checked)} />
      <div className="toggle-track" />
      <div className="toggle-thumb" />
    </label>
  )
}

// Settings card: turn on notifications from the home server for THIS device.
export default function ServerNotifications() {
  const { user } = useApp()
  const [support, setSupport] = useState('checking')
  const [on, setOn] = useState(!!currentToken() && permissionState() === 'granted')
  const [prefs, setPrefs] = useState({ unusual: true, budget: true })
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')

  useEffect(() => { pushSupport().then(setSupport) }, [])
  useEffect(() => { if (user?.uid) loadPrefs(user.uid).then(setPrefs) }, [user?.uid])
  if (!user) return null

  const toggle = async (v) => {
    setBusy(true); setMsg('')
    try {
      if (v) { await enablePush(user.uid); setOn(true)
        const all = { unusual: true, budget: true, summary: true, pace: true, recurring: true, duplicate: true }
        setPrefs(all); savePrefs(user.uid, all).catch(() => {})
        setMsg('ההתראות הופעלו במכשיר הזה. אפשר לכבות כל סוג בנפרד.') }
      else { await disablePush(user.uid); setOn(false) }
    } catch (e) {
      setOn(false)
      setMsg(e.message === 'denied' ? 'ההרשאה נדחתה. אפשר לאשר אותה בהגדרות הדפדפן או המכשיר.'
        : e.message === 'no-vapid' ? 'חסר מפתח VAPID בבנייה של האפליקציה (ראה הוראות ההתקנה).'
        : 'לא הצלחנו להפעיל התראות. נסה שוב.')
    } finally { setBusy(false) }
  }
  const blocked = permissionState() === 'denied'
  const note =
    !pushConfigured() ? 'ההתראות מהשרת עדיין לא הוגדרו באפליקציה.'
    : support === 'ios-install' ? 'באייפון צריך קודם להוסיף את האפליקציה למסך הבית (שיתוף ← הוסף למסך הבית) ולפתוח אותה משם.'
    : support === 'unsupported' ? 'הדפדפן הזה לא תומך בהתראות.'
    : blocked ? 'ההתראות חסומות במכשיר. אפשר לאשר אותן בהגדרות הדפדפן.'
    : ''
  const can = pushConfigured() && support === 'ready' && !blocked

  return (
    <>
      <InfoHeading tip="כשזה דלוק, תקבל הודעות לטלפון, גם כשהאפליקציה סגורה, על: הוצאה גדולה שאחר מהבית רשם, התקרבות לתקציב של קטגוריה או חריגה ממנו, סיכום שבועי וחודשי, קצב הוצאות גבוה או קטגוריה שקפצה, הוצאה קבועה שנרשמה אוטומטית והוצאה כפולה חשודה. הוצאות שרשמת בעצמך לא נשלחות אליך. ההגדרה נשמרת לכל מכשיר בנפרד.">
        התראות
      </InfoHeading>
      <div className="card" style={{ marginBottom: 20 }}>
        <div className="card-inner" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <InfoRow
            icon={<Server size={16} strokeWidth={2} style={{ color: 'var(--c-text2)' }} />}
            label="קבלת התראות"
            sub="במכשיר הזה, גם כשהאפליקציה סגורה"
            tip="מפעיל או מכבה את כל ההתראות במכשיר הזה. בכל מכשיר אפשר לבחור לבד."
          >
            <Switch checked={on} disabled={!can || busy} onChange={toggle} />
          </InfoRow>

          {note && <div style={{ fontSize: 12.5, color: 'var(--c-text2)', lineHeight: 1.5 }}>{note}</div>}

          {msg && <div style={{ fontSize: 12.5, color: 'var(--c-primary-dark)' }}>{msg}</div>}
        </div>
      </div>
    </>
  )
}
