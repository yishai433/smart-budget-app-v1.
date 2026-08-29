import { useState } from 'react'
import { motion } from 'framer-motion'
import {
  Wallet, ArrowLeft, ArrowRight, Plus, Home, Utensils, Car, Shirt, Check,
  ArrowUpRight, ArrowDownLeft, Share, MoreVertical,
} from 'lucide-react'

// Pulsing highlight ring — draws the eye to the exact element being explained,
// without needing precisely-positioned arrows for every mockup.
function Spotlight({ children, shape = 'circle', style }) {
  return (
    <div style={{ position: 'relative', display: 'inline-flex', ...style }}>
      <motion.div
        animate={{ scale: [1, 1.35, 1], opacity: [0.5, 0, 0.5] }}
        transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
        style={{
          position: 'absolute', inset: -6,
          borderRadius: shape === 'circle' ? '50%' : 14,
          border: '2px solid var(--c-primary)',
          pointerEvents: 'none',
        }}
      />
      {children}
    </div>
  )
}

// A compact, non-functional recreation of a real screen area — same classes/
// tokens as the live app, so it reads as authentic rather than a generic
// illustration.
function PhoneMock({ children }) {
  return (
    <div style={{
      width: '100%', maxWidth: 300,
      background: 'var(--c-bg)',
      border: '1px solid var(--c-border)',
      borderRadius: 28,
      padding: 18,
      boxShadow: 'var(--shadow-md)',
    }}>
      {children}
    </div>
  )
}

const CAT_SAMPLE = [
  { Icon: Home, id: 'housing' },
  { Icon: Utensils, id: 'food' },
  { Icon: Car, id: 'transport' },
  { Icon: Shirt, id: 'clothing' },
]

