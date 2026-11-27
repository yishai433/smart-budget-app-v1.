import { useState, useEffect, useRef } from 'react'
import { View, Text, TextInput, ScrollView, StyleSheet, Keyboard, Alert } from 'react-native'
import { X, Plus, ArrowUpLeft, Trash2, Bell, BellRing, ChevronRight, ChevronUp, ChevronDown } from 'lucide-react-native'
import { useTheme, Theme } from '../../theme'
import { useData } from '../../context/DataContext'
import { shopCat } from '../../lib/shopCategories'
import { ensurePermission, scheduleReminder, cancelReminder, reminderLabel } from '../../lib/reminders'
import BottomSheet, { SHEET_TALL } from '../BottomSheet'
import Touchable from '../Touchable'
import type { LaterItem } from '../../types'

const fail = () => Alert.alert('הפעולה נכשלה', 'בדקו את החיבור לאינטרנט ונסו שוב.')
const DAYS = ['א׳', 'ב׳', 'ג׳', 'ד׳', 'ה׳', 'ו׳', 'ש׳']
const at = (dayOffset: number, hour: number, minute = 0) => { const d = new Date(); d.setDate(d.getDate() + dayOffset); d.setHours(hour, minute, 0, 0); return d.getTime() }
const pad = (n: number) => String(n).padStart(2, '0')

function Chip({ c, label, on, onPress }: { c: Theme; label: string; on: boolean; onPress: () => void }) {
  return (
    <Touchable onPress={onPress} scale={0.94}>
      <View style={[s.chip, { backgroundColor: on ? c.primary : c.bg }]}>
        <Text style={{ fontSize: 13.5, fontWeight: '700', color: on ? '#fff' : c.text }}>{label}</Text>
      </View>
    </Touchable>
  )
}

// A single up/down wheel for hour or minute.
function Wheel({ c, value, onChange, step = 1, max }: { c: Theme; value: number; onChange: (v: number) => void; step?: number; max: number }) {
  const set = (delta: number) => onChange((value + delta * step + (max + 1)) % (max + 1))
  return (
    <View style={{ alignItems: 'center' }}>
      <Touchable onPress={() => set(1)} scale={0.85} style={[s.wheelBtn, { backgroundColor: c.bg }]}><ChevronUp size={20} color={c.text} /></Touchable>
      <Text style={{ fontSize: 34, fontWeight: '800', color: c.text, width: 62, textAlign: 'center' }}>{pad(value)}</Text>
      <Touchable onPress={() => set(-1)} scale={0.85} style={[s.wheelBtn, { backgroundColor: c.bg }]}><ChevronDown size={20} color={c.text} /></Touchable>
    </View>
  )
}

