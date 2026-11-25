import { useEffect, useState } from 'react'
import { Server } from 'lucide-react'
import InfoHeading, { InfoRow } from './InfoHeading'
import { useApp } from '../contexts/AppContext'
import { db } from '../firebase'
import { doc, setDoc } from 'firebase/firestore'
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
  const { user, household, activeHouseholdId } = useApp()
  const [support, setSupport] = useState('checking')
  const [on, setOn] = useState(!!currentToken() && permissionState() === 'granted')
  const [prefs, setPrefs] = useState({ unusual: true, budget: true })
  const [bigInput, setBigInput] = useState('150')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')

  useEffect(() => { pushSupport().then(setSupport) }, [])
  useEffect(() => { if (user?.uid) loadPrefs(user.uid).then(setPrefs) }, [user?.uid])
  useEffect(() => { setBigInput(String(household?.bigExpenseAmount > 0 ? household.bigExpenseAmount : 150)) }, [household?.bigExpenseAmount])
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
  const setPref = (k, v) => { const p = { ...prefs, [k]: v }; setPrefs(p); savePrefs(user.uid, p).catch(() => {}) }
  // One amount for the whole account (shared or not).
  const saveBig = (n) => {
    if (!activeHouseholdId) return
    setDoc(doc(db, 'households', activeHouseholdId), { bigExpenseAmount: n }, { merge: true }).catch(() => setMsg('שמירת הסכום נכשלה.'))
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
      <InfoHeading tip={'כשזה דלוק, תקבל הודעה לטלפון כש: נרשמה הוצאה גדולה (לפי הסכום שבחרת), קטגוריה מתקרבת לסוף התקציב או עוברת אותו, מגיע סיכום ההוצאות, או נרשמה הוצאה קבועה אוטומטית. את ההוצאות שרשמת בעצמך לא תקבל בהודעה.'}>
        התראות מהשרת
      </InfoHeading>
      <div className="card" style={{ marginBottom: 20 }}>
        <div className="card-inner" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <InfoRow
            icon={<Server size={16} strokeWidth={2} style={{ color: 'var(--c-text2)' }} />}
            label="התראות במכשיר הזה"
            sub="גם כשהאפליקציה סגורה"
            tip="מפעיל או מכבה את כל ההתראות שמגיעות מהשרת, רק במכשיר הזה. בכל מכשיר אפשר לבחור לבד."
          >
            <Switch checked={on} disabled={!can || busy} onChange={toggle} />
          </InfoRow>

          {note && <div style={{ fontSize: 12.5, color: 'var(--c-text2)', lineHeight: 1.5 }}>{note}</div>}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 14, opacity: on ? 1 : 0.5 }}>
            <InfoRow label="הוצאה גדולה שאחר מהבית רשם"
              tip="כשמישהו אחר מהבית רושם הוצאה גדולה, תקבל הודעה. הוצאות שרשמת בעצמך לא יישלחו אליך.">
              <Switch checked={prefs.unusual} disabled={!on} onChange={v => setPref('unusual', v)} />
            </InfoRow>
            <div className="input-group" style={{ marginTop: -4 }}>
              <label className="input-label">סכום הוצאה גדולה לחשבון</label>
              <div style={{ fontSize: 12, color: 'var(--c-text2)' }}>כל הוצאה מעל הסכום הזה נחשבת "הוצאה גדולה", ואם ההתראות דלוקות תקבל עליה הודעה.</div>
              <input
                className="input-field" type="number" inputMode="decimal" min="1" disabled={!on}
                value={bigInput}
                onChange={e => setBigInput(e.target.value)}
                onBlur={() => { const n = parseFloat(bigInput); if (n > 0) saveBig(n); else setBigInput(String(household?.bigExpenseAmount > 0 ? household.bigExpenseAmount : 150)) }}
              />
            </div>
            <InfoRow label="התקרבות לתקציב או חריגה ממנו"
              tip="הודעה כשקטגוריה מגיעה ל-80% מהתקציב שלה, ועוד אחת כשהיא עוברת אותו.">
              <Switch checked={prefs.budget} disabled={!on} onChange={v => setPref('budget', v)} />
            </InfoRow>
            <InfoRow label="סיכום שבועי וסיכום חודשי"
              tip="סיכום קצר של ההוצאות: ביום ראשון בבוקר על השבוע שעבר, ובתחילת כל חודש על החודש שעבר.">
              <Switch checked={prefs.summary !== false} disabled={!on} onChange={v => setPref('summary', v)} />
            </InfoRow>
            <InfoRow label="קצב הוצאות גבוה וקטגוריה שקפצה"
              tip="הודעה כשההוצאות החודש מתקדמות מהר מהתקציב, או כשקטגוריה הוצאה הרבה יותר מהרגיל.">
              <Switch checked={prefs.pace !== false} disabled={!on} onChange={v => setPref('pace', v)} />
            </InfoRow>
            <InfoRow label="הוצאה קבועה שנרשמה אוטומטית"
              tip="הודעה כשהוצאה קבועה, למשל מנוי, נרשמת לבד בתאריך שלה.">
              <Switch checked={prefs.recurring !== false} disabled={!on} onChange={v => setPref('recurring', v)} />
            </InfoRow>
            <InfoRow label="הוצאה כפולה חשודה"
              tip="הודעה כשנרשמות שתי הוצאות זהות, באותו סכום ובאותה קטגוריה, בהפרש של כמה דקות. כך אפשר לתפוס רישום כפול.">
              <Switch checked={prefs.duplicate !== false} disabled={!on} onChange={v => setPref('duplicate', v)} />
            </InfoRow>
          </div>
          {msg && <div style={{ fontSize: 12.5, color: 'var(--c-primary-dark)' }}>{msg}</div>}
        </div>
      </div>
    </>
  )
}
