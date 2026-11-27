import { useRef, useEffect } from 'react'
import Svg, { Circle } from 'react-native-svg'
import { View, Text, Animated, StyleSheet } from 'react-native'
import { useTheme } from '../theme'

const AnimatedCircle = Animated.createAnimatedComponent(Circle)

export default function Ring({ pct }: { pct: number }) {
  const c = useTheme()
  const R = 26, STROKE = 6, SIZE = 64
  const C = 2 * Math.PI * R
  const clamped = Math.max(0, Math.min(100, pct))
  const over = pct > 100
  const a = useRef(new Animated.Value(0)).current
  useEffect(() => { Animated.timing(a, { toValue: clamped, duration: 900, delay: 150, useNativeDriver: false }).start() }, [clamped])
  const offset = a.interpolate({ inputRange: [0, 100], outputRange: [C, 0] })
  return (
    <View style={{ width: SIZE, height: SIZE }}>
      <Svg width={SIZE} height={SIZE}>
        <Circle cx={SIZE / 2} cy={SIZE / 2} r={R} stroke="rgba(255,255,255,0.28)" strokeWidth={STROKE} fill="none" />
        <AnimatedCircle cx={SIZE / 2} cy={SIZE / 2} r={R} stroke={over ? c.danger : c.inkText} strokeWidth={STROKE} fill="none"
          strokeLinecap="round" strokeDasharray={C} strokeDashoffset={offset} transform={`rotate(-90 ${SIZE / 2} ${SIZE / 2})`} />
      </Svg>
      <View style={[StyleSheet.absoluteFill, { alignItems: 'center', justifyContent: 'center' }]}>
        <Text style={{ fontSize: 13, fontWeight: '700', color: c.inkText }}>{clamped}%</Text>
      </View>
    </View>
  )
}
