import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  updateProfile,
} from 'firebase/auth'
import { auth } from '../firebase'
import { Wallet, Mail, Lock, Eye, EyeOff, User, Home } from 'lucide-react'

// Read invite code from URL hash: #/?invite=XXXXXX
function getInviteFromURL() {
  const hash = window.location.hash
  if (!hash.includes('invite=')) return null
  const qs = hash.split('?')[1] || ''
  return new URLSearchParams(qs).get('invite')?.toUpperCase() || null
}

const ERRORS = {
  'auth/email-already-in-use':    'האימייל הזה כבר רשום',
  'auth/invalid-email':           'כתובת אימייל לא תקינה',
  'auth/weak-password':           'הסיסמא צריכה להיות לפחות 6 תווים',
  'auth/user-not-found':          'לא נמצא משתמש עם האימייל הזה',
  'auth/wrong-password':          'סיסמא שגויה',
  'auth/invalid-credential':      'אימייל או סיסמא שגויים',
  'auth/too-many-requests':       'יותר מדי ניסיונות, נסה שוב מאוחר יותר',
  'auth/operation-not-allowed':   '⚠️ יש להפעיל Email/Password ב-Firebase Console',
  'auth/network-request-failed':  'בעיית חיבור לאינטרנט, בדוק את החיבור שלך',
  'auth/internal-error':          'שגיאה פנימית, נסה שוב',
}

function InputField({ label, type = 'text', value, onChange, placeholder, icon: Icon }) {
  const [show, setShow] = useState(false)
  const isPassword = type === 'password'

  return (
    <div className="input-group">
      <label className="input-label">{label}</label>
      <div style={{ position: 'relative' }}>
        <div style={{
          position: 'absolute', insetInlineStart: 13, top: '50%',
          transform: 'translateY(-50%)', pointerEvents: 'none',
          color: 'var(--c-text3)', display: 'flex',
        }}>
          <Icon size={17} strokeWidth={2} />
        </div>
        <input
          className="input-field"
          type={isPassword && show ? 'text' : type}
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          style={{ paddingInlineStart: 42, paddingInlineEnd: isPassword ? 44 : 14 }}
          autoComplete={isPassword ? 'current-password' : type === 'email' ? 'email' : 'name'}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setShow(s => !s)}
            style={{
              position: 'absolute', insetInlineEnd: 13, top: '50%',
              transform: 'translateY(-50%)',
              background: 'none', border: 'none', cursor: 'pointer',
              color: 'var(--c-text3)', display: 'flex', padding: 0,
            }}
          >
            {show ? <EyeOff size={17} strokeWidth={2} /> : <Eye size={17} strokeWidth={2} />}
          </button>
        )}
      </div>
    </div>
  )
}

