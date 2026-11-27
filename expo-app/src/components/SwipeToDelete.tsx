import { useRef, useState, ReactNode } from 'react'
import { View, Text, Animated, PanResponder, Pressable, StyleSheet, Dimensions } from 'react-native'
import { Trash2 } from 'lucide-react-native'

const W = Dimensions.get('window').width
const OPEN = -96            // how far the row rests when the delete button is showing
const FULL = -W * 0.42      // swipe this far and let go → delete

// Swipe a row to the left: a short swipe shows a red "delete" button, a long swipe deletes.
// Only horizontal drags are taken, so the page still scrolls normally up and down.
export default function SwipeToDelete({ children, onDelete, danger, label = 'מחיקה' }: {
  children: ReactNode; onDelete: () => void; danger: string; label?: string
}) {
  const x = useRef(new Animated.Value(0)).current
  const cb = useRef(onDelete); cb.current = onDelete
  const at = useRef(0)                       // where the row rests (0 or OPEN)
  const [open, setOpen] = useState(false)
  const to = (v: number, done?: () => void) => {
    at.current = v
    setOpen(v < 0)
    Animated.spring(x, { toValue: v, useNativeDriver: true, speed: 22, bounciness: 2 }).start(done)
  }
  const del = () => {
    Animated.timing(x, { toValue: -W, duration: 180, useNativeDriver: true }).start(() => {
      cb.current()
      // if the delete was cancelled (or failed) the row comes back
      setTimeout(() => to(0), 250)
    })
  }
  const pan = useRef(PanResponder.create({
    onMoveShouldSetPanResponder: (_e, g) => Math.abs(g.dx) > 10 && Math.abs(g.dx) > Math.abs(g.dy) * 1.6 && (g.dx < 0 || at.current < 0),
    onPanResponderTerminationRequest: () => false,
    onPanResponderMove: (_e, g) => x.setValue(Math.min(0, at.current + g.dx)),
    onPanResponderRelease: (_e, g) => {
      const v = at.current + g.dx
      if (v < FULL || g.vx < -1.6) del()
      else if (v < OPEN / 2) to(OPEN)
      else to(0)
    },
    onPanResponderTerminate: () => to(at.current),
  })).current

  const reveal = x.interpolate({ inputRange: [OPEN, 0], outputRange: [1, 0], extrapolate: 'clamp' })
  return (
    <View>
      <View style={[StyleSheet.absoluteFill, s.under, { backgroundColor: danger }]}>
        <Pressable onPress={del} style={s.btn}>
          <Animated.View style={{ alignItems: 'center', opacity: reveal, transform: [{ scale: reveal.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1] }) }] }}>
            <Trash2 size={19} color="#fff" />
            <Text style={s.lbl}>{label}</Text>
          </Animated.View>
        </Pressable>
      </View>
      <Animated.View {...pan.panHandlers} style={{ transform: [{ translateX: x }] }}>
        {children}
        {/* while open, a tap on the row just closes it */}
        {open ? <Pressable onPress={() => to(0)} style={StyleSheet.absoluteFill} /> : null}
      </Animated.View>
    </View>
  )
}

const s = StyleSheet.create({
  under: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'stretch' },
  btn: { width: -OPEN, alignItems: 'center', justifyContent: 'center' },
  lbl: { color: '#fff', fontSize: 12, fontWeight: '700', marginTop: 3 },
})
