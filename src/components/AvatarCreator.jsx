import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useApp } from '../contexts/AppContext'
import { buildAvatarUrl, randomAvatarSeed } from '../utils/avatar'

const HAIR = {
  female: [
    { id: 'bigHair',           label: 'ארוך וגדול' },
    { id: 'bob',               label: 'בוב' },
    { id: 'bun',               label: 'קוקו' },
    { id: 'curly',             label: 'מתולתל' },
    { id: 'straight01',        label: 'ישר חלק' },
    { id: 'longButNotTooLong', label: 'ארוך-בינוני' },
    { id: 'miaWallace',        label: 'קצר' },
    { id: 'frida',             label: 'רחב' },
    { id: 'fro',               label: 'אפרו' },
    { id: 'hijab',             label: 'חיג׳אב' },
  ],
  male: [
    { id: 'shortFlat',              label: 'קצר ישר' },
    { id: 'shortCurly',             label: 'קצר מתולתל' },
    { id: 'sides',                  label: 'צדדי' },
    { id: 'theCaesar',              label: 'קלאסי' },
    { id: 'theCaesarAndSidePart',   label: 'צד + קדמי' },
    { id: 'shortRound',             label: 'עגול' },
    { id: 'shortWaved',             label: 'גלי' },
    { id: 'dreads01',               label: 'דרדלוקס' },
    { id: 'hat',                    label: 'כובע' },
    { id: 'noHair',                 label: 'קרח' },
  ],
}

const SKIN_COLORS = [
  'fdbcb4', 'f8d25c', 'fd9841', 'e58469', 'd08b5b', 'ae5d29', '614335',
]

const HAIR_COLORS = [
  '2c1b18', '4a312c', '724133', 'a55728', 'b58143', 'c93305', 'ecdcbf', 'e8e1e1',
]

const BG_COLORS = [
  'b6e3f4', 'c0aede', 'd1d4f9', 'ffd5dc', 'ffdfbf', 'd4f0c0', 'f8f0e3', 'e8e8e8',
]

const FACIAL_HAIR = [
  { id: 'beardLight',    label: 'זקן קל' },
  { id: 'beardMedium',   label: 'זקן בינוני' },
  { id: 'moustacheFancy',label: 'שפם' },
  { id: 'beardMagestic', label: 'זקן מלכותי' },
]

function ColorSwatch({ hex, selected, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        width: 36, height: 36, borderRadius: '50%',
        background: `#${hex}`,
        border: selected ? '3px solid var(--c-primary)' : '3px solid transparent',
        outline: selected ? '2px solid white' : 'none',
        outlineOffset: -4,
        cursor: 'pointer', padding: 0,
        boxShadow: '0 2px 6px rgba(0,0,0,0.2)',
        flexShrink: 0,
      }}
    />
  )
}

function Section({ title, children }) {
  return (
    <div style={{ marginBottom: 22 }}>
      <h3 style={{ fontSize: 12, fontWeight: 700, color: 'var(--c-text2)', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 10 }}>
        {title}
      </h3>
      {children}
    </div>
  )
}

