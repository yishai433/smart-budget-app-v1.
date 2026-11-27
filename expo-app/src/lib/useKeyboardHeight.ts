import { useState, useEffect } from 'react'
import { Keyboard, LayoutAnimation, Platform, UIManager, KeyboardEvent } from 'react-native'

// Old architecture on Android needs this opt-in once; a no-op (and safe to call) on
// the new architecture, where LayoutAnimation works without it.
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true)
}

// Height of the on-screen keyboard (0 when hidden). Every layout change it triggers is
// animated, so whatever moves (the sheet, the keypad swapping out) glides smoothly instead
// of snapping — on iOS in sync with the keyboard's own curve and duration, on Android with
// a plain ease (Android only tells us the keyboard already finished moving).
export default function useKeyboardHeight(enabled = true) {
  const [h, setH] = useState(0)
  useEffect(() => {
    if (!enabled) { setH(0); return }
    const ios = Platform.OS === 'ios'
    const anim = (e: KeyboardEvent) => {
      const type = ios ? LayoutAnimation.Types.keyboard : LayoutAnimation.Types.easeInEaseOut
      LayoutAnimation.configureNext({
        duration: e?.duration || 220,
        update: { type },
        create: { type, property: LayoutAnimation.Properties.opacity },
        delete: { type, property: LayoutAnimation.Properties.opacity },
      })
    }
    const show = Keyboard.addListener(ios ? 'keyboardWillShow' : 'keyboardDidShow', e => { anim(e); setH(e.endCoordinates.height) })
    const hide = Keyboard.addListener(ios ? 'keyboardWillHide' : 'keyboardDidHide', e => { anim(e); setH(0) })
    return () => { show.remove(); hide.remove() }
  }, [enabled])
  return h
}
