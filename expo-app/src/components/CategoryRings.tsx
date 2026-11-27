import { useRef, useEffect, useState } from 'react'
import { View, Text, Animated, StyleSheet } from 'react-native'
import Svg, { Circle } from 'react-native-svg'
import { ChevronDown } from 'lucide-react-native'
import { useTheme, Theme } from '../theme'
import { categoryOf } from '../categories'
import { formatAmount } from '../lib/money'
import Touchable from './Touchable'

const AnimatedCircle = Animated.createAnimatedComponent(Circle)
const SIZE = 68, STROKE = 6, R = (SIZE - STROKE) / 2, C = 2 * Math.PI * R

// A ring around the category's emoji: how much of its budget is used (or, with no budget,
// its share of this month's spending, drawn lighter).
function CatRing({ pct, color, track, faded, delay, children }: { pct: number; color: string; track: string; faded?: boolean; delay: number; children: React.ReactNode }) {
  const a = useRef(new Animated.Value(0)).current
  const v = Math.max(0, Math.min(100, pct))
  useEffect(() => { Animated.timing(a, { toValue: v, duration: 800, delay, useNativeDriver: false }).start() }, [v])
  const offset = a.interpolate({ inputRange: [0, 100], outputRange: [C, 0] })
  return (
    <View style={{ width: SIZE, height: SIZE }}>
      <Svg width={SIZE} height={SIZE}>
        <Circle cx={SIZE / 2} cy={SIZE / 2} r={R} stroke={track} strokeWidth={STROKE} fill="none" />
        <AnimatedCircle cx={SIZE / 2} cy={SIZE / 2} r={R} stroke={color} strokeOpacity={faded ? 0.45 : 1} strokeWidth={STROKE} fill="none"
          strokeLinecap="round" strokeDasharray={C} strokeDashoffset={offset} transform={`rotate(-90 ${SIZE / 2} ${SIZE / 2})`} />
      </Svg>
      <View style={[StyleSheet.absoluteFill, { alignItems: 'center', justifyContent: 'center' }]}>{children}</View>
    </View>
  )
}

export interface CatRow { id: string; spent: number }

// Categories as a calm grid of rings: what's left in each budget at a glance. The busiest six
// show first; the rest are a tap away.
export default function CategoryRings({ cats, budgets, total, onPick }: {
  cats: CatRow[]; budgets: Record<string, number>; total: number; onPick: (id: string, label: string, budget: number | null) => void
}) {
  const c = useTheme()
  const [all, setAll] = useState(false)
  const shown = all ? cats : cats.slice(0, 6)
  const withBudget = cats.filter(r => budgets[r.id])
  const over = withBudget.filter(r => r.spent > budgets[r.id]).length

  return (
    <View>
      <View style={s.head}>
        <Text style={{ fontSize: 17, fontWeight: '700', color: c.text }}>קטגוריות</Text>
        <Text style={{ fontSize: 12.5, color: over ? c.danger : c.text2, fontWeight: '600' }}>
          {withBudget.length ? (over ? `${over} בחריגה` : 'הכל בתוך התקציב 👌') : 'לחצו על קטגוריה לקביעת תקציב'}
        </Text>
      </View>
      <View style={[s.card, { backgroundColor: c.card, borderColor: c.border }]}>
        <View style={s.grid}>
          {shown.map((r, i) => <Tile key={r.id} r={r} b={budgets[r.id]} total={total} c={c} i={i} onPick={onPick} />)}
        </View>
        {cats.length > 6 ? (
          <Touchable onPress={() => setAll(v => !v)} scale={0.98} style={[s.more, { borderTopColor: c.sep }]}>
            <Text style={{ fontSize: 13.5, fontWeight: '700', color: c.primary }}>{all ? 'פחות' : `עוד ${cats.length - 6} קטגוריות`}</Text>
            <ChevronDown size={15} color={c.primary} style={{ transform: [{ rotate: all ? '180deg' : '0deg' }] }} />
          </Touchable>
        ) : null}
      </View>
    </View>
  )
}

function Tile({ r, b, total, c, i, onPick }: { r: CatRow; b?: number; total: number; c: Theme; i: number; onPick: (id: string, label: string, budget: number | null) => void }) {
  const cat = categoryOf(r.id)
  const pct = b ? (r.spent / b) * 100 : total > 0 ? (r.spent / total) * 100 : 0
  const left = b ? b - r.spent : 0
  const tone = !b ? cat.color : pct > 100 ? c.danger : pct >= 85 ? c.warning : cat.color
  return (
    <Touchable onPress={() => onPick(r.id, cat.label, b ?? null)} scale={0.95} containerStyle={s.cell} style={s.tile}>
      <CatRing pct={pct} color={tone} track={c.bg} faded={!b} delay={150 + i * 70}>
        <Text style={{ fontSize: 24 }}>{cat.emoji}</Text>
      </CatRing>
      <Text numberOfLines={1} style={{ fontSize: 13, fontWeight: '700', color: c.text, marginTop: 7 }}>{cat.label}</Text>
      {b ? (
        <>
          <Text numberOfLines={1} style={{ fontSize: 13.5, fontWeight: '800', color: left < 0 ? c.danger : c.text, marginTop: 2 }}>
            {left < 0 ? `−${formatAmount(-left)}` : formatAmount(left)}
          </Text>
          <Text style={{ fontSize: 11, color: left < 0 ? c.danger : c.text3, marginTop: 1 }}>{left < 0 ? 'חריגה' : 'נשארו'}</Text>
        </>
      ) : (
        <>
          <Text numberOfLines={1} style={{ fontSize: 13.5, fontWeight: '700', color: c.text2, marginTop: 2 }}>{formatAmount(r.spent)}</Text>
          <Text style={{ fontSize: 11, color: c.text3, marginTop: 1 }}>הוצאו · בלי תקציב</Text>
        </>
      )}
    </Touchable>
  )
}

const s = StyleSheet.create({
  head: { flexDirection: 'row-reverse', alignItems: 'baseline', justifyContent: 'space-between', marginTop: 26, marginBottom: 12 },
  card: { borderWidth: 1, borderRadius: 22, overflow: 'hidden' },
  grid: { flexDirection: 'row-reverse', flexWrap: 'wrap', paddingVertical: 10, paddingHorizontal: 4 },
  cell: { width: '33.33%' },
  tile: { alignItems: 'center', paddingVertical: 10, paddingHorizontal: 4 },
  more: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center', gap: 4, paddingVertical: 12, borderTopWidth: StyleSheet.hairlineWidth },
})
