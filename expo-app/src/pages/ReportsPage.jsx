import { View, Text, ScrollView, StyleSheet } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useTheme, radius } from '../theme'
import { formatAmount } from '../utils/format'
import { CATEGORIES, CURRENCY as CUR, totals } from '../data/mock'

export default function ReportsPage() {
  const c = useTheme()
  const insets = useSafeAreaInsets()
  const rows = Object.entries(totals.byCat).sort((a, b) => b[1] - a[1])
  const max = Math.max(...rows.map(r => r[1]))
  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <ScrollView contentContainerStyle={{ padding: 16, paddingTop: insets.top + 12, paddingBottom: 120 }}>
        <Text style={[st.title, { color: c.text }]}>דוחות</Text>
        <Text style={[st.sub, { color: c.text2 }]}>לאן הלך הכסף החודש</Text>
        <View style={[st.card, { backgroundColor: c.card, borderColor: c.border }]}>
          {rows.map(([id, amt]) => {
            const cat = CATEGORIES[id]
            return (
              <View key={id} style={{ marginBottom: 16 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
                  <Text style={{ color: c.text, fontWeight: '600' }}>{cat.emoji}  {cat.label}</Text>
                  <Text style={{ color: c.text2 }}>{formatAmount(amt, CUR)}</Text>
                </View>
                <View style={{ height: 10, borderRadius: 999, backgroundColor: c.bg, overflow: 'hidden' }}>
                  <View style={{ width: `${(amt / max) * 100}%`, height: '100%', borderRadius: 999, backgroundColor: cat.color }} />
                </View>
              </View>
            )
          })}
        </View>
      </ScrollView>
    </View>
  )
}
const st = StyleSheet.create({
  title: { fontSize: 30, fontWeight: '700', textAlign: 'right' },
  sub: { fontSize: 13, textAlign: 'right', marginTop: 2, marginBottom: 16 },
  card: { borderWidth: 1, borderRadius: radius.lg, padding: 16 },
})
