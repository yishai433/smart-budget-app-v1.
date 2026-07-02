import { useEffect } from 'react'

// Freezes the page's own scroll container while a sheet/modal is mounted.
// Without this, dragging inside a sheet that has little content to scroll
// (nothing to consume the touchmove) falls through to the page behind it,
// which visibly scrolls the whole screen instead of staying put.
export default function useScrollLock() {
  useEffect(() => {
    const root = document.getElementById('root')
    if (!root) return
    const prevOverflow = root.style.overflow
    const prevTouchAction = root.style.touchAction
    root.style.overflow = 'hidden'
    root.style.touchAction = 'none'
    return () => {
      root.style.overflow = prevOverflow
      root.style.touchAction = prevTouchAction
    }
  }, [])
}
