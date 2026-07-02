import { useEffect } from 'react'

// Freezes the page while a sheet/modal is mounted. `#root` is this app's
// actual scroll container (not body/window), so a simple overflow:hidden on
// it is enough to stop its own internal scroll — and it's safe, since it
// doesn't touch #root's position or dimensions.
//
// iOS's native rubber-band bounce is a separate thing: it's driven by
// whether <body>/<html> are scrollable, not by an inner div's overflow. It
// still fires when a touch/drag isn't fully consumed by an inner scrollable
// element (e.g. dragging inside a short sheet with nothing to scroll).
// Locking body's position stops that at the source without altering #root's
// own box, which is what broke the layout when #root itself was pinned.
export default function useScrollLock() {
  useEffect(() => {
    const root = document.getElementById('root')
    const prevRootOverflow = root?.style.overflow
    if (root) root.style.overflow = 'hidden'

    const scrollY = window.scrollY
    const prevBody = {
      position: document.body.style.position,
      top: document.body.style.top,
      width: document.body.style.width,
    }
    document.body.style.position = 'fixed'
    document.body.style.top = `${-scrollY}px`
    document.body.style.width = '100%'

    return () => {
      if (root) root.style.overflow = prevRootOverflow
      document.body.style.position = prevBody.position
      document.body.style.top = prevBody.top
      document.body.style.width = prevBody.width
      window.scrollTo(0, scrollY)
    }
  }, [])
}
