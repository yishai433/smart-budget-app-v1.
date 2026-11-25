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
    let raf = 0
    const sync = () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(() => setKb(p => { const n = read(); return Math.abs(n - p) < 2 ? p : n })) }
    v.addEventListener('resize', sync); v.addEventListener('scroll', sync)
    return () => { cancelAnimationFrame(raf); v.removeEventListener('resize', sync); v.removeEventListener('scroll', sync) }
  }, [])
  return kb
}
