import { View, Text, ScrollView, StyleSheet } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useTheme, radius } from '../theme'
import { formatAmount } from '../lib/money'
import { categoryOf } from '../categories'
import { useData } from '../context/DataContext'
import { useAuth } from '../context/AuthContext'
import FadeIn from '../components/FadeIn'
import Header from '../components/Header'
import Bar from '../components/Bar'

export default function ReportsScreen() {
  const c = useTheme()
  const insets = useSafeAreaInsets()
  const { user } = useAuth()
  const d = useData()
  const names = [user?.displayName || user?.email?.split('@')[0] || 'אני', d.partnerName || ''].filter(Boolean)
  const byCat: Record<string, number> = {}
  d.monthTransactions.filter(t => t.type === 'expense').forEach(t => { byCat[t.category] = (byCat[t.category] || 0) + t.amount })
  const rows = Object.entries(byCat).sort((a, b) => b[1] - a[1])
  const max = Math.max(1, ...rows.map(r => r[1]))

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <ScrollView contentContainerStyle={{ padding: 16, paddingTop: insets.top + 12, paddingBottom: 120 }}>
        <FadeIn><Header title="דוחות" names={names} /><Text style={[s.sub, { color: c.text2 }]}>לאן הלך הכסף החודש</Text></FadeIn>
        <FadeIn delay={80}>
          {rows.length === 0 ? (
            <View style={[s.card, { backgroundColor: c.card, borderColor: c.border, alignItems: 'center' }]}>
              <Text style={{ color: c.text2 }}>אין עדיין הוצאות החודש.</Text>
            </View>
          ) : (
            <View style={[s.card, { backgroundColor: c.card, borderColor: c.border }]}>
              {rows.map(([id, amt], i) => {
                const cat = categoryOf(id)
                return (
                  <View key={id} style={{ marginBottom: i < rows.length - 1 ? 16 : 0 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
                      <Text style={{ color: c.text, fontWeight: '600' }}>{cat.emoji}  {cat.label}</Text>
                      <Text style={{ color: c.text2 }}>{formatAmount(amt)}</Text>
                    </View>
                    <Bar pct={(amt / max) * 100} color={cat.color} track={c.bg} delay={150 + i * 70} height={10} />
                  </View>
                )
              })}
            </View>
          )}
        </FadeIn>
      </ScrollView>
    </View>
  )
}
const s = StyleSheet.create({ sub: { fontSize: 13, textAlign: 'right', marginTop: 2, marginBottom: 16 }, card: { borderWidth: 1, borderRadius: radius.lg, padding: 16 } })