export default function AuthPage() {
  const inviteFromURL = getInviteFromURL()
  const [mode, setMode] = useState(inviteFromURL ? 'register' : 'login')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [resetSent, setResetSent] = useState(false)

  // Save invite code so AppContext applies it after login
  useEffect(() => {
    if (inviteFromURL) {
      localStorage.setItem('sb_pending_invite', inviteFromURL)
    }
  }, [inviteFromURL])

  const reset = () => {
    setName(''); setEmail(''); setPassword(''); setConfirm(''); setError(''); setResetSent(false)
  }

  const switchMode = (m) => { reset(); setMode(m) }

  const handleSubmit = async () => {
    setError('')
    if (mode === 'reset') {
      if (!email) { setError('נא להזין אימייל'); return }
      setLoading(true)
      try {
        await sendPasswordResetEmail(auth, email)
        setResetSent(true)
      } catch (e) {
        console.error('Firebase auth error:', e.code, e.message)
        setError(ERRORS[e.code] || `שגיאה: ${e.code || 'לא ידועה'}`)
      }
      setLoading(false)
      return
    }
    if (!email || !password) { setError('נא למלא את כל השדות'); return }
    if (mode === 'register') {
      if (!name.trim()) { setError('נא להזין שם'); return }
      if (password !== confirm) { setError('הסיסמאות לא תואמות'); return }
      if (password.length < 6)  { setError('הסיסמא צריכה להיות לפחות 6 תווים'); return }
    }
    setLoading(true)
    try {
      if (mode === 'register') {
        const { user } = await createUserWithEmailAndPassword(auth, email, password)
        if (name.trim()) await updateProfile(user, { displayName: name.trim() })
        localStorage.setItem('sb_new_user', '1')
      } else {
        await signInWithEmailAndPassword(auth, email, password)
      }
    } catch (e) {
      console.error('Firebase auth error:', e.code, e.message)
      setError(ERRORS[e.code] || `שגיאה: ${e.code || 'לא ידועה'}`)
    }
    setLoading(false)
  }

  return (
    <div style={{
      minHeight: '100dvh',
      display: 'flex',
      flexDirection: 'column',
      background: 'var(--c-bg)',
    }}>
      {/* Brand mark */}
      <div style={{
        padding: 'calc(var(--safe-top) + 56px) 24px 32px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 14,
      }}>
        <motion.div
          initial={{ scale: 0.85, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 300, damping: 24 }}
          style={{
            width: 56, height: 56, borderRadius: 16,
            background: 'var(--c-primary)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 8px 20px -6px rgba(6,118,71,0.45)',
          }}
        >
          <Wallet size={27} color="white" strokeWidth={2} />
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.12 }}
          style={{ textAlign: 'center' }}
        >
          <h1 style={{ fontSize: 24, fontWeight: 700, letterSpacing: -0.6 }}>תקציב חכם</h1>
          <p style={{ color: 'var(--c-text2)', fontSize: 13.5, marginTop: 3 }}>
            ניהול תקציב משותף, פשוט וברור
          </p>
        </motion.div>
      </div>

      {/* Card */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 280, damping: 28, delay: 0.08 }}
        style={{
          flex: 1,
          background: 'var(--c-card)',
          borderTop: '1px solid var(--c-border)',
          padding: '26px 20px',
          display: 'flex',
          flexDirection: 'column',
          gap: 18,
        }}
      >
        {/* Invite banner */}
        {inviteFromURL && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            style={{
              background: 'var(--c-primary-light)',
              border: '1px solid #A6F4C5',
              borderRadius: 'var(--r-md)',
              padding: '13px 14px',
              display: 'flex',
              alignItems: 'center',
              gap: 11,
            }}
          >
            <div style={{
              width: 34, height: 34, borderRadius: 9, flexShrink: 0,
              background: 'white', color: 'var(--c-primary)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Home size={17} strokeWidth={2} />
            </div>
            <div>
              <div style={{ fontWeight: 600, fontSize: 13.5, color: 'var(--c-primary-dark)' }}>
                הוזמנת להצטרף למשק בית
              </div>
              <div style={{ fontSize: 12, color: 'var(--c-primary)', marginTop: 2 }}>
                קוד: <strong style={{ letterSpacing: 1.5 }}>{inviteFromURL}</strong> — הירשם/י כדי להצטרף
              </div>
            </div>
          </motion.div>
        )}

        {/* Mode toggle — hidden on the password-reset screen */}
        {mode !== 'reset' && (
          <div className="segment">
            <button
              className={`segment-btn ${mode === 'login' ? 'active' : ''}`}
              onClick={() => switchMode('login')}
            >
              כניסה
            </button>
            <button
              className={`segment-btn ${mode === 'register' ? 'active' : ''}`}
              onClick={() => switchMode('register')}
            >
              הרשמה
            </button>
          </div>
        )}

        {mode === 'reset' && !resetSent && (
          <div style={{ textAlign: 'center', marginTop: -6 }}>
            <h2 style={{ fontSize: 17, fontWeight: 700 }}>איפוס סיסמא</h2>
            <p style={{ fontSize: 13.5, color: 'var(--c-text2)', marginTop: 4 }}>
              הזינו את האימייל שלכם ונשלח קישור לאיפוס הסיסמא
            </p>
          </div>
        )}

        {/* Fields */}
        {mode === 'reset' && resetSent ? (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            style={{ textAlign: 'center', padding: '12px 0' }}
          >
            <div style={{ fontSize: 40, marginBottom: 10 }}>📬</div>
            <h2 style={{ fontSize: 17, fontWeight: 700, marginBottom: 6 }}>הקישור נשלח!</h2>
            <p style={{ fontSize: 13.5, color: 'var(--c-text2)', lineHeight: 1.6 }}>
              בדקו את תיבת הדואר שלכם ({email}) ולחצו על הקישור לאיפוס הסיסמא.
            </p>
          </motion.div>
        ) : (
          <AnimatePresence mode="wait">
            <motion.div
              key={mode}
              initial={{ opacity: 0, x: mode === 'register' ? 20 : -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
              style={{ display: 'flex', flexDirection: 'column', gap: 14 }}
            >
              {mode === 'register' && (
                <InputField
                  label="שם מלא"
                  value={name}
                  onChange={setName}
                  placeholder="ישראל ישראלי"
                  icon={User}
                />
              )}
              <InputField
                label="אימייל"
                type="email"
                value={email}
                onChange={setEmail}
                placeholder="you@example.com"
                icon={Mail}
              />
              {mode !== 'reset' && (
                <InputField
                  label="סיסמא"
                  type="password"
                  value={password}
                  onChange={setPassword}
                  placeholder="לפחות 6 תווים"
                  icon={Lock}
                />
              )}
              {mode === 'login' && (
                <button
                  onClick={() => switchMode('reset')}
                  style={{
                    alignSelf: 'flex-end', background: 'none', border: 'none',
                    color: 'var(--c-primary)', fontWeight: 600, fontSize: 13,
                    cursor: 'pointer', fontFamily: 'inherit', padding: 0, marginTop: -6,
                  }}
                >
                  שכחתם סיסמא?
                </button>
              )}
              {mode === 'register' && (
                <InputField
                  label="אימות סיסמא"
                  type="password"
                  value={confirm}
                  onChange={setConfirm}
                  placeholder="הכנס שוב את הסיסמא"
                  icon={Lock}
                />
              )}
            </motion.div>
          </AnimatePresence>
        )}

        {/* Error */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              style={{
                background: 'rgba(217,107,107,0.12)',
                color: 'var(--c-danger)',
                borderRadius: 'var(--r-md)',
                padding: '12px 16px',
                fontSize: 14,
                fontWeight: 500,
                textAlign: 'center',
              }}
            >
              {error}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Submit */}
        <motion.button
          className="btn btn-primary btn-full"
          whileTap={{ scale: 0.98 }}
          onClick={mode === 'reset' && resetSent ? () => switchMode('login') : handleSubmit}
          disabled={loading}
          style={{
            fontSize: 16,
            padding: '15px',
            opacity: loading ? 0.7 : 1,
            marginTop: 2,
          }}
        >
          {loading
            ? '...'
            : mode === 'reset' ? (resetSent ? 'חזרה לכניסה' : 'שליחת קישור לאיפוס')
            : mode === 'login' ? 'כניסה' : 'יצירת חשבון'
          }
        </motion.button>

        {/* Switch hint */}
        {mode !== 'reset' && (
          <p style={{ textAlign: 'center', color: 'var(--c-text2)', fontSize: 14 }}>
            {mode === 'login' ? 'אין לך חשבון עדיין? ' : 'כבר יש לך חשבון? '}
            <button
              onClick={() => switchMode(mode === 'login' ? 'register' : 'login')}
              style={{
                background: 'none', border: 'none',
                color: 'var(--c-primary)', fontWeight: 600,
                cursor: 'pointer', fontSize: 14, fontFamily: 'inherit',
              }}
            >
              {mode === 'login' ? 'הרשמה' : 'כניסה'}
            </button>
          </p>
        )}
      </motion.div>
    </div>
  )
}
