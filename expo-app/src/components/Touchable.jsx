import { useRef } from 'react'
import { Animated, Pressable } from 'react-native'

// A pressable that dips slightly when touched — the small scale/opacity change
// gives every tap a physical, responsive feel. `containerStyle` goes on the
// Pressable itself (e.g. flex:1 so it stretches); `style` goes on the inner view.
export default function Touchable({ children, onPress, style, containerStyle, scale = 0.97, disabled }) {
  const s = useRef(new Animated.Value(1)).current
  const to = (v) => Animated.spring(s, { toValue: v, useNativeDriver: true, speed: 40, bounciness: 0 }).start()
  return (
    <Pressable onPress={onPress} disabled={disabled} style={containerStyle}
      onPressIn={() => to(scale)} onPressOut={() => to(1)}>
      <Animated.View style={[style, { opacity: disabled ? 0.5 : 1, transform: [{ scale: s }] }]}>
        {children}
      </Animated.View>
    </Pressable>
  )
}
