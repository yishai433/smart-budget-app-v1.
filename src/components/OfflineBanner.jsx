import { useEffect, useState } from 'react'
import { WifiOff } from 'lucide-react'
import { useApp } from '../contexts/AppContext'

// Thin notice while the device is offline: changes are kept and synced later.
export default function OfflineBanner() {
  const { settings } = useApp()
  const [offline, setOffline] = useState(() => typeof navigator !== 'undefined' && !navigator.onLine)
  useEffect(() => {
    const on = () => setOffline(false)
    const off = () => setOffline(true)
    window.addEventListener('online', on)
    window.addEventListener('offline', off)
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off) }
  }, [])
  if (!offline) return null
  const he = (settings.language || 'he') === 'he'
  return (
    <div role="status" style={{
      position: 'sticky', top: 0, zIndex: 140,
      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
      padding: 'calc(var(--safe-top) + 6px) 12px 6px',
      background: 'var(--c-text)', color: 'var(--c-bg)', fontSize: 12.5, fontWeight: 600,
    }}>
      <WifiOff size={14} strokeWidth={2.2} />
      {he ? 'אין חיבור. השינויים נשמרים ויסונכרנו כשהחיבור יחזור' : 'Offline. Changes are saved and will sync when you are back online'}
    </div>
  )
}
