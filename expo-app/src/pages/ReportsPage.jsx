import { View, Text, ScrollView, StyleSheet } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useTheme, radius } from '../theme'
import { formatAmount } from '../utils/format'
import { CATEGORIES, CURRENCY as CUR, totals } from '../data/mock'
import FadeIn from '../components/FadeIn'
import Bar from '../components/Bar'

export default function ReportsPage() {
  const c = useTheme()
  const insets = useSafeAreaInsets()
  const rows = Object.entries(totals.byCat).sort((a, b) => b[1] - a[1])
  const max = Math.max(...rows.map(r => r[1]))
  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <ScrollView contentContainerStyle={{ padding: 16, paddingTop: insets.top + 12, paddingBottom: 120 }}>
        <FadeIn>
          <Text style={[st.title, { color: c.text }]}>דוחות</Text>
          <Text style={[st.sub, { color: c.text2 }]}>לאן הלך הכסף החודש</Text>
        </FadeIn>
        <FadeIn delay={80}>
          <View style={[st.card, { backgroundColor: c.card, borderColor: c.border }]}>
            {rows.map(([id, amt], i) => {
              const cat = CATEGORIES[id]
              return (
                <View key={id} style={{ marginBottom: i < rows.length - 1 ? 16 : 0 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
                    <Text style={{ color: c.text, fontWeight: '600' }}>{cat.emoji}  {cat.label}</Text>
                    <Text style={{ color: c.text2 }}>{formatAmount(amt, CUR)}</Text>
                  </View>
                  <Bar pct={(amt / max) * 100} color={cat.color} track={c.bg} delay={150 + i * 70} height={10} />
                </View>
              )
            })}
          </View>
        </FadeIn>
      </ScrollView>
    </View>
  )
}
const st = StyleSheet.create({
  title: { fontSize: 30, fontWeight: '800', textAlign: 'right' },
  sub: { fontSize: 13, textAlign: 'right', marginTop: 2, marginBottom: 16 },
  card: { borderWidth: 1, borderRadius: radius.lg, padding: 16 },
})
