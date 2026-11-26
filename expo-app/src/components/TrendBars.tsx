import { useRef, useEffect } from 'react'
import { View, Text, Animated } from 'react-native'
import { Theme } from '../theme'
import Touchable from './Touchable'

export interface TrendPoint { key: string; value: number; label: string }

const BARS_H = 108
const LABEL_H = 26

function Col({ point, selected, max, color, muted, c, delay, onPress }: {
  point: TrendPoint; selected: boolean; max: number; color: string; muted: string; c: Theme; delay: number; onPress: () => void
}) {
  const h = useRef(new Animated.Value(0)).current
  const target = point.value > 0 ? Math.max(6, (point.value / max) * BARS_H) : 3
  useEffect(() => { Animated.timing(h, { toValue: target, duration: 700, delay, useNativeDriver: false }).start() }, [target])
  return (
    <Touchable containerStyle={{ flex: 1 }} scale={0.94} onPress={onPress}
      style={{ alignItems: 'center', justifyContent: 'flex-end', height: BARS_H + LABEL_H }}>
      <Animated.View style={{ width: 26, height: h, borderRadius: 10, backgroundColor: selected ? color : muted }} />
      <Text style={{ fontSize: 11.5, marginTop: 9, color: selected ? c.text : c.text3, fontWeight: selected ? '800' : '500' }}>{point.label}</Text>
    </Touchable>
  )
}

// Monthly bars: one bar per month, selected in the accent colour and the rest
// muted, labels underneath, and a dashed average line — the pattern used by
// the major budgeting apps.
export default function TrendBars({ data, selectedKey, onSelect, color, c, averageLabel }: {
  data: TrendPoint[]; selectedKey: string; onSelect: (key: string) => void; color: string; c: Theme; averageLabel?: string
}) {
  const max = Math.max(1, ...data.map(p => p.value))
  const withValues = data.filter(p => p.value > 0)
  const avg = withValues.length ? withValues.reduce((s, p) => s + p.value, 0) / withValues.length : 0
  const avgY = avg > 0 ? (avg / max) * BARS_H : 0
  const muted = color + '4D'

  return (
    <View>
      <View style={{ height: BARS_H + LABEL_H }}>
        {avgY > 0 && (
          <View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, bottom: LABEL_H + avgY, height: 0, borderTopWidth: 1.5, borderStyle: 'dashed', borderColor: c.text3, opacity: 0.55 }} />
        )}
        <View style={{ flexDirection: 'row' }}>
          {data.map((p, i) => (
            <Col key={p.key} point={p} selected={p.key === selectedKey} max={max} color={color} muted={muted} c={c}
              delay={120 + i * 60} onPress={() => onSelect(p.key)} />
          ))}
        </View>
      </View>
      {averageLabel ? (
        <Text style={{ fontSize: 11.5, color: c.text3, textAlign: 'right', marginTop: 10 }}>{averageLabel}</Text>
      ) : null}
    </View>
  )
}
