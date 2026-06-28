import { useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { updateProfile } from 'firebase/auth'
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'
import { auth, storage } from '../firebase'
import { useApp } from '../contexts/AppContext'

const AVATAR_COLORS = [
  ['#6C63FF', '#8B85FF'],
  ['#D98888', '#E8AAAA'],
  ['#43B89C', '#6DD5C1'],
  ['#FF9F40', '#FFB870'],
  ['#4ECDC4', '#7EE8E2'],
]

function getColor(uid) {
  if (!uid) return AVATAR_COLORS[0]
  return AVATAR_COLORS[uid.charCodeAt(0) % AVATAR_COLORS.length]
}

function getInitial(user) {
  if (user?.displayName) return user.displayName[0].toUpperCase()
  if (user?.email) return user.email[0].toUpperCase()
  return '?'
}

// Compress + crop image to 200×200 JPEG
async function compressImage(file) {
  return new Promise(resolve => {
    const canvas = document.createElement('canvas')
    canvas.width = 200; canvas.height = 200
    const ctx = canvas.getContext('2d')
    const img = new Image()
    img.onload = () => {
      const s = Math.min(img.width, img.height)
      const sx = (img.width - s) / 2
      const sy = (img.height - s) / 2
      ctx.drawImage(img, sx, sy, s, s, 0, 0, 200, 200)
      canvas.toBlob(resolve, 'image/jpeg', 0.82)
    }
    img.src = URL.createObjectURL(file)
  })
}

// A single avatar circle — exported for reuse
export function AvatarCircle({ user, size = 44, fontSize = 18, style = {}, onClick, uploading }) {
  const [from, to] = getColor(user?.uid)
  const hasPhoto = !!user?.photoURL

  return (
    <div
      onClick={onClick}
      style={{
        width: size, height: size,
        borderRadius: '50%',
        background: hasPhoto ? 'transparent' : `linear-gradient(135deg, ${from} 0%, ${to} 100%)`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize, fontWeight: 700, color: 'white',
        border: '2.5px solid rgba(255,255,255,0.35)',
        flexShrink: 0,
        boxShadow: '0 2px 10px rgba(0,0,0,0.25)',
        cursor: onClick ? 'pointer' : 'default',
        overflow: 'hidden',
        position: 'relative',
        ...style,
      }}
    >
      {hasPhoto
        ? <img src={user.photoURL} alt="avatar"
            style={{ width:'100%', height:'100%', objectFit:'cover' }} />
        : getInitial(user)
      }
      {uploading && (
        <div style={{
          position:'absolute', inset:0, background:'rgba(0,0,0,0.5)',
          display:'flex', alignItems:'center', justifyContent:'center',
          fontSize: 12, color: 'white',
        }}>
          ⏳
        </div>
      )}
    </div>
  )
}

// Header avatar (small, no edit)
export default function UserAvatar() {
  const { user, household } = useApp()
  const isPartnerConnected = household?.members?.length > 1

  return (
    <motion.div
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 320, damping: 24, delay: 0.15 }}
      style={{ position: 'relative', cursor: 'pointer' }}
    >
      {isPartnerConnected ? (
        <div style={{ position: 'relative', width: 64, height: 44 }}>
          <div style={{ position: 'absolute', insetInlineStart: 0, top: 0 }}>
            <AvatarCircle user={{ uid: household.members[1] }} size={38} fontSize={16} style={{ opacity: 0.85 }} />
          </div>
          <div style={{ position: 'absolute', insetInlineStart: 20, top: 3 }}>
            <AvatarCircle user={user} size={40} fontSize={17} />
          </div>
          <div style={{
            position: 'absolute', bottom: 0, insetInlineEnd: 0,
            width: 13, height: 13, borderRadius: '50%',
            background: '#34C759', border: '2px solid white',
          }} />
        </div>
      ) : (
        <div style={{ position: 'relative' }}>
          <AvatarCircle user={user} size={44} fontSize={18} />
          <div style={{
            position: 'absolute', bottom: 0, insetInlineEnd: 0,
            width: 13, height: 13, borderRadius: '50%',
            background: 'rgba(255,255,255,0.35)', border: '2px solid rgba(255,255,255,0.6)',
          }} />
        </div>
      )}
    </motion.div>
  )
}

// Large editable avatar for Settings
export function EditableAvatar({ size = 88 }) {
  const { user } = useApp()
  const fileRef = useRef()
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')

  const handleFile = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) { setError('בחר קובץ תמונה'); return }
    setError('')
    setUploading(true)
    try {
      const blob = await compressImage(file)
      const storageRef = ref(storage, `avatars/${auth.currentUser.uid}`)
      await uploadBytes(storageRef, blob)
      const url = await getDownloadURL(storageRef)
      await updateProfile(auth.currentUser, { photoURL: url })
      // Force React re-render by reloading user
      await auth.currentUser.reload()
      window.location.reload()
    } catch (err) {
      console.error(err)
      setError('שגיאה בהעלאה, נסה שוב')
    }
    setUploading(false)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
      <div style={{ position: 'relative' }}>
        <AvatarCircle user={user} size={size} fontSize={size * 0.38} uploading={uploading} />
        <button
          onClick={() => fileRef.current?.click()}
          style={{
            position: 'absolute', bottom: 0, insetInlineEnd: 0,
            width: 30, height: 30, borderRadius: '50%',
            background: 'var(--c-primary)', border: '2.5px solid white',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', fontSize: 14,
          }}
        >
          📷
        </button>
      </div>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontWeight: 700, fontSize: 17 }}>{user?.displayName || '—'}</div>
        <div style={{ fontSize: 13, color: 'var(--c-text2)' }}>{user?.email}</div>
      </div>
      {error && <div style={{ color: 'var(--c-danger)', fontSize: 12 }}>{error}</div>}
      <input ref={fileRef} type="file" accept="image/*" capture="user"
        style={{ display: 'none' }} onChange={handleFile} />
    </div>
  )
}
