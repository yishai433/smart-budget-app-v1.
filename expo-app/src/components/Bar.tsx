import { useRef, useEffect } from 'react'
import { View, Animated } from 'react-native'

export default function Bar({ pct, color, track, delay = 0, height = 6 }: { pct: number; color: string; track: string; delay?: number; height?: number }) {
  const target = Math.max(0, Math.min(100, pct))
  const a = useRef(new Animated.Value(0)).current
  useEffect(() => { Animated.timing(a, { toValue: target, duration: 650, delay, useNativeDriver: false }).start() }, [target])
  const width = a.interpolate({ inputRange: [0, 100], outputRange: ['0%', '100%'] })
  return (
    <View style={{ height, borderRadius: 999, backgroundColor: track, overflow: 'hidden' }}>
      <Animated.View style={{ width, height: '100%', borderRadius: 999, backgroundColor: color }} />
    </View>
  )
}
