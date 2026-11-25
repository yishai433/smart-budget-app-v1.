import { useEffect, useState } from 'react'

// How tall the iPhone keyboard is right now (0 when closed). The sheet itself never resizes or moves,
// so the search field stays put and the keyboard can't flicker; only the list/footer use this number.
export default function useKeyboardHeight() {
  const read = () => {
    const v = window.visualViewport
    return v ? Math.max(0, Math.round(window.innerHeight - v.height - v.offsetTop)) : 0
  }
  const [kb, setKb] = useState(read)
  useEffect(() => {
    const v = window.visualViewport
    if (!v) return
    // Update only once the keyboard has finished moving: changing the layout on every animation frame
    // made opening/closing the keyboard laggy.
    let t = 0
    const sync = () => { clearTimeout(t); t = setTimeout(() => setKb(p => { const n = read(); return Math.abs(n - p) < 2 ? p : n }), 120) }
    v.addEventListener('resize', sync); v.addEventListener('scroll', sync)
    return () => { clearTimeout(t); v.removeEventListener('resize', sync); v.removeEventListener('scroll', sync) }
  }, [])
  return kb
}
