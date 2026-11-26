import { useRef, useEffect, ReactNode } from 'react'
import { Animated, ViewStyle, StyleProp } from 'react-native'

export default function FadeIn({ children, delay = 0, offset = 12, style }: { children: ReactNode; delay?: number; offset?: number; style?: StyleProp<ViewStyle> }) {
  const p = useRef(new Animated.Value(0)).current
  useEffect(() => { Animated.timing(p, { toValue: 1, duration: 420, delay, useNativeDriver: true }).start() }, [])
  return (
    <Animated.View style={[style, { opacity: p, transform: [{ translateY: p.interpolate({ inputRange: [0, 1], outputRange: [offset, 0] }) }] }]}>
      {children}
    </Animated.View>
  )
}
