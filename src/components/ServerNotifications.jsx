import { useEffect, useState } from 'react'
import { Server } from 'lucide-react'
import { useApp } from '../contexts/AppContext'
import {
  pushConfigured, pushSupport, currentToken, permissionState,
  enablePush, disablePush, loadPrefs, savePrefs, requestTestPush,
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
  const [prefs, setPrefs] = useState({ unusual: true, budget: true, bigAmount: 150 })
  const [bigInput, setBigInput] = useState('150')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')

  useEffect(() => { pushSupport().then(setSupport) }, [])
  useEffect(() => { if (user?.uid) loadPrefs(user.uid).then(p => { setPrefs(p); setBigInput(String(p.bigAmount || 150)) }) }, [user?.uid])
  if (!user) return null

  const toggle = async (v) => {
    setBusy(true); setMsg('')
    try {
      if (v) { await enablePush(user.uid); setOn(true); setMsg('ההתראות הופעלו במכשיר הזה. לחץ "שלח בדיקה" כדי לוודא.') }
      else { await disablePush(user.uid); setOn(false) }
    } catch (e) {
      setOn(false)
      setMsg(e.message === 'denied' ? 'ההרשאה נדחתה. אפשר לאשר אותה בהגדרות הדפדפן או המכשיר.'
        : e.message === 'no-vapid' ? 'חסר מפתח VAPID בבנייה של האפליקציה (ראה הוראות ההתקנה).'
        : 'לא הצלחנו להפעיל התראות. נסה שוב.')
    } finally { setBusy(false) }
  }
  const setPref = (k, v) => { const p = { ...prefs, [k]: v }; setPrefs(p); savePrefs(user.uid, p).catch(() => {}) }
  const test = async () => {
    setMsg('')
    try { await requestTestPush(user.uid); setMsg('נשלחה בקשה לשרת. ההתראה אמורה להגיע בתוך שניות.') }
    catch { setMsg('שליחת הבקשה נכשלה.') }
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
      <h3 style={{ fontSize: 13, fontWeight: 600, color: 'var(--c-text2)', padding: '0 4px 8px', letterSpacing: 0.5 }}>
        התראות מהשרת הביתי
      </h3>
      <div className="card" style={{ marginBottom: 20 }}>
        <div className="card-inner" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div className="toggle-wrap">
            <div>
              <div style={{ fontWeight: 600, fontSize: 15, display: 'flex', alignItems: 'center', gap: 7 }}>
                <Server size={16} strokeWidth={2} style={{ color: 'var(--c-text2)' }} />
                התראות במכשיר הזה
              </div>
              <div style={{ fontSize: 12, color: 'var(--c-text2)', marginTop: 2 }}>
                הוצאות גדולות וחריגה מהתקציב, גם כשהאפליקציה סגורה
              </div>
            </div>
            <Switch checked={on} disabled={!can || busy} onChange={toggle} />
          </div>

          {note && <div style={{ fontSize: 12.5, color: 'var(--c-text2)', lineHeight: 1.5 }}>{note}</div>}

          {on && (
            <>
              <div className="toggle-wrap">
                <div style={{ fontSize: 14 }}>הוצאה גדולה שאחר מהבית רשם</div>
                <Switch checked={prefs.unusual} onChange={v => setPref('unusual', v)} />
              </div>
              {prefs.unusual && (
                <div className="input-group" style={{ marginTop: -4 }}>
                  <label className="input-label">התראה כשהוצאה מגיעה לסכום הזה או עוברת אותו</label>
                  <input
                    className="input-field" type="number" inputMode="decimal" min="1"
                    value={bigInput}
                    onChange={e => setBigInput(e.target.value)}
                    onBlur={() => { const n = parseFloat(bigInput); if (n > 0) setPref('bigAmount', n); else setBigInput(String(prefs.bigAmount || 150)) }}
                  />
                </div>
              )}
              <div className="toggle-wrap">
                <div style={{ fontSize: 14 }}>התקרבות לתקציב או חריגה ממנו</div>
                <Switch checked={prefs.budget} onChange={v => setPref('budget', v)} />
              </div>
              <button className="btn btn-secondary" onClick={test} style={{ alignSelf: 'flex-start' }}>שלח בדיקה</button>
            </>
          )}
          {msg && <div style={{ fontSize: 12.5, color: 'var(--c-primary-dark)' }}>{msg}</div>}
        </div>
      </div>
    </>
  )
}
