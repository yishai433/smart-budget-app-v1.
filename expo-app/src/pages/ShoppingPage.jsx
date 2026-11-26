import { useState } from 'react'
import { View, Text, ScrollView, StyleSheet } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Check } from 'lucide-react-native'
import { useTheme, radius } from '../theme'
import FadeIn from '../components/FadeIn'
import Touchable from '../components/Touchable'

const INITIAL = [
  { id: '1', name: 'חלב 3%' }, { id: '2', name: 'לחם אחיד' }, { id: '3', name: 'ביצים L', done: true },
  { id: '4', name: 'עגבניות' }, { id: '5', name: 'מלפפונים' }, { id: '6', name: 'קוטג׳', done: true },
  { id: '7', name: 'שמן זית' },
]

function Item({ it, onToggle, first }) {
  const c = useTheme()
  return (
    <Touchable onPress={onToggle} scale={0.99}
      style={[st.row, first ? null : { borderTopColor: c.sep, borderTopWidth: StyleSheet.hairlineWidth }]}>
      <View style={[st.box, it.done ? { backgroundColor: c.primary, borderColor: c.primary } : { borderColor: c.text3 }]}>
        {it.done ? <Check size={15} color="#fff" strokeWidth={3} /> : null}
      </View>
      <Text style={{ fontSize: 15, color: it.done ? c.text3 : c.text, textDecorationLine: it.done ? 'line-through' : 'none' }}>{it.name}</Text>
    </Touchable>
  )
}

export default function ShoppingPage() {
  const c = useTheme()
  const insets = useSafeAreaInsets()
  const [items, setItems] = useState(INITIAL)
  const toggle = (id) => setItems(xs => xs.map(x => x.id === id ? { ...x, done: !x.done } : x))
  const left = items.filter(x => !x.done).length
  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <ScrollView contentContainerStyle={{ padding: 16, paddingTop: insets.top + 12, paddingBottom: 120 }}>
        <FadeIn>
          <Text style={[st.title, { color: c.text }]}>קניות</Text>
          <Text style={[st.sub, { color: c.text2 }]}>{left} פריטים ברשימה</Text>
        </FadeIn>
        <FadeIn delay={80}>
          <View style={[st.card, { backgroundColor: c.card, borderColor: c.border }]}>
            {items.map((it, i) => <Item key={it.id} it={it} first={i === 0} onToggle={() => toggle(it.id)} />)}
          </View>
        </FadeIn>
      </ScrollView>
    </View>
  )
}
const st = StyleSheet.create({
  title: { fontSize: 30, fontWeight: '800', textAlign: 'right' },
  sub: { fontSize: 13, textAlign: 'right', marginTop: 2, marginBottom: 16 },
  card: { borderWidth: 1, borderRadius: radius.lg, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 15 },
  box: { width: 24, height: 24, borderRadius: 7, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
})
