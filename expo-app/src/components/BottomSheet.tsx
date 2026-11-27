import { useState, useRef, useEffect, ReactNode } from 'react'
import { View, Modal, StyleSheet, Pressable, Animated, Easing, Dimensions, Keyboard } from 'react-native'
import useKeyboardHeight from '../lib/useKeyboardHeight'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useTheme } from '../theme'

const SCREEN_H = Dimensions.get('window').height

// One smooth bottom sheet used by every popup in the app, so they all open with
// the same light, natural motion instead of the stuttery native Modal slide.
// Shared comfortable height so every amount sheet opens to the same spot.
export const SHEET_MIN_HEIGHT = Math.round(SCREEN_H * 0.74)
// Lists and pickers open almost to the top, so their content sits where the eye is, not at the thumb's edge.
export const SHEET_TALL = Math.round(SCREEN_H * 0.88)

export default function BottomSheet({ visible, onClose, children, avoidKeyboard, minHeight }: { visible: boolean; onClose: () => void; children: ReactNode; avoidKeyboard?: boolean; minHeight?: number }) {
  const c = useTheme()
  const insets = useSafeAreaInsets()
  const [mounted, setMounted] = useState(visible)
  // Build the (possibly heavy) content one frame after the slide starts, so the open stays smooth.
  const [content, setContent] = useState(false)
  const entrance = useRef(new Animated.Value(SCREEN_H)).current
  const backdrop = useRef(new Animated.Value(0)).current
  const kb = useKeyboardHeight(!!avoidKeyboard && visible)
  // Lift the sheet's content above the keyboard (animated in sync with it on iOS,
  // and with a plain LayoutAnimation on Android — otherwise the keyboard just
  // covers whatever's at the bottom of the sheet, with no way to reach it).
  const lift = avoidKeyboard && kb > 0

  useEffect(() => {
    if (visible) {
      setMounted(true)
      entrance.setValue(SCREEN_H)
      backdrop.setValue(0)
      Animated.parallel([
        Animated.timing(backdrop, { toValue: 1, duration: 280, useNativeDriver: true }),
        // easeOutExpo: quick to rise, soft to settle.
        Animated.timing(entrance, { toValue: 0, duration: 370, easing: Easing.bezier(0.16, 1, 0.3, 1), useNativeDriver: true }),
      ]).start()
    } else if (mounted) {
      Keyboard.dismiss()
      Animated.parallel([
        Animated.timing(backdrop, { toValue: 0, duration: 190, useNativeDriver: true }),
        Animated.timing(entrance, { toValue: SCREEN_H, duration: 250, easing: Easing.in(Easing.cubic), useNativeDriver: true }),
      ]).start(() => { setMounted(false); setContent(false) })
    }
  }, [visible])

  // Build the heavy content on the next frame, so the slide starts unblocked.
  useEffect(() => { if (mounted && !content) { const r = requestAnimationFrame(() => setContent(true)); return () => cancelAnimationFrame(r) } }, [mounted, content])

  if (!mounted) return null

  const sheet = (
    <Animated.View style={[styles.sheet, { backgroundColor: c.card, paddingBottom: lift ? kb + 10 : insets.bottom + 14,
      // grow by the keyboard's height, so the content keeps its room above it (capped by maxHeight)
      minHeight: minHeight != null ? minHeight + (lift ? kb : 0) : undefined, maxHeight: SCREEN_H - insets.top - 6, transform: [{ translateY: entrance }] }]}>
      <View style={styles.handle} />
      {content ? children : <View style={{ height: minHeight ? minHeight - 40 : 120 }} />}
    </Animated.View>
  )

  return (
    <Modal visible transparent animationType="none" onRequestClose={onClose} statusBarTranslucent>
      <View style={{ flex: 1, justifyContent: 'flex-end' }}>
        <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: '#000', opacity: backdrop.interpolate({ inputRange: [0, 1], outputRange: [0, 0.45] }) }]} />
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        {sheet}
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  sheet: { borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: 20, paddingTop: 8 },
  handle: { alignSelf: 'center', width: 36, height: 4, borderRadius: 2, backgroundColor: 'rgba(128,128,128,0.35)', marginBottom: 12 },
})
