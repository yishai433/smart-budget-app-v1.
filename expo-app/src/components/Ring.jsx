import Svg, { Circle } from 'react-native-svg'
import { View, Text, StyleSheet } from 'react-native'
import { useTheme } from '../theme'

// Progress ring for "how much of the budget is used", drawn on the dark hero.
export default function Ring({ pct }) {
  const c = useTheme()
  const R = 26, STROKE = 6, SIZE = 64
  const C = 2 * Math.PI * R
  const clamped = Math.max(0, Math.min(100, pct))
  const over = pct > 100
  return (
    <View style={{ width: SIZE, height: SIZE }}>
      <Svg width={SIZE} height={SIZE}>
        <Circle cx={SIZE / 2} cy={SIZE / 2} r={R} stroke="rgba(34,31,15,0.15)" strokeWidth={STROKE} fill="none" />
        <Circle cx={SIZE / 2} cy={SIZE / 2} r={R} stroke={over ? c.danger : c.inkText} strokeWidth={STROKE} fill="none"
          strokeLinecap="round" strokeDasharray={C} strokeDashoffset={C - (clamped / 100) * C}
          transform={`rotate(-90 ${SIZE / 2} ${SIZE / 2})`} />
      </Svg>
      <View style={[StyleSheet.absoluteFill, { alignItems: 'center', justifyContent: 'center' }]}>
        <Text style={{ fontSize: 13, fontWeight: '700', color: c.inkText }}>{clamped}%</Text>
      </View>
    </View>
  )
}
