import { useState, useRef, useEffect, ReactNode } from 'react'
import { InteractionManager } from 'react-native'
import { View, Modal, StyleSheet, Pressable, Animated, Easing, Dimensions, Platform, Keyboard } from 'react-native'
import useKeyboardHeight from '../lib/useKeyboardHeight'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useTheme } from '../theme'

const SCREEN_H = Dimensions.get('window').height

// One smooth bottom sheet used by every popup in the app, so they all open with
// the same light, natural motion instead of the stuttery native Modal slide.
// Shared comfortable height so every amount sheet opens to the same spot.
export const SHEET_MIN_HEIGHT = Math.round(SCREEN_H * 0.74)

export default function BottomSheet({ visible, onClose, children, avoidKeyboard, minHeight }: { visible: boolean; onClose: () => void; children: ReactNode; avoidKeyboard?: boolean; minHeight?: number }) {
  const c = useTheme()
  const insets = useSafeAreaInsets()
  const [mounted, setMounted] = useState(visible)
  // Build the (possibly heavy) content one frame after the slide starts, so the open stays smooth.
  const [content, setContent] = useState(false)
  const entrance = useRef(new Animated.Value(SCREEN_H)).current
  const backdrop = useRef(new Animated.Value(0)).current
  const kb = useKeyboardHeight(!!avoidKeyboard && visible)
  // iOS: lift the sheet's content above the keyboard (animated in sync with it).
  const lift = avoidKeyboard && Platform.OS === 'ios' && kb > 0

  useEffect(() => {
    if (visible) {
      setMounted(true)
      entrance.setValue(SCREEN_H)
      backdrop.setValue(0)
      const task = InteractionManager.runAfterInteractions(() => setContent(true))
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
    if (visible) return () => {}
  }, [visible])

  // Also show content as soon as the first frame passes, in case interactions never settle.
  useEffect(() => { if (mounted && !content) { const r = requestAnimationFrame(() => setContent(true)); return () => cancelAnimationFrame(r) } }, [mounted, content])

  if (!mounted) return null

  const sheet = (
    <Animated.View style={[styles.sheet, { backgroundColor: c.card, paddingBottom: lift ? kb + 10 : insets.bottom + 14, minHeight: lift ? undefined : minHeight, maxHeight: SCREEN_H - insets.top - 6, transform: [{ translateY: entrance }] }]}>
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
