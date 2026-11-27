import { useState, useEffect } from 'react'
import { Keyboard, LayoutAnimation, Platform, KeyboardEvent } from 'react-native'

// Height of the on-screen keyboard (0 when hidden). On iOS every layout change it
// triggers is animated with the keyboard's own curve and duration, so whatever
// moves (the sheet, the keypad swapping out) glides in sync with the keyboard.
export default function useKeyboardHeight(enabled = true) {
  const [h, setH] = useState(0)
  useEffect(() => {
    if (!enabled) { setH(0); return }
    const ios = Platform.OS === 'ios'
    const anim = (e: KeyboardEvent) => {
      if (!ios) return
      LayoutAnimation.configureNext({
        duration: e?.duration || 250,
        update: { type: LayoutAnimation.Types.keyboard },
        create: { type: LayoutAnimation.Types.keyboard, property: LayoutAnimation.Properties.opacity },
        delete: { type: LayoutAnimation.Types.keyboard, property: LayoutAnimation.Properties.opacity },
      })
    }
    const show = Keyboard.addListener(ios ? 'keyboardWillShow' : 'keyboardDidShow', e => { anim(e); setH(e.endCoordinates.height) })
    const hide = Keyboard.addListener(ios ? 'keyboardWillHide' : 'keyboardDidHide', e => { anim(e); setH(0) })
    return () => { show.remove(); hide.remove() }
  }, [enabled])
  return h
}