const SLIDES = [
  {
    title: 'ברוכים הבאים לתקציב חכם',
    body: 'האפליקציה שעוזרת לכם ולבן/בת הזוג לנהל את התקציב המשותף שלכם בקלות — יחד, בזמן אמת.',
    mock: (
      <PhoneMock>
        <div style={{ display: 'flex', justifyContent: 'center', padding: '24px 0' }}>
          <div style={{
            width: 84, height: 84, borderRadius: '50%',
            background: 'var(--c-accent2-light)', color: 'var(--c-accent2-dark)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Wallet size={38} strokeWidth={1.8} />
          </div>
        </div>
      </PhoneMock>
    ),
  },
  {
    title: 'הוספת הכנסה או הוצאה',
    body: 'לוחצים על כפתור ה-+ בעמוד הבית, ומזינים סכום ותיאור — לוקח שנייה אחת.',
    mock: (
      <PhoneMock>
        <div style={{ position: 'relative', height: 150 }}>
          <div className="page-eyebrow" style={{ marginBottom: 2 }}>אוגוסט 2026</div>
          <div className="page-title" style={{ fontSize: 19 }}>תקציב חכם</div>
          <Spotlight style={{ position: 'absolute', left: 6, bottom: 4 }}>
            <div className="fab" style={{ position: 'static', width: 46, height: 46 }}>
              <Plus size={22} strokeWidth={2.8} />
            </div>
          </Spotlight>
        </div>
      </PhoneMock>
    ),
  },
  {
    title: 'הוצאות קבועות',
    body: 'שכירות, מנוי או חשבון שחוזר כל חודש? מסמנים אותו כ"הוצאה קבועה" פעם אחת, והאפליקציה זוכרת אותו מעצמה.',
    mock: (
      <PhoneMock>
        <Spotlight shape="rect" style={{ width: '100%' }}>
          <div className="toggle-wrap" style={{ width: '100%', padding: '4px 2px' }}>
            <div>
              <div style={{ fontWeight: 600, fontSize: 14.5 }}>הוצאה קבועה</div>
              <div style={{ fontSize: 11.5, color: 'var(--c-text2)', marginTop: 2 }}>חוזרת כל חודש</div>
            </div>
            <label className="toggle">
              <input type="checkbox" checked readOnly />
              <div className="toggle-track" />
              <div className="toggle-thumb" />
            </label>
          </div>
        </Spotlight>
      </PhoneMock>
    ),
  },
  {
    title: 'קיטלוג אוטומטי לפי קטגוריה',
    body: 'בוחרים קטגוריה מתוך רשימה מוכנה (מזון, דיור, תחבורה ועוד) — והאפליקציה עוקבת אחרי כל אחת בנפרד.',
    mock: (
      <PhoneMock>
        <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--c-text2)', marginBottom: 10 }}>בחרו קטגוריה</div>
        <div className="cat-grid">
          {CAT_SAMPLE.map(({ Icon, id }, i) => {
            const selected = i === 1
            const btn = (
              <div
                className={`cat-btn ${selected ? 'selected' : ''}`}
                style={selected ? { borderColor: 'var(--c-primary)', background: 'var(--c-primary-light)' } : {}}
              >
                <div className="cat-icon" style={{ color: selected ? 'var(--c-primary)' : 'var(--c-text2)' }}>
                  <Icon size={22} strokeWidth={1.8} />
                </div>
              </div>
            )
            return selected
              ? <Spotlight key={id} shape="rect">{btn}</Spotlight>
              : <div key={id}>{btn}</div>
          })}
        </div>
      </PhoneMock>
    ),
  },
  {
    title: 'מעקב תקציב חודשי',
    body: 'קובעים כמה מתכננים להוציא החודש, והמסך הראשי מראה כמה כבר השתמשתם — ומתריע כשחורגים.',
    mock: (
      <PhoneMock>
        <Spotlight shape="rect" style={{ width: '100%' }}>
          <div className="hero-ink" style={{ width: '100%', padding: '16px 18px' }}>
            <div className="t-overline" style={{ color: 'var(--c-ink-text2)' }}>הוצאנו החודש</div>
            <div dir="ltr" className="t-display" style={{ fontSize: 26, color: 'var(--c-ink-text)', marginTop: 4 }}>
              <span className="cur" style={{ fontSize: 16 }}>₪</span>3,300
            </div>
            <div style={{ marginTop: 10, fontSize: 11.5, color: 'var(--c-ink-text2)' }}>מתוך תקציב של ₪5,000</div>
          </div>
        </Spotlight>
      </PhoneMock>
    ),
  },
  {
    title: 'לחצו לפירוט מלא',
    body: 'לחיצה על אריח "הוצאות" או "הכנסות" בעמוד הבית פותחת רשימה מלאה של כל התנועות מאותו סוג באותו חודש.',
    mock: (
      <PhoneMock>
        <div className="kpi-row">
          <div className="kpi">
            <div className="kpi-chip" style={{ background: 'var(--c-accent2-light)', color: 'var(--c-accent2-dark)' }}>
              <Wallet size={15} strokeWidth={2.2} />
            </div>
            <div>
              <div className="kpi-label">חיסכון</div>
              <div dir="ltr" className="kpi-value num" style={{ textAlign: "start", color: 'var(--c-accent2-dark)' }}>₪4,672</div>
            </div>
          </div>
          <Spotlight shape="rect">
            <div className="kpi">
              <div className="kpi-chip" style={{ background: 'var(--c-bg)', color: 'var(--c-text2)' }}>
                <ArrowUpRight size={15} strokeWidth={2.2} />
              </div>
              <div>
                <div className="kpi-label">הוצאות</div>
                <div dir="ltr" className="kpi-value num" style={{ textAlign: "start", color: 'var(--c-text)' }}>₪5,527</div>
              </div>
            </div>
          </Spotlight>
          <div className="kpi">
            <div className="kpi-chip" style={{ background: 'var(--c-accent2-light)', color: 'var(--c-accent2-dark)' }}>
              <ArrowDownLeft size={15} strokeWidth={2.2} />
            </div>
            <div>
              <div className="kpi-label">הכנסות</div>
              <div dir="ltr" className="kpi-value num" style={{ textAlign: "start", color: 'var(--c-accent2-dark)' }}>₪10,200</div>
            </div>
          </div>
        </div>
      </PhoneMock>
    ),
  },
  {
    title: 'רשימת קניות חכמה',
    body: 'מסמנים מה כבר בעגלה, והמחירים נשמרים אוטומטית — בקנייה הבאה הרשימה כבר מוכנה.',
    mock: (
      <PhoneMock>
        <div className="card-list">
          {[
            { name: 'חלב', checked: true },
            { name: 'לחם', checked: false },
          ].map((it, i) => {
            const checkBtn = (
              <button className={`check-btn ${it.checked ? 'checked' : ''}`}>
                {it.checked && <Check size={13} strokeWidth={3} color="#fff8f0" />}
              </button>
            )
            return (
              <div key={it.name} className="list-item" style={{ cursor: 'default', borderBottom: i === 0 ? '1px solid var(--c-sep)' : 'none' }}>
                {i === 0 ? <Spotlight>{checkBtn}</Spotlight> : checkBtn}
                <span style={{ fontSize: 14.5, textDecoration: it.checked ? 'line-through' : 'none', color: it.checked ? 'var(--c-text3)' : 'var(--c-text)' }}>
                  {it.name}
                </span>
              </div>
            )
          })}
        </div>
      </PhoneMock>
    ),
  },
  {
    title: 'דוחות וגרפים ברורים',
    body: 'מגמות של חצי שנה, פילוח הוצאות לפי קטגוריה, וזיהוי מהיר של ההוצאות הגדולות שלכם.',
    mock: (
      <PhoneMock>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height: 100, padding: '0 4px' }}>
          {[40, 70, 45, 90, 60, 75].map((h, i) => (
            <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 3 }}>
              <div style={{ height: h * 0.6, borderRadius: 6, background: 'var(--c-accent2)', opacity: 0.85 }} />
              <div style={{ height: h * 0.4, borderRadius: 6, background: 'var(--c-primary)', opacity: 0.85 }} />
            </div>
          ))}
        </div>
      </PhoneMock>
    ),
  },
  {
    title: 'משק בית משותף',
    body: 'הזמינו את בן/בת הזוג בקוד חד-פעמי, ותנהלו תקציב אחד משותף — כל שינוי מסתנכרן אצל שניכם מיד.',
    mock: (
      <PhoneMock>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 14 }}>
          <div style={{ position: 'relative', width: 68, height: 46 }}>
            <div style={{
              position: 'absolute', insetInlineStart: 0, top: 0,
              width: 38, height: 38, borderRadius: '50%',
              background: 'linear-gradient(135deg, #FF9F40, #FFB870)',
              border: '2.5px solid var(--c-bg)',
            }} />
            <div style={{
              position: 'absolute', insetInlineStart: 22, top: 6,
              width: 40, height: 40, borderRadius: '50%',
              background: 'linear-gradient(135deg, #6C63FF, #8B85FF)',
              border: '2.5px solid var(--c-bg)',
            }} />
          </div>
        </div>
        <Spotlight shape="rect" style={{ width: '100%', justifyContent: 'center', display: 'flex' }}>
          <div className="code-display" style={{ width: '100%' }}>ABC123</div>
        </Spotlight>
      </PhoneMock>
    ),
  },
  {
    title: 'התקינו על מסך הבית',
    body: 'קבלו את האפליקציה כמו אפליקציה אמיתית — בלי חנות אפליקציות. פשוט מוסיפים אותה למסך הבית מהדפדפן.',
    mock: (
      <PhoneMock>
        <div style={{ display: 'flex', gap: 16 }}>
          <div style={{ flex: 1, textAlign: 'center' }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--c-text2)', marginBottom: 10 }}>iPhone</div>
            <div style={{
              width: 52, height: 52, borderRadius: '50%', margin: '0 auto',
              background: 'var(--c-primary-light)', color: 'var(--c-primary)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Share size={22} strokeWidth={1.8} />
            </div>
            <div style={{ fontSize: 11.5, color: 'var(--c-text2)', marginTop: 10, lineHeight: 1.5 }}>
              כפתור <b style={{ color: 'var(--c-text)' }}>שיתוף</b><br />← "הוסף למסך הבית"
            </div>
          </div>
          <div style={{ width: 1, background: 'var(--c-border)' }} />
          <div style={{ flex: 1, textAlign: 'center' }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--c-text2)', marginBottom: 10 }}>Android</div>
            <div style={{
              width: 52, height: 52, borderRadius: '50%', margin: '0 auto',
              background: 'var(--c-accent2-light)', color: 'var(--c-accent2-dark)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <MoreVertical size={22} strokeWidth={1.8} />
            </div>
            <div style={{ fontSize: 11.5, color: 'var(--c-text2)', marginTop: 10, lineHeight: 1.5 }}>
              תפריט <b style={{ color: 'var(--c-text)' }}>⋮</b> בדפדפן<br />← "התקן אפליקציה"
            </div>
          </div>
        </div>
      </PhoneMock>
    ),
  },
]

export default function OnboardingIntro({ onFinish }) {
  const [index, setIndex] = useState(0)
  const [dir, setDir] = useState(1)
  const isLast = index === SLIDES.length - 1
  const slide = SLIDES[index]

  const go = (delta) => {
    setDir(delta)
    setIndex(i => Math.max(0, Math.min(SLIDES.length - 1, i + delta)))
  }

  return (
    <div style={{
      minHeight: '100dvh',
      display: 'flex', flexDirection: 'column',
      background: 'var(--c-bg)',
      paddingTop: 'var(--safe-top)',
      paddingBottom: 'calc(var(--safe-bottom) + 24px)',
    }}>
      {/* Skip */}
      <div style={{ display: 'flex', justifyContent: 'flex-start', padding: '16px 20px 0' }}>
        <button
          onClick={onFinish}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            fontSize: 14, fontWeight: 600, color: 'var(--c-text3)',
            fontFamily: 'inherit', padding: 8,
          }}
        >
          דלג
        </button>
      </div>

      {/* Slide content */}
      <div style={{
        flex: 1, display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        padding: '0 28px', overflow: 'hidden', position: 'relative',
      }}>
        {/* No AnimatePresence here on purpose: content correctness must not
            depend on an exit animation completing (it can stall if the tab
            isn't compositing, e.g. backgrounded). React swaps the keyed
            child immediately; the entrance animation is purely cosmetic. */}
        <motion.div
          key={index}
          initial={{ opacity: 0, x: dir > 0 ? 40 : -40 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.22, ease: 'easeOut' }}
          style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            textAlign: 'center', width: '100%', maxWidth: 340,
          }}
        >
            <div style={{ marginBottom: 26, width: '100%', display: 'flex', justifyContent: 'center' }}>
              {slide.mock}
            </div>
            <h1 style={{
              fontFamily: "'Caprasimo', 'Figtree', sans-serif",
              fontWeight: 400, fontSize: 21, letterSpacing: '-0.2px',
              color: 'var(--c-text)', marginBottom: 10, lineHeight: 1.3,
            }}>
              {slide.title}
            </h1>
            <p style={{ fontSize: 14, lineHeight: 1.6, color: 'var(--c-text2)' }}>
              {slide.body}
            </p>
          </motion.div>
      </div>

      {/* Dots */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: 7, padding: '18px 0' }}>
        {SLIDES.map((_, i) => (
          <button
            key={i}
            onClick={() => { setDir(i > index ? 1 : -1); setIndex(i) }}
            aria-label={`slide ${i + 1}`}
            style={{
              width: i === index ? 20 : 7, height: 7, borderRadius: 999,
              border: 'none', cursor: 'pointer', padding: 0,
              background: i === index ? 'var(--c-accent2)' : 'var(--c-border)',
              transition: 'width 0.25s ease, background 0.25s ease',
            }}
          />
        ))}
      </div>

      {/* Controls */}
      <div style={{ display: 'flex', gap: 10, padding: '0 24px' }}>
        {index > 0 && (
          <button
            onClick={() => go(-1)}
            className="btn-icon"
            style={{ width: 52, height: 52, flexShrink: 0 }}
            aria-label="previous"
          >
            <ArrowRight size={20} strokeWidth={2} />
          </button>
        )}
        <button
          onClick={() => (isLast ? onFinish() : go(1))}
          className="btn btn-primary btn-full"
          style={{ padding: '16px', fontSize: 16 }}
        >
          {isLast ? 'בואו נתחיל' : (
            <>
              המשך <ArrowLeft size={18} strokeWidth={2.2} />
            </>
          )}
        </button>
      </div>
    </div>
  )
}
