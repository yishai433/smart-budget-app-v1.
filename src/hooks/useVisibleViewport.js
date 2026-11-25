import { useEffect, useState } from 'react'

// The part of the screen that is actually visible: on iPhone it shrinks when the keyboard opens.
// Updates once per frame and only when the size really changed, so the sheet doesn't jitter.
export default function useVisibleViewport() {
  const read = () => ({ h: Math.round(window.visualViewport?.height || window.innerHeight), top: Math.round(window.visualViewport?.offsetTop || 0) })
  const [vv, setVv] = useState(read)
  useEffect(() => {
    const v = window.visualViewport
    if (!v) return
    let raf = 0
    const sync = () => {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(() => setVv(p => { const n = read(); return Math.abs(n.h - p.h) < 2 && Math.abs(n.top - p.top) < 2 ? p : n }))
    }
    v.addEventListener('resize', sync); v.addEventListener('scroll', sync)
    return () => { cancelAnimationFrame(raf); v.removeEventListener('resize', sync); v.removeEventListener('scroll', sync) }
  }, [])
  return vv
}
