import { ReactNode } from 'react'
import { View, StyleSheet } from 'react-native'
import Svg, { Path, Circle } from 'react-native-svg'

export interface Slice { value: number; color: string }

function arc(cx: number, cy: number, r: number, start: number, end: number): string {
  const p = (a: number) => [cx + r * Math.cos(a), cy + r * Math.sin(a)]
  const [x1, y1] = p(start)
  const [x2, y2] = p(end)
  const large = end - start > Math.PI ? 1 : 0
  return `M ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2}`
}

// A clean segmented donut. Pass slices (value + color); center holds `children`.
export default function DonutChart({ slices, size = 184, thickness = 24, track, children }: { slices: Slice[]; size?: number; thickness?: number; track: string; children?: ReactNode }) {
  const R = (size - thickness) / 2
  const cx = size / 2
  const cy = size / 2
  const total = slices.reduce((s, x) => s + x.value, 0)
  const real = slices.filter(s => s.value > 0)
  const gap = real.length > 1 ? 0.04 : 0
  let angle = -Math.PI / 2
  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size}>
        <Circle cx={cx} cy={cy} r={R} stroke={track} strokeWidth={thickness} fill="none" />
        {total > 0 && real.map((sl, i) => {
          const frac = sl.value / total
          const sweep = frac * 2 * Math.PI
          const start = angle + gap / 2
          const end = angle + sweep - gap / 2
          angle += sweep
          if (end <= start) return null
          return <Path key={i} d={arc(cx, cy, R, start, end)} stroke={sl.color} strokeWidth={thickness} fill="none" strokeLinecap="butt" />
        })}
      </Svg>
      <View style={[StyleSheet.absoluteFill, { alignItems: 'center', justifyContent: 'center' }]}>{children}</View>
    </View>
  )
}
