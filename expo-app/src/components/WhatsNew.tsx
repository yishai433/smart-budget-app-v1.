import { View, Text, StyleSheet } from 'react-native'
import { Bell, ChevronLeft } from 'lucide-react-native'
import { useTheme } from '../theme'
import { useData } from '../context/DataContext'
import { summarize } from '../lib/activityText'
import Touchable from './Touchable'

// "What's new": what the others in the house changed since I last looked, in a sentence per
// person (not a dump of every row). Tap for the full list; "הבנתי" clears it.
export default function WhatsNew({ onOpen }: { onOpen: () => void }) {
  const c = useTheme()
  const d = useData()
  const list = d.unseenActivity
  if (!list.length) return null
  const people = summarize(list)

  return (
    <View style={[s.card, { backgroundColor: c.card, borderColor: c.primary + '66' }]}>
      <Touchable onPress={onOpen} scale={0.99} style={s.top}>
        <View style={[s.bell, { backgroundColor: c.primaryLight }]}><Bell size={17} color={c.primary} /></View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 12, fontWeight: '700', color: c.primary, textAlign: 'right' }}>מה חדש מאז שנכנסת</Text>
          {people.map(p => (
            <View key={p.by} style={{ marginTop: 4 }}>
              <Text style={{ fontSize: 15, fontWeight: '800', color: c.text, textAlign: 'right' }}>{p.name}</Text>
              {p.lines.map(l => <Text key={l} style={{ fontSize: 13.5, color: c.text2, textAlign: 'right', marginTop: 1 }}>• {l}</Text>)}
            </View>
          ))}
        </View>
        <ChevronLeft size={18} color={c.text3} />
      </Touchable>
      <View style={[s.btns, { borderTopColor: c.sep }]}>
        <Touchable onPress={onOpen} scale={0.97} containerStyle={{ flex: 1 }} style={s.btn}>
          <Text style={{ fontSize: 14, fontWeight: '700', color: c.primary }}>לפרטים</Text>
        </Touchable>
        <View style={{ width: StyleSheet.hairlineWidth, backgroundColor: c.sep }} />
        <Touchable onPress={() => d.markActivitySeen().catch(() => {})} scale={0.97} containerStyle={{ flex: 1 }} style={s.btn}>
          <Text style={{ fontSize: 14, fontWeight: '700', color: c.text2 }}>הבנתי</Text>
        </Touchable>
      </View>
    </View>
  )
}

const s = StyleSheet.create({
  card: { borderWidth: 1.5, borderRadius: 20, marginTop: 12, overflow: 'hidden' },
  top: { flexDirection: 'row-reverse', alignItems: 'flex-start', gap: 12, padding: 14 },
  bell: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  btns: { flexDirection: 'row-reverse', borderTopWidth: StyleSheet.hairlineWidth },
  btn: { alignItems: 'center', paddingVertical: 12 },
})