export default function AvatarCreator({ onSave, onSkip, isOnboarding = false, initialConfig = null }) {
  const { saveAvatar } = useApp()

  const [step, setStep] = useState(initialConfig ? 1 : 0)
  const [gender, setGender] = useState(initialConfig?.gender || null)
  const [saving, setSaving] = useState(false)
  const [config, setConfig] = useState(initialConfig || {
    seed: randomAvatarSeed(),
    gender: null,
    top: 'bigHair',
    skinColor: 'fdbcb4',
    hairColor: '724133',
    backgroundColor: 'b6e3f4',
    facialHair: null,
  })

  const set = (k, v) => setConfig(c => ({ ...c, [k]: v }))

  const handleGenderSelect = (g) => {
    const defaultHair = g === 'male' ? 'shortFlat' : 'bigHair'
    setGender(g)
    setConfig(c => ({ ...c, gender: g, top: defaultHair, facialHair: null }))
    setStep(1)
  }

  const handleRandomize = () => {
    const hairList = HAIR[gender] || HAIR.female
    set('seed', randomAvatarSeed())
    set('top', hairList[Math.floor(Math.random() * hairList.length)].id)
    set('skinColor', SKIN_COLORS[Math.floor(Math.random() * SKIN_COLORS.length)])
    set('hairColor', HAIR_COLORS[Math.floor(Math.random() * HAIR_COLORS.length)])
    set('backgroundColor', BG_COLORS[Math.floor(Math.random() * BG_COLORS.length)])
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      await saveAvatar(config)
      onSave?.()
    } catch (e) {
      console.error('saveAvatar error', e)
    }
    setSaving(false)
  }

  const avatarUrl = buildAvatarUrl(config)
  const hairOptions = HAIR[gender] || HAIR.female

  // ── Step 0: Gender ──────────────────────────────────────────────────────────
  if (step === 0) {
    return (
      <div style={{
        minHeight: '100dvh', display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        background: 'var(--c-bg)', padding: '32px 24px',
      }}>
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          style={{ width: '100%', maxWidth: 360, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 32 }}
        >
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 60, marginBottom: 14 }}>🎨</div>
            <h1 style={{ fontSize: 26, fontWeight: 800, marginBottom: 8 }}>צור את האווטאר שלך</h1>
            <p style={{ fontSize: 15, color: 'var(--c-text2)', lineHeight: 1.5 }}>
              בחר/י מגדר כדי להתחיל בעיצוב הדמות
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, width: '100%' }}>
            {[
              { g: 'female', emoji: '👩', label: 'נקבה' },
              { g: 'male',   emoji: '👨', label: 'זכר' },
            ].map(({ g, emoji, label }) => (
              <motion.button
                key={g}
                whileTap={{ scale: 0.94 }}
                onClick={() => handleGenderSelect(g)}
                style={{
                  background: 'var(--c-card)', border: '2px solid var(--c-sep)',
                  borderRadius: 'var(--r-xl)', padding: '28px 16px',
                  cursor: 'pointer', display: 'flex', flexDirection: 'column',
                  alignItems: 'center', gap: 10, boxShadow: 'var(--shadow-sm)',
                }}
              >
                <span style={{ fontSize: 52 }}>{emoji}</span>
                <span style={{ fontSize: 17, fontWeight: 700, color: 'var(--c-text)' }}>{label}</span>
              </motion.button>
            ))}
          </div>

          {(isOnboarding || onSkip) && (
            <button
              onClick={onSkip}
              style={{ background: 'none', border: 'none', color: 'var(--c-text2)', fontSize: 15, cursor: 'pointer', padding: 8 }}
            >
              דלג בינתיים
            </button>
          )}
        </motion.div>
      </div>
    )
  }

  // ── Step 1: Customize ───────────────────────────────────────────────────────
  return (
    <motion.div
      initial={{ opacity: 0, x: 30 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ type: 'spring', stiffness: 320, damping: 28 }}
      style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', background: 'var(--c-bg)' }}
    >
      {/* Header with preview */}
      <div style={{
        background: 'linear-gradient(160deg, #0A2E1A 0%, #1B5E38 100%)',
        padding: 'calc(var(--safe-top) + 16px) 20px 28px',
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16,
      }}>
        <div style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <button
            onClick={() => setStep(0)}
            style={{
              background: 'rgba(255,255,255,0.15)', border: 'none',
              borderRadius: 20, padding: '8px 14px', color: 'white',
              cursor: 'pointer', fontSize: 14, fontWeight: 600,
            }}
          >
            ‹ מגדר
          </button>
          <span style={{ color: 'white', fontWeight: 700, fontSize: 17 }}>עיצוב אווטאר</span>
          <button
            onClick={handleRandomize}
            style={{
              background: 'rgba(255,255,255,0.15)', border: 'none',
              borderRadius: 20, padding: '8px 14px', color: 'white',
              cursor: 'pointer', fontSize: 14, fontWeight: 600,
            }}
          >
            🎲 אקראי
          </button>
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={avatarUrl}
            initial={{ scale: 0.85, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 340, damping: 22 }}
            style={{
              width: 120, height: 120, borderRadius: '50%',
              overflow: 'hidden',
              border: '4px solid rgba(255,255,255,0.4)',
              boxShadow: '0 8px 32px rgba(0,0,0,0.35)',
              background: `#${config.backgroundColor || 'b6e3f4'}`,
            }}
          >
            <img src={avatarUrl} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Options scroll area */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '20px 16px 8px', WebkitOverflowScrolling: 'touch' }}>

        <Section title="שיער">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
            {hairOptions.map(h => (
              <button
                key={h.id}
                onClick={() => set('top', h.id)}
                style={{
                  padding: '10px 6px', borderRadius: 'var(--r-md)', cursor: 'pointer',
                  border: config.top === h.id ? '2px solid var(--c-primary)' : '2px solid var(--c-sep)',
                  background: config.top === h.id ? 'var(--c-primary-light)' : 'var(--c-card)',
                  fontSize: 12, fontWeight: 600,
                  color: config.top === h.id ? 'var(--c-primary)' : 'var(--c-text)',
                  transition: 'all 0.15s',
                }}
              >
                {h.label}
              </button>
            ))}
          </div>
        </Section>

        <Section title="גוון עור">
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {SKIN_COLORS.map(hex => (
              <ColorSwatch key={hex} hex={hex} selected={config.skinColor === hex} onClick={() => set('skinColor', hex)} />
            ))}
          </div>
        </Section>

        <Section title="צבע שיער">
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {HAIR_COLORS.map(hex => (
              <ColorSwatch key={hex} hex={hex} selected={config.hairColor === hex} onClick={() => set('hairColor', hex)} />
            ))}
          </div>
        </Section>

        {gender === 'male' && (
          <Section title="שפם / זקן">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
              <button
                onClick={() => set('facialHair', null)}
                style={{
                  padding: '10px 6px', borderRadius: 'var(--r-md)', cursor: 'pointer',
                  border: !config.facialHair ? '2px solid var(--c-primary)' : '2px solid var(--c-sep)',
                  background: !config.facialHair ? 'var(--c-primary-light)' : 'var(--c-card)',
                  fontSize: 12, fontWeight: 600,
                  color: !config.facialHair ? 'var(--c-primary)' : 'var(--c-text)',
                }}
              >
                ✨ ללא
              </button>
              {FACIAL_HAIR.map(fh => (
                <button
                  key={fh.id}
                  onClick={() => set('facialHair', fh.id)}
                  style={{
                    padding: '10px 6px', borderRadius: 'var(--r-md)', cursor: 'pointer',
                    border: config.facialHair === fh.id ? '2px solid var(--c-primary)' : '2px solid var(--c-sep)',
                    background: config.facialHair === fh.id ? 'var(--c-primary-light)' : 'var(--c-card)',
                    fontSize: 12, fontWeight: 600,
                    color: config.facialHair === fh.id ? 'var(--c-primary)' : 'var(--c-text)',
                  }}
                >
                  {fh.label}
                </button>
              ))}
            </div>
          </Section>
        )}

        <Section title="צבע רקע">
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {BG_COLORS.map(hex => (
              <ColorSwatch key={hex} hex={hex} selected={config.backgroundColor === hex} onClick={() => set('backgroundColor', hex)} />
            ))}
          </div>
        </Section>

        <div style={{ height: 16 }} />
      </div>

      {/* Footer */}
      <div style={{
        padding: '12px 16px calc(var(--safe-bottom) + 16px)',
        background: 'var(--c-card)', borderTop: '1px solid var(--c-sep)',
        display: 'flex', flexDirection: 'column', gap: 10,
      }}>
        <button
          className="btn btn-primary btn-full"
          onClick={handleSave}
          disabled={saving}
          style={{ fontSize: 16, padding: '15px' }}
        >
          {saving ? '...' : '✓ שמור אווטאר'}
        </button>
        {onSkip && (
          <button
            onClick={onSkip}
            style={{ background: 'none', border: 'none', color: 'var(--c-text2)', fontSize: 14, cursor: 'pointer', padding: '6px' }}
          >
            {isOnboarding ? 'דלג בינתיים' : 'ביטול'}
          </button>
        )}
      </div>
    </motion.div>
  )
}
