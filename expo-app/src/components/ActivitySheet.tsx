import { useMemo, useState } from 'react'
import { View, Text, ScrollView, StyleSheet } from 'react-native'
import { X } from 'lucide-react-native'
import { useTheme, Theme } from '../theme'
import { useData } from '../context/DataContext'
import { formatAmount } from '../lib/money'
import { describe, dayLabel, timeOf, firstName, Tone } from '../lib/activityText'
import type { Activity } from '../types'
import BottomSheet, { SHEET_TALL } from './BottomSheet'
import Touchable from './Touchable'

export const toneColor = (c: Theme, t: Tone) =>
  t === 'income' ? c.success : t === 'expense' ? c.text : t === 'danger' ? c.danger : t === 'saving' ? c.primary : c.text2

export function ActivityRow({ a, c, me, first, fresh }: { a: Activity; c: Theme; me?: string | null; first?: boolean; fresh?: boolean }) {
  const d = describe(a)
  const col = toneColor(c, d.tone)
  const who = a.by === me ? 'את/ה' : firstName(a.name)
  return (
    <View style={[st.row, first ? null : { borderTopColor: c.sep, borderTopWidth: StyleSheet.hairlineWidth }]}>
      <View style={[st.ic, { backgroundColor: (d.tone === 'neutral' ? c.text3 : col) + '1F' }]}><d.Icon size={17} color={d.tone === 'expense' ? c.text2 : col} /></View>
      <View style={{ flex: 1 }}>
        <Text numberOfLines={1} style={{ fontSize: 14.5, fontWeight: '600', color: c.text, textAlign: 'right' }}>{d.title}</Text>
        {d.detail ? <Text numberOfLines={1} style={{ fontSize: 12.5, color: c.text2, textAlign: 'right', marginTop: 2 }}>{d.detail}</Text> : null}
        <Text style={{ fontSize: 11.5, color: c.text3, textAlign: 'right', marginTop: 3 }}>
          {who} · {timeOf(a.at)}{fresh ? '  ' : ''}{fresh ? <Text style={{ color: c.primary, fontWeight: '800' }}>● חדש</Text> : null}
        </Text>
      </View>
      {d.amount != null ? (
        <Text style={{ fontSize: 15, fontWeight: '800', color: d.amount > 0 ? (d.tone === 'income' ? c.success : c.primary) : c.text }}>
          {d.amount > 0 ? '+' : '−'}{formatAmount(Math.abs(d.amount))}
        </Text>
      ) : null}
    </View>
  )
}

// Everything that changed in the household in the last 30 days, by day, filterable by person.
export default function ActivitySheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const c = useTheme()
  const d = useData()
  const [who, setWho] = useState<string>('all')
  const people = useMemo(() => {
    const m = new Map<string, string>()
    d.activity.forEach(a => { if (!m.has(a.by)) m.set(a.by, a.by === d.uid ? 'אני' : firstName(a.name)) })
    return [...m.entries()]
  }, [d.activity, d.uid])
  const fresh = new Set(d.unseenActivity.map(a => a.id))
  const list = who === 'all' ? d.activity : d.activity.filter(a => a.by === who)
  const days: { label: string; items: Activity[] }[] = []
  list.slice(0, 200).forEach(a => {
    const l = dayLabel(a.at)
    const last = days[days.length - 1]
    if (last && last.label === l) last.items.push(a); else days.push({ label: l, items: [a] })
  })
  const close = () => { if (d.unseenActivity.length) d.markActivitySeen().catch(() => {}); onClose() }

  return (
    <BottomSheet visible={visible} onClose={close} minHeight={SHEET_TALL}>
      <View style={st.header}>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 18, fontWeight: '800', color: c.text, textAlign: 'right' }}>מה השתנה בבית</Text>
          <Text style={{ fontSize: 12.5, color: c.text2, textAlign: 'right', marginTop: 2 }}>שינויים חשובים מ-30 הימים האחרונים</Text>
        </View>
        <Touchable onPress={close} scale={0.9} style={[st.x, { backgroundColor: c.bg }]}><X size={18} color={c.text2} /></Touchable>
      </View>

      {people.length > 1 ? (
        <View style={[st.seg, { backgroundColor: c.bg }]}>
          {[['all', 'כולם'] as [string, string], ...people].map(([id, nm]) => {
            const on = who === id
            return (
              <Touchable key={id} onPress={() => setWho(id)} scale={0.96} containerStyle={{ flex: 1 }} style={[st.segBtn, on ? { backgroundColor: c.card } : null]}>
                <Text numberOfLines={1} style={{ fontSize: 14, fontWeight: on ? '800' : '600', color: on ? c.primary : c.text2 }}>{nm}</Text>
              </Touchable>
            )
          })}
        </View>
      ) : null}

      <ScrollView style={{ flex: 1, marginTop: 6 }} showsVerticalScrollIndicator={false}>
        {days.length === 0 ? (
          <Text style={{ color: c.text2, textAlign: 'center', marginTop: 40, fontSize: 14, lineHeight: 21 }}>
            עוד אין שינויים.{'\n'}כאן יופיעו הוצאות, הכנסות, שינויי תקציב וחיסכון שכל אחד בבית עושה.
          </Text>
        ) : days.map(day => (
          <View key={day.label} style={{ marginTop: 12 }}>
            <Text style={{ fontSize: 12.5, fontWeight: '800', color: c.text2, textAlign: 'right', marginBottom: 6 }}>{day.label}</Text>
            <View style={[st.card, { backgroundColor: c.card, borderColor: c.border }]}>
              {day.items.map((a, i) => <ActivityRow key={a.id} a={a} c={c} me={d.uid} first={i === 0} fresh={fresh.has(a.id)} />)}
            </View>
          </View>
        ))}
        <View style={{ height: 20 }} />
      </ScrollView>
    </BottomSheet>
  )
}

const st = StyleSheet.create({
  header: { flexDirection: 'row-reverse', alignItems: 'center', gap: 10, marginBottom: 12 },
  x: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  seg: { flexDirection: 'row-reverse', borderRadius: 14, padding: 4, gap: 4 },
  segBtn: { alignItems: 'center', justifyContent: 'center', paddingVertical: 9, borderRadius: 11 },
  card: { borderWidth: 1, borderRadius: 16, overflow: 'hidden' },
  row: { flexDirection: 'row-reverse', alignItems: 'center', gap: 12, paddingVertical: 12, paddingHorizontal: 12 },
  ic: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
})
