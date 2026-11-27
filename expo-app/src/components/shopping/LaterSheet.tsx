import { useState, useEffect } from 'react'
import { View, Text, TextInput, ScrollView, StyleSheet, Keyboard, Alert } from 'react-native'
import { X, Plus, ArrowUpLeft, Trash2, Bell, BellRing, ChevronRight } from 'lucide-react-native'
import { useTheme, Theme } from '../../theme'
import { useData } from '../../context/DataContext'
import { shopCat } from '../../lib/shopCategories'
import { ensurePermission, scheduleReminder, cancelReminder, reminderLabel } from '../../lib/reminders'
import BottomSheet, { SHEET_MIN_HEIGHT } from '../BottomSheet'
import Touchable from '../Touchable'
import type { LaterItem } from '../../types'

const fail = () => Alert.alert('הפעולה נכשלה', 'בדקו את החיבור לאינטרנט ונסו שוב.')
const DAYS = ['א׳', 'ב׳', 'ג׳', 'ד׳', 'ה׳', 'ו׳', 'ש׳']
const HOURS = [8, 10, 12, 16, 18, 20]

const at = (dayOffset: number, hour: number, minute = 0) => { const d = new Date(); d.setDate(d.getDate() + dayOffset); d.setHours(hour, minute, 0, 0); return d.getTime() }
function quickOptions(): { label: string; at: number }[] {
  const now = new Date()
  const opts = [{ label: 'בעוד שעה', at: Date.now() + 3600 * 1000 }]
  if (now.getHours() < 19) opts.push({ label: 'הערב ב-20:00', at: at(0, 20) })
  opts.push({ label: 'מחר ב-9:00', at: at(1, 9) })
  const toFri = (5 - now.getDay() + 7) % 7 || 7
  if (toFri > 1) opts.push({ label: 'ביום שישי ב-9:00', at: at(toFri, 9) })
  opts.push({ label: 'בעוד שבוע', at: at(7, 9) })
  return opts
}

function Chip({ c, label, on, onPress }: { c: Theme; label: string; on: boolean; onPress: () => void }) {
  return (
    <Touchable onPress={onPress} scale={0.94}>
      <View style={[s.chip, { backgroundColor: on ? c.primary : c.bg }]}>
        <Text style={{ fontSize: 13.5, fontWeight: '700', color: on ? '#fff' : c.text }}>{label}</Text>
      </View>
    </Touchable>
  )
}

// Pick when to be reminded about one item.
function ReminderPanel({ c, item, onBack }: { c: Theme; item: LaterItem; onBack: () => void }) {
  const d = useData()
  const [day, setDay] = useState(1)
  const [hour, setHour] = useState(9)
  const [picked, setPicked] = useState<number | null>(null)
  const when = picked ?? at(day, hour)
  const valid = when > Date.now() + 60000

  const save = async () => {
    if (!valid) return
    const ok = await ensurePermission()
    if (!ok) { Alert.alert('אין הרשאה להתראות', 'כדי לקבל תזכורת צריך לאשר התראות לאפליקציה בהגדרות של האייפון.'); return }
    d.setLaterReminder(item.id, when).catch(fail)
    scheduleReminder(item.id, item.name, when).catch(() => {})
    onBack()
  }
  const clear = () => { d.setLaterReminder(item.id, null).catch(fail); cancelReminder(item.id); onBack() }

  return (
    <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
      <Touchable onPress={onBack} scale={0.96} style={s.back}>
        <ChevronRight size={18} color={c.primary} /><Text style={{ fontSize: 14, fontWeight: '700', color: c.primary }}>חזרה לרשימה</Text>
      </Touchable>
      <Text style={{ fontSize: 17, fontWeight: '800', color: c.text, textAlign: 'right' }}>מתי להזכיר על "{item.name}"?</Text>

      <Text style={[s.label, { color: c.text2 }]}>מהיר</Text>
      <View style={s.wrap}>
        {quickOptions().map(o => <Chip key={o.label} c={c} label={o.label} on={picked === o.at} onPress={() => setPicked(o.at)} />)}
      </View>

      <Text style={[s.label, { color: c.text2 }]}>או בחרו יום ושעה</Text>
      <View style={s.wrap}>
        {Array.from({ length: 8 }, (_, i) => {
          const dt = new Date(); dt.setDate(dt.getDate() + i)
          const label = i === 0 ? 'היום' : i === 1 ? 'מחר' : `${DAYS[dt.getDay()]} ${dt.getDate()}.${dt.getMonth() + 1}`
          return <Chip key={i} c={c} label={label} on={picked === null && day === i} onPress={() => { setPicked(null); setDay(i) }} />
        })}
      </View>
      <View style={[s.wrap, { marginTop: 8 }]}>
        {HOURS.map(h => <Chip key={h} c={c} label={`${h}:00`} on={picked === null && hour === h} onPress={() => { setPicked(null); setHour(h) }} />)}
      </View>

      <View style={[s.summary, { backgroundColor: c.primaryLight }]}>
        <BellRing size={17} color={c.primary} />
        <Text style={{ flex: 1, fontSize: 14, fontWeight: '700', color: valid ? c.text : c.danger, textAlign: 'right' }}>
          {valid ? `תזכורת ${reminderLabel(when)}` : 'השעה הזאת כבר עברה, בחרו זמן אחר'}
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
  const [text, setText] = useState('')
  const [remindId, setRemindId] = useState<string | null>(null)
  useEffect(() => { if (!visible) setRemindId(null) }, [visible])
  const add = () => { const n = text.trim(); if (!n) return; setText(''); d.addLaterItem(n).catch(fail) }
  const items = d.laterItems
  const remindItem = items.find(i => i.id === remindId) || null
  const move = (list: LaterItem[]) => { list.forEach(i => cancelReminder(i.id)); d.moveLaterToList(list).catch(fail) }
  const remove = (i: LaterItem) => { cancelReminder(i.id); d.deleteLaterItem(i.id).catch(fail) }

  return (
    <BottomSheet visible={visible} onClose={onClose} avoidKeyboard minHeight={SHEET_MIN_HEIGHT}>
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
              value={text} onChangeText={setText} onSubmitEditing={add} returnKeyType="done" blurOnSubmit={false} textAlign="right" />
            <Touchable onPress={add} scale={0.88} style={[s.plus, { backgroundColor: c.primary, opacity: text.trim() ? 1 : 0.4 }]}><Plus size={18} color="#fff" /></Touchable>
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
  summary: { flexDirection: 'row-reverse', alignItems: 'center', gap: 8, borderRadius: 14, padding: 14, marginTop: 18 },
})
