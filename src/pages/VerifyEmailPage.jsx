import { useEffect, useState } from 'react'
import { sendEmailVerification } from 'firebase/auth'
import { Mail } from 'lucide-react'
import { auth } from '../firebase'
import { useApp } from '../contexts/AppContext'

const COOLDOWN = 60

// Shown to a new account until it confirms its email address.
export default function VerifyEmailPage() {
  const { user, logout, refreshVerification } = useApp()
  const [cool, setCool] = useState(0)
  const [msg, setMsg] = useState('')
  const [checking, setChecking] = useState(false)

  // Re-check quietly: when the person comes back from the mail app, and every few seconds.
  useEffect(() => {
    const check = () => { refreshVerification().catch(() => {}) }
    const id = setInterval(check, 4000)
    const onVis = () => { if (document.visibilityState === 'visible') check() }
    document.addEventListener('visibilitychange', onVis)
    return () => { clearInterval(id); document.removeEventListener('visibilitychange', onVis) }
  }, [refreshVerification])

  useEffect(() => {
    if (cool <= 0) return
    const id = setTimeout(() => setCool(c => c - 1), 1000)
    return () => clearTimeout(id)
  }, [cool])

  const resend = async () => {
    setMsg('')
    try {
      auth.languageCode = 'he'
      await sendEmailVerification(auth.currentUser)
      setCool(COOLDOWN)
      setMsg('שלחנו מייל חדש.')
    } catch (e) {
      setMsg(e.code === 'auth/too-many-requests' ? 'נשלחו יותר מדי מיילים. נסה שוב בעוד כמה דקות.' : 'השליחה נכשלה. נסה שוב.')
    }
  }

  const confirmed = async () => {
    setChecking(true); setMsg('')
    try {
      const ok = await refreshVerification()
      if (!ok) setMsg('המייל עדיין לא אושר. לחץ על הקישור שבמייל ואז נסה שוב.')
    } catch { setMsg('הבדיקה נכשלה. בדוק את החיבור ונסה שוב.') }
    setChecking(false)
  }

  return (
    <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24, background: 'var(--c-bg)', textAlign: 'center', gap: 14 }}>
      <div style={{ width: 60, height: 60, borderRadius: 18, background: 'var(--c-primary-light)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Mail size={28} color="var(--c-primary)" strokeWidth={2} />
      </div>
      <h1 style={{ fontSize: 22, fontWeight: 700 }}>אשר את כתובת המייל</h1>
      <p style={{ color: 'var(--c-text2)', fontSize: 14.5, lineHeight: 1.6, maxWidth: 340 }}>
        שלחנו קישור אישור אל<br /><b dir="ltr" style={{ color: 'var(--c-text)' }}>{user?.email}</b><br />
        לחץ עליו כדי להמשיך. אם לא הגיע, בדוק גם בתיקיית הספאם.
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, width: '100%', maxWidth: 320, marginTop: 6 }}>
        <button className="btn btn-primary" onClick={confirmed} disabled={checking}>
          {checking ? 'בודק...' : 'אישרתי, המשך'}
        </button>
        <button className="btn btn-secondary" onClick={resend} disabled={cool > 0}>
          {cool > 0 ? `שלח שוב (${cool})` : 'שלח מייל שוב'}
        </button>
        <button onClick={logout} style={{ background: 'none', border: 'none', color: 'var(--c-text2)', fontSize: 13.5, padding: 8, cursor: 'pointer' }}>
          התחבר עם חשבון אחר
        </button>
      </div>
      {msg && <div style={{ fontSize: 13, color: 'var(--c-primary-dark)' }}>{msg}</div>}
    </div>
  )
}
