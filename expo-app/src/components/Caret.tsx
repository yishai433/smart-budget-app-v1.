import { useRef, useEffect } from 'react'
import { Animated, Easing } from 'react-native'

// A blinking cursor shown next to an amount while it waits for input.
export default function Caret({ color, height = 36 }: { color: string; height?: number }) {
  const o = useRef(new Animated.Value(1)).current
  useEffect(() => {
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(o, { toValue: 0, duration: 480, easing: Easing.ease, useNativeDriver: true }),
      Animated.timing(o, { toValue: 1, duration: 480, easing: Easing.ease, useNativeDriver: true }),
    ]))
    loop.start()
    return () => loop.stop()
  }, [])
  return <Animated.View style={{ width: 2.5, height, borderRadius: 2, backgroundColor: color, opacity: o, marginHorizontal: 1 }} />
}
