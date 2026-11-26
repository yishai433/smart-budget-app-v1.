import { useState } from 'react'
import { View, Text, ScrollView, Pressable, StyleSheet } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Check, Circle } from 'lucide-react-native'
import { useTheme, radius } from '../theme'

const INITIAL = [
  { id: '1', name: 'חלב 3%', done: false }, { id: '2', name: 'לחם אחיד', done: false },
  { id: '3', name: 'ביצים L', done: true }, { id: '4', name: 'עגבניות', done: false },
  { id: '5', name: 'מלפפונים', done: false }, { id: '6', name: 'קוטג׳', done: true },
  { id: '7', name: 'שמן זית', done: false },
]

export default function ShoppingPage() {
  const c = useTheme()
  const insets = useSafeAreaInsets()
  const [items, setItems] = useState(INITIAL)
  const toggle = (id) => setItems(xs => xs.map(x => x.id === id ? { ...x, done: !x.done } : x))
  const left = items.filter(x => !x.done).length
  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <ScrollView contentContainerStyle={{ padding: 16, paddingTop: insets.top + 12, paddingBottom: 120 }}>
        <Text style={[st.title, { color: c.text }]}>קניות</Text>
        <Text style={[st.sub, { color: c.text2 }]}>{left} פריטים ברשימה</Text>
        <View style={[st.card, { backgroundColor: c.card, borderColor: c.border }]}>
          {items.map((it, i) => (
            <Pressable key={it.id} onPress={() => toggle(it.id)}
              style={[st.row, i ? { borderTopColor: c.sep, borderTopWidth: StyleSheet.hairlineWidth } : null]}>
              {it.done ? <Check size={20} color={c.primary} /> : <Circle size={20} color={c.text3} />}
              <Text style={{ fontSize: 15, color: it.done ? c.text3 : c.text, textDecorationLine: it.done ? 'line-through' : 'none' }}>{it.name}</Text>
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </View>
  )
}
const st = StyleSheet.create({
  title: { fontSize: 30, fontWeight: '700', textAlign: 'right' },
  sub: { fontSize: 13, textAlign: 'right', marginTop: 2, marginBottom: 16 },
  card: { borderWidth: 1, borderRadius: radius.lg, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 15 },
})
