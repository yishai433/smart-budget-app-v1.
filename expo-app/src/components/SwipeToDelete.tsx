import { useRef, ReactNode } from 'react'
import { View, Text, Animated, PanResponder, Pressable, StyleSheet, Dimensions } from 'react-native'
import { Trash2 } from 'lucide-react-native'

const W = Dimensions.get('window').width
const OPEN = -92            // where the row rests while the delete button shows
const FULL = -W * 0.5       // swipe past here (or flick) and let go → delete

// Swipe a row left to delete: a short swipe parks it open with a red button, a long swipe or a
// flick deletes. Pure native-driven transform, no React state changes mid-gesture, so it stays
// smooth; only clearly-horizontal drags are grabbed, so vertical scrolling is untouched.
export default function SwipeToDelete({ children, onDelete, danger, label = 'מחיקה' }: {
  children: ReactNode; onDelete: () => void; danger: string; label?: string
}) {
  const x = useRef(new Animated.Value(0)).current
  const rest = useRef(0)                     // 0 (closed) or OPEN
  const cb = useRef(onDelete); cb.current = onDelete
  const overlay = useRef<View>(null)         // covers the row while open, to catch a tap-to-close

  const setOverlay = (on: boolean) => overlay.current?.setNativeProps({ pointerEvents: on ? 'auto' : 'none', style: { opacity: on ? 1 : 0 } })
  const settle = (v: number) => {
    rest.current = v
    setOverlay(v < 0)
    Animated.spring(x, { toValue: v, useNativeDriver: true, speed: 20, bounciness: 4 }).start()
  }
  // Deletion is behind a confirm dialog, so don't slide the row away yet — ask, and let the row
  // settle back. If confirmed, it vanishes when the list updates; if cancelled, it's already closed.
  const del = () => { settle(0); cb.current() }

  const pan = useRef(PanResponder.create({
    // a tap while open should close it; a clearly horizontal drag starts the swipe
    onStartShouldSetPanResponder: () => rest.current < 0,
    onMoveShouldSetPanResponder: (_e, g) =>
      (Math.abs(g.dx) > 6 && Math.abs(g.dx) > Math.abs(g.dy) * 1.2) || (rest.current < 0 && Math.abs(g.dx) > 4),
    onPanResponderGrant: () => x.stopAnimation(),
    onPanResponderMove: (_e, g) => {
      // follow the finger from the resting point; a little rubber-band past "open"
      let v = rest.current + g.dx
      if (v > 0) v = v * 0.25
      if (v < OPEN) v = OPEN + (v - OPEN) * 0.5
      x.setValue(v)
    },
    onPanResponderRelease: (_e, g) => {
      const v = rest.current + g.dx
      const tap = Math.abs(g.dx) < 6 && Math.abs(g.dy) < 6
      if (tap) settle(0)                                     // tapped the open row → close
      else if (v < FULL || g.vx < -0.8) del()               // far enough, or a flick → delete
      else settle(v < OPEN / 2 ? OPEN : 0)
    },
    onPanResponderTerminate: () => settle(rest.current),
  })).current

  const reveal = x.interpolate({ inputRange: [OPEN, OPEN / 3, 0], outputRange: [1, 0.4, 0], extrapolate: 'clamp' })
  return (
    <View>
      <View style={[StyleSheet.absoluteFill, s.under, { backgroundColor: danger }]}>
        <Pressable onPress={del} style={s.btn}>
          <Animated.View style={{ alignItems: 'center', opacity: reveal, transform: [{ scale: reveal.interpolate({ inputRange: [0, 1], outputRange: [0.7, 1] }) }] }}>
            <Trash2 size={19} color="#fff" />
            <Text style={s.lbl}>{label}</Text>
          </Animated.View>
        </Pressable>
      </View>
      <Animated.View {...pan.panHandlers} style={{ transform: [{ translateX: x }] }}>
        {children}
        <View ref={overlay} pointerEvents="none" style={[StyleSheet.absoluteFill, { opacity: 0 }]}>
          <Pressable onPress={() => settle(0)} style={StyleSheet.absoluteFill} />
        </View>
      </Animated.View>
    </View>
  )
}

const s = StyleSheet.create({
  under: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'stretch' },
  btn: { width: -OPEN, alignItems: 'center', justifyContent: 'center' },
  lbl: { color: '#fff', fontSize: 12, fontWeight: '700', marginTop: 3 },
})
