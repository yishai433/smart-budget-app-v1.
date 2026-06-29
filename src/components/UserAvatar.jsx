import { motion } from 'framer-motion'
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

// A single avatar circle — exported for reuse
export function AvatarCircle({ user, size = 44, fontSize = 18, style = {}, onClick, uploading, avatarUrlOverride }) {
  const [from, to] = getColor(user?.uid)
  const displayUrl = avatarUrlOverride || user?.photoURL
  const hasPhoto = !!displayUrl

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
        ? <img src={displayUrl} alt="avatar"
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

// Header avatar with name — used in all page headers
export default function UserAvatar() {
  const { user, household, avatarUrl } = useApp()
  const isPartnerConnected = household?.members?.length > 1
  const firstName = user?.displayName?.split(' ')[0] || user?.email?.split('@')[0] || ''

  return (
    <motion.div
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 320, damping: 24, delay: 0.15 }}
      style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, cursor: 'pointer' }}
    >
      {isPartnerConnected ? (
        <div style={{ position: 'relative', width: 64, height: 44 }}>
          <div style={{ position: 'absolute', insetInlineStart: 0, top: 0 }}>
            <AvatarCircle user={{ uid: household.members[1] }} size={38} fontSize={16} style={{ opacity: 0.85 }} />
          </div>
          <div style={{ position: 'absolute', insetInlineStart: 20, top: 3 }}>
            <AvatarCircle user={user} size={40} fontSize={17} avatarUrlOverride={avatarUrl} />
          </div>
          <div style={{
            position: 'absolute', bottom: 0, insetInlineEnd: 0,
            width: 13, height: 13, borderRadius: '50%',
            background: '#34C759', border: '2px solid white',
          }} />
        </div>
      ) : (
        <div style={{ position: 'relative' }}>
          <AvatarCircle user={user} size={44} fontSize={18} avatarUrlOverride={avatarUrl} />
          <div style={{
            position: 'absolute', bottom: 0, insetInlineEnd: 0,
            width: 13, height: 13, borderRadius: '50%',
            background: 'rgba(255,255,255,0.35)', border: '2px solid rgba(255,255,255,0.6)',
          }} />
        </div>
      )}
      {firstName ? (
        <span style={{
          fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.85)',
          maxWidth: 64, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {firstName}
        </span>
      ) : null}
    </motion.div>
  )
}

// Large avatar display for Settings (edit opens AvatarCreator externally)
export function SettingsAvatar({ size = 88, onEdit }) {
  const { user, avatarUrl } = useApp()

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
      <div style={{ position: 'relative' }}>
        <AvatarCircle user={user} size={size} fontSize={size * 0.38} avatarUrlOverride={avatarUrl} />
        <button
          onClick={onEdit}
          style={{
            position: 'absolute', bottom: 0, insetInlineEnd: 0,
            width: 30, height: 30, borderRadius: '50%',
            background: 'var(--c-primary)', border: '2.5px solid white',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', fontSize: 15,
          }}
        >
          ✏️
        </button>
      </div>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontWeight: 700, fontSize: 17 }}>{user?.displayName || '—'}</div>
        <div style={{ fontSize: 13, color: 'var(--c-text2)' }}>{user?.email}</div>
      </div>
    </div>
  )
}
