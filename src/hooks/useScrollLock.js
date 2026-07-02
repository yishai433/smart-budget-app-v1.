import { useEffect } from 'react'

// Freezes the page while a sheet/modal is mounted. `#root` is this app's
// actual scroll container (not body/window) — but plain `overflow: hidden`
// on it isn't enough on iOS: WKWebView still applies its native rubber-band
// bounce to the document itself whenever a touch/drag isn't fully consumed
// by an inner scrollable element (e.g. dragging inside a short sheet with
// nothing to scroll). Taking #root out of normal flow with position:fixed
// collapses <html>/<body> to zero scrollable height, which stops the native
// bounce at the source instead of just hiding an inner overflow.
export default function useScrollLock() {
  useEffect(() => {
    const root = document.getElementById('root')
    if (!root) return
    const scrollTop = root.scrollTop
    // Capture the rendered box before switching to fixed — #root is
    // centered via max-width + margin:auto, which position:fixed would
    // otherwise blow away.
    const rect = root.getBoundingClientRect()
    const prev = {
      position: root.style.position,
      top: root.style.top,
      left: root.style.left,
      width: root.style.width,
      overflow: root.style.overflow,
    }
    root.style.position = 'fixed'
    root.style.top = `${rect.top}px`
    root.style.left = `${rect.left}px`
    root.style.width = `${rect.width}px`
    root.style.overflow = 'hidden'
    return () => {
      root.style.position = prev.position
      root.style.top = prev.top
      root.style.left = prev.left
      root.style.width = prev.width
      root.style.overflow = prev.overflow
      root.scrollTop = scrollTop
    }
  }, [])
}
