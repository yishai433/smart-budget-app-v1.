import { useRef, useEffect } from 'react'
import { Animated } from 'react-native'

// Gentle entrance: fade up a little. Used for cards and sections so the screen
// assembles itself softly instead of popping in all at once.
export default function FadeIn({ children, delay = 0, offset = 12, style }) {
  const p = useRef(new Animated.Value(0)).current
  useEffect(() => {
    Animated.timing(p, { toValue: 1, duration: 420, delay, useNativeDriver: true }).start()
  }, [])
  return (
    <Animated.View style={[style, {
      opacity: p,
      transform: [{ translateY: p.interpolate({ inputRange: [0, 1], outputRange: [offset, 0] }) }],
    }]}>
      {children}
    </Animated.View>
  )
}
