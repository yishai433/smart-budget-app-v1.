import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useApp } from '../contexts/AppContext'
import { buildAvatarUrl, randomAvatarSeed } from '../utils/avatar'

const HAIR = {
  female: [
    'bigHair', 'bob', 'bun', 'curly', 'straight01',
    'longButNotTooLong', 'miaWallace', 'frida', 'fro',
  ],
  male: [
    'shortFlat', 'shortCurly', 'sides', 'theCaesar',
    'theCaesarAndSidePart', 'shortRound', 'shortWaved', 'dreads01',
  ],
}
const FACIAL_HAIR = ['beardLight', 'beardMedium', 'moustacheFancy', 'beardMagestic']
const SKIN_COLORS = ['fdbcb4', 'f8d25c', 'fd9841', 'e58469', 'd08b5b', 'ae5d29', '614335']
const HAIR_COLORS  = ['2c1b18', '4a312c', '724133', 'a55728', 'b58143', 'c93305', 'ecdcbf', 'e8e1e1']
const BG_COLORS    = ['b6e3f4', 'c0aede', 'd1d4f9', 'ffd5dc', 'ffdfbf', 'd4f0c0', 'f8f0e3']

function pick(arr) { return arr[Math.floor(Math.random() * arr.length)] }

function generateConfig(g) {
  return {
    seed: randomAvatarSeed(),
    gender: g,
    top: pick(HAIR[g]),
    skinColor: pick(SKIN_COLORS),
    hairColor: pick(HAIR_COLORS),
    backgroundColor: pick(BG_COLORS),
    facialHair: g === 'male' && Math.random() > 0.45 ? pick(FACIAL_HAIR) : null,
  }
}

export default function AvatarCreator({ onSave, onSkip, isOnboarding = false, initialConfig = null }) {
  const { saveAvatar } = useApp()
  const [gender, setGender] = useState(null)
  const [config, setConfig] = useState(null)
  const [saving, setSaving] = useState(false)

  const handleGenderSelect = (g) => {
    setGender(g)
    setConfig(generateConfig(g))
  }

  const handleRegenerate = () => setConfig(generateConfig(gender))

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

  const avatarUrl = config ? buildAvatarUrl(config) : null

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 999,
      background: 'var(--c-bg)',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      padding: '32px 24px',
    }}>

      <AnimatePresence mode="wait">

        {/* ── Step 0: Gender selection ─────────────────────────────────────── */}
        {!gender && (
          <motion.div
            key="gender"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            style={{ width: '100%', maxWidth: 360, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 32 }}
          >
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 60, marginBottom: 14 }}>🎨</div>
              <h1 style={{ fontSize: 26, fontWeight: 800, marginBottom: 8 }}>צור את האווטאר שלך</h1>
              <p style={{ fontSize: 15, color: 'var(--c-text2)', lineHeight: 1.5 }}>
                בחר/י מגדר ואנחנו ניצור לך אווטאר
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
                    borderRadius: 'var(--r-xl)', padding: '32px 16px',
                    cursor: 'pointer', display: 'flex', flexDirection: 'column',
                    alignItems: 'center', gap: 12, boxShadow: 'var(--shadow-sm)',
                  }}
                >
                  <span style={{ fontSize: 56 }}>{emoji}</span>
                  <span style={{ fontSize: 18, fontWeight: 700, color: 'var(--c-text)' }}>{label}</span>
                </motion.button>
              ))}
            </div>

            {onSkip && (
              <button
                onClick={onSkip}
                style={{ background: 'none', border: 'none', color: 'var(--c-text2)', fontSize: 15, cursor: 'pointer', padding: 8 }}
              >
                דלג בינתיים
              </button>
            )}
          </motion.div>
        )}

        {/* ── Step 1: Avatar preview ───────────────────────────────────────── */}
        {gender && config && (
          <motion.div
            key="preview"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            style={{ width: '100%', maxWidth: 360, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 28 }}
          >
            <div style={{ textAlign: 'center' }}>
              <h1 style={{ fontSize: 24, fontWeight: 800, marginBottom: 6 }}>הנה האווטאר שלך!</h1>
              <p style={{ fontSize: 14, color: 'var(--c-text2)' }}>לחץ/י על 🎲 לאווטאר אחר</p>
            </div>

            {/* Big avatar */}
            <AnimatePresence mode="wait">
              <motion.div
                key={avatarUrl}
                initial={{ scale: 0.7, opacity: 0, rotate: -8 }}
                animate={{ scale: 1, opacity: 1, rotate: 0 }}
                exit={{ scale: 0.7, opacity: 0 }}
                transition={{ type: 'spring', stiffness: 320, damping: 22 }}
                style={{
                  width: 160, height: 160, borderRadius: '50%',
                  overflow: 'hidden',
                  border: '5px solid var(--c-primary)',
                  boxShadow: '0 12px 40px rgba(22,163,73,0.25)',
                  background: `#${config.backgroundColor}`,
                }}
              >
                <img src={avatarUrl} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              </motion.div>
            </AnimatePresence>

            {/* Buttons */}
            <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 12 }}>
              <button
                className="btn btn-primary btn-full"
                onClick={handleSave}
                disabled={saving}
                style={{ fontSize: 17, padding: '16px' }}
              >
                {saving ? '...' : '✓ שמור אווטאר'}
              </button>

              <button
                className="btn btn-secondary btn-full"
                onClick={handleRegenerate}
                style={{ fontSize: 16, padding: '14px' }}
              >
                🎲 נסה שוב
              </button>

              <button
                onClick={() => { setGender(null); setConfig(null) }}
                style={{ background: 'none', border: 'none', color: 'var(--c-text2)', fontSize: 14, cursor: 'pointer', padding: '8px', textAlign: 'center' }}
              >
                ‹ שינוי מגדר
              </button>

              {onSkip && (
                <button
                  onClick={onSkip}
                  style={{ background: 'none', border: 'none', color: 'var(--c-text3)', fontSize: 13, cursor: 'pointer', padding: '4px' }}
                >
                  דלג בינתיים
                </button>
              )}
            </div>
          </motion.div>
        )}

      </AnimatePresence>
    </div>
  )
}