// Pick when to be reminded about one item: choose a day, then set the exact time.
function ReminderPanel({ c, item, onBack }: { c: Theme; item: LaterItem; onBack: () => void }) {
  const d = useData()
  const now = new Date()
  const [day, setDay] = useState(0)
  const [hour, setHour] = useState((now.getHours() + 1) % 24)
  const [minute, setMinute] = useState(0)
  const when = at(day, hour, minute)
  const valid = when > Date.now() + 60000

  const save = async () => {
    if (!valid) return
    const ok = await ensurePermission()
    if (!ok) { Alert.alert('אין הרשאה להתראות', 'כדי לקבל תזכורת צריך לאשר התראות לאפליקציה בהגדרות של הטלפון.'); return }
    d.setLaterReminder(item.id, when).catch(fail)
    scheduleReminder(item.id, item.name, when).catch(() => {})
    onBack()
  }
  const clear = () => { d.setLaterReminder(item.id, null).catch(fail); cancelReminder(item.id); onBack() }

  return (
    <ScrollView style={{ flex: 1 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
      <Touchable onPress={onBack} scale={0.96} style={s.back}>
        <ChevronRight size={18} color={c.primary} /><Text style={{ fontSize: 14, fontWeight: '700', color: c.primary }}>חזרה לרשימה</Text>
      </Touchable>
      <Text style={{ fontSize: 17, fontWeight: '800', color: c.text, textAlign: 'right' }}>מתי להזכיר על "{item.name}"?</Text>

      <Text style={[s.label, { color: c.text2 }]}>יום</Text>
      <View style={s.wrap}>
        {Array.from({ length: 8 }, (_, i) => {
          const dt = new Date(); dt.setDate(dt.getDate() + i)
          const label = i === 0 ? 'היום' : i === 1 ? 'מחר' : `${DAYS[dt.getDay()]} ${dt.getDate()}.${dt.getMonth() + 1}`
          return <Chip key={i} c={c} label={label} on={day === i} onPress={() => setDay(i)} />
        })}
      </View>

      <Text style={[s.label, { color: c.text2 }]}>שעה</Text>
      <View style={[s.clock, { backgroundColor: c.card, borderColor: c.border }]}>
        <Wheel c={c} value={minute} onChange={setMinute} step={5} max={59} />
        <Text style={{ fontSize: 34, fontWeight: '800', color: c.text3, marginHorizontal: 4 }}>:</Text>
        <Wheel c={c} value={hour} onChange={setHour} max={23} />
      </View>
      <View style={[s.wrap, { marginTop: 10, justifyContent: 'center' }]}>
        {[['בוקר', 8], ['צהריים', 13], ['אחה״צ', 17], ['ערב', 20]].map(([lbl, h]) => (
          <Chip key={lbl as string} c={c} label={lbl as string} on={hour === h && minute === 0} onPress={() => { setHour(h as number); setMinute(0) }} />
        ))}
      </View>

      <View style={[s.summary, { backgroundColor: c.primaryLight }]}>
        <BellRing size={17} color={c.primary} />
        <Text style={{ flex: 1, fontSize: 14, fontWeight: '700', color: valid ? c.text : c.danger, textAlign: 'right' }}>
          {valid ? `תזכורת ${reminderLabel(when)}` : 'הזמן הזה כבר עבר, בחרו מאוחר יותר'}
        </Text>
      </View>
      <Touchable onPress={save} disabled={!valid} scale={0.98} style={[s.save, { backgroundColor: c.primary, opacity: valid ? 1 : 0.4 }]}>
        <Text style={{ color: '#fff', fontWeight: '700', fontSize: 15.5 }}>קביעת תזכורת</Text>
      </Touchable>
      {item.remindAt ? (
        <Touchable onPress={clear} scale={0.98} style={[s.save, { backgroundColor: c.bg }]}>
          <Text style={{ color: c.danger, fontWeight: '700', fontSize: 15 }}>ביטול התזכורת</Text>
        </Touchable>
      ) : null}
      <View style={{ height: 12 }} />
    </ScrollView>
  )
}

// "Buy later": jot things down, get a reminder, move them to the list when it's time.
export default function LaterSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const c = useTheme()
  const d = useData()
  // uncontrolled box: typing doesn't re-render the whole list
  const inputRef = useRef<TextInput>(null)
  const textRef = useRef('')
  const [hasText, setHasText] = useState(false)
  const [remindId, setRemindId] = useState<string | null>(null)
  useEffect(() => { if (!visible) setRemindId(null) }, [visible])
  const add = () => { const n = textRef.current.trim(); if (!n) return; inputRef.current?.clear(); textRef.current = ''; setHasText(false); d.addLaterItem(n).catch(fail) }
  const items = d.laterItems
  const remindItem = items.find(i => i.id === remindId) || null
  const move = (list: LaterItem[]) => { list.forEach(i => cancelReminder(i.id)); d.moveLaterToList(list).catch(fail) }
  const remove = (i: LaterItem) => { cancelReminder(i.id); d.deleteLaterItem(i.id).catch(fail) }

  return (
    <BottomSheet visible={visible} onClose={onClose} avoidKeyboard minHeight={SHEET_TALL}>
      <View style={s.header}>
        <View>
          <Text style={[s.title, { color: c.text }]}>לקנות בהמשך</Text>
          <Text style={{ fontSize: 12.5, color: c.text2, marginTop: 2 }}>לא דחוף עכשיו? רשמו, ואפשר לקבל תזכורת</Text>
        </View>
        <Touchable onPress={onClose} scale={0.9} style={[s.x, { backgroundColor: c.bg }]}><X size={18} color={c.text2} /></Touchable>
      </View>

      {remindItem ? <ReminderPanel c={c} item={remindItem} onBack={() => setRemindId(null)} /> : (
        <>
          <View style={[s.addBar, { backgroundColor: c.bg }]}>
            <TextInput style={{ flex: 1, height: 46, color: c.text, fontSize: 15 }} placeholder="למשל: סוללות, מגבות..." placeholderTextColor={c.text3}
              ref={inputRef} onChangeText={v => { textRef.current = v; setHasText(!!v.trim()) }} onSubmitEditing={add} returnKeyType="done" blurOnSubmit={false} textAlign="right" />
            <Touchable onPress={add} scale={0.88} style={[s.plus, { backgroundColor: c.primary, opacity: hasText ? 1 : 0.4 }]}><Plus size={18} color="#fff" /></Touchable>
          </View>

          <ScrollView style={{ flex: 1, marginTop: 12 }} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" showsVerticalScrollIndicator={false}>
            {items.length === 0 ? (
              <Text style={{ color: c.text2, textAlign: 'center', marginTop: 30, fontSize: 14 }}>אין כרגע כלום ברשימה הזאת.</Text>
            ) : items.map((it, i) => {
              const sc = shopCat(it.category)
              const has = !!it.remindAt && it.remindAt > Date.now()
              return (
                <View key={it.id} style={[s.row, i ? { borderTopColor: c.sep, borderTopWidth: StyleSheet.hairlineWidth } : null]}>
                  <View style={[s.icon, { backgroundColor: sc.color + '22' }]}><Text style={{ fontSize: 16 }}>{sc.emoji}</Text></View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 15, color: c.text, textAlign: 'right' }}>{it.name}</Text>
                    {has ? <Text style={{ fontSize: 11.5, color: c.primary, fontWeight: '700', textAlign: 'right', marginTop: 2 }}>🔔 {reminderLabel(it.remindAt as number)}</Text> : null}
                  </View>
                  <Touchable onPress={() => { Keyboard.dismiss(); setRemindId(it.id) }} scale={0.9} style={[s.iconBtn, { backgroundColor: has ? c.primaryLight : c.bg }]}>
                    <Bell size={16} color={has ? c.primary : c.text2} />
                  </Touchable>
                  <Touchable onPress={() => move([it])} scale={0.9} style={[s.move, { backgroundColor: c.primaryLight }]}>
                    <ArrowUpLeft size={14} color={c.primary} /><Text style={{ fontSize: 12.5, fontWeight: '700', color: c.primary }}>לרשימה</Text>
                  </Touchable>
                  <Touchable onPress={() => remove(it)} scale={0.9} style={{ padding: 6 }}><Trash2 size={16} color={c.text3} /></Touchable>
                </View>
              )
            })}
          </ScrollView>

          {items.length > 1 && (
            <Touchable onPress={() => Alert.alert('למחוק את כל הרשימה?', `${items.length} פריטים יימחקו מ"לקנות בהמשך".`, [
              { text: 'ביטול', style: 'cancel' },
              { text: 'מחיקה', style: 'destructive', onPress: () => items.forEach(remove) },
            ])} scale={0.96} style={{ alignSelf: 'center', paddingVertical: 8, marginTop: 4 }}>
              <Text style={{ fontSize: 13, fontWeight: '700', color: c.danger }}>מחיקת כל הרשימה</Text>
            </Touchable>
          )}
          {items.length > 1 && (
            <Touchable onPress={() => { Keyboard.dismiss(); move(items); onClose() }} scale={0.98} style={[s.save, { backgroundColor: c.primary }]}>
              <Text style={{ color: '#fff', fontWeight: '700', fontSize: 15.5 }}>העבר הכל לרשימת הקניות ({items.length})</Text>
            </Touchable>
          )}
        </>
      )}
    </BottomSheet>
  )
}

const s = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  title: { fontSize: 18, fontWeight: '700' },
  x: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  addBar: { flexDirection: 'row-reverse', alignItems: 'center', gap: 8, borderRadius: 14, paddingLeft: 6, paddingRight: 14 },
  plus: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  row: { flexDirection: 'row-reverse', alignItems: 'center', gap: 8, paddingVertical: 11 },
  icon: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  iconBtn: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  move: { flexDirection: 'row-reverse', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 7, borderRadius: 999 },
  save: { borderRadius: 16, paddingVertical: 14, alignItems: 'center', marginTop: 10 },
  back: { flexDirection: 'row-reverse', alignItems: 'center', gap: 2, alignSelf: 'flex-end', marginBottom: 10 },
  label: { fontSize: 12.5, fontWeight: '700', textAlign: 'right', marginTop: 16, marginBottom: 8 },
  wrap: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 13, paddingVertical: 9, borderRadius: 999 },
  clock: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, borderWidth: 1, borderRadius: 18, paddingVertical: 14, marginTop: 4 },
  wheelBtn: { width: 52, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginVertical: 4 },
  summary: { flexDirection: 'row-reverse', alignItems: 'center', gap: 8, borderRadius: 14, padding: 14, marginTop: 18 },
})
