import { useEffect, useRef } from 'react'

// Focuses an input after a sheet's slide-up animation has time to play,
// instead of the native `autoFocus` attribute. autoFocus pops the keyboard
// the instant the input mounts — before framer-motion's spring animation has
// rendered a frame — so the sheet appears to snap straight into its final,
// keyboard-adjusted position with no visible slide or backdrop dim.
export default function useDelayedFocus(delay = 380) {
  const ref = useRef(null)
  useEffect(() => {
    const t = setTimeout(() => ref.current?.focus(), delay)
    return () => clearTimeout(t)
  }, [delay])
  return ref
}
