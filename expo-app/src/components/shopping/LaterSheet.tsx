import { useState, useEffect, useRef } from 'react'
import { View, Text, TextInput, ScrollView, StyleSheet, Keyboard, Alert, Platform } from 'react-native'
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker'
import { X, Plus, ArrowUpLeft, Trash2, Bell, BellRing, ChevronRight } from 'lucide-react-native'
import { useTheme, Theme } from '../../theme'
import { useData } from '../../context/DataContext'
import { shopCat } from '../../lib/shopCategories'
import { ensurePermission, scheduleReminder, cancelReminder, reminderLabel } from '../../lib/reminders'
import BottomSheet, { SHEET_TALL } from '../BottomSheet'
import Touchable from '../Touchable'
import type { LaterItem } from '../../types'

const fail = () => Alert.alert('הפעולה נכשלה', 'בדקו את החיבור לאינטרנט ונסו שוב.')
const pad = (n: number) => String(n).padStart(2, '0')

// Pick when to be reminded: the phone's own time wheel (iOS) / clock (Android), a day in one
// tap, and the result spelled out in a single line.
function ReminderPanel({ c, item, onBack }: { c: Theme; item: LaterItem; onBack: () => void }) {
  const d = useData()
  const [when, setWhen] = useState(() => {
    if (item.remindAt && item.remindAt > Date.now()) return new Date(item.remindAt)
    const t = new Date(); t.setMinutes(0, 0, 0); t.setHours(t.getHours() + 1)
    if (t.getHours() >= 22 || t.getHours() < 7) { if (t.getHours() >= 22) t.setDate(t.getDate() + 1); t.setHours(9) }
    return t
  })
  const [androidPick, setAndroidPick] = useState<'time' | 'date' | null>(null)
  const [iosDate, setIosDate] = useState(false)
  const valid = when.getTime() > Date.now() + 60000
  const dayOff = Math.round((new Date(when).setHours(0, 0, 0, 0) - new Date().setHours(0, 0, 0, 0)) / 86400000)
  const setDay = (off: number) => { const t = new Date(); t.setDate(t.getDate() + off); t.setHours(when.getHours(), when.getMinutes(), 0, 0); setWhen(t); setIosDate(false) }
  const onPick = (_e: DateTimePickerEvent, v?: Date) => {
    setAndroidPick(null)
    if (v) setWhen(v)
  }

  const save = async () => {
    if (!valid) return
    const ok = await ensurePermission()
    if (!ok) { Alert.alert('אין הרשאה להתראות', 'כדי לקבל תזכורת צריך לאשר התראות לאפליקציה בהגדרות של הטלפון.'); return }
    const t = when.getTime()
    d.setLaterReminder(item.id, t).catch(fail)
    scheduleReminder(item.id, item.name, t).catch(() => {})
    onBack()
  }
  const clear = () => { d.setLaterReminder(item.id, null).catch(fail); cancelReminder(item.id); onBack() }
  const hhmm = `${pad(when.getHours())}:${pad(when.getMinutes())}`
  const ios = Platform.OS === 'ios'

  return (
    <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
      <Touchable onPress={onBack} scale={0.96} style={s.back}>
        <ChevronRight size={18} color={c.primary} /><Text style={{ fontSize: 14, fontWeight: '700', color: c.primary }}>חזרה לרשימה</Text>
      </Touchable>

      {/* the answer, big: what you'll get and when */}
      <View style={[s.hero, { backgroundColor: c.primaryLight }]}>
        <BellRing size={20} color={c.primary} />
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 13, color: c.text2, textAlign: 'right' }}>תזכורת על "{item.name}"</Text>
          <Text style={{ fontSize: 22, fontWeight: '800', color: valid ? c.text : c.danger, textAlign: 'right', marginTop: 2 }}>
            {valid ? reminderLabel(when.getTime()) : 'הזמן הזה כבר עבר'}
          </Text>
        </View>
      </View>

      <View style={[s.seg, { backgroundColor: c.bg }]}>
        {[['היום', 0], ['מחר', 1], ['מחרתיים', 2]].map(([lbl, off]) => {
          const on = dayOff === off && !iosDate
          return (
            <Touchable key={lbl as string} onPress={() => setDay(off as number)} scale={0.96} containerStyle={{ flex: 1 }} style={[s.segBtn, on ? { backgroundColor: c.card } : null]}>
              <Text style={{ fontSize: 14.5, fontWeight: on ? '800' : '600', color: on ? c.primary : c.text2 }}>{lbl}</Text>
            </Touchable>
          )
        })}
        <Touchable onPress={() => (ios ? setIosDate(v => !v) : setAndroidPick('date'))} scale={0.96} containerStyle={{ flex: 1 }}
          style={[s.segBtn, dayOff > 2 || iosDate ? { backgroundColor: c.card } : null]}>
          <Text style={{ fontSize: 14.5, fontWeight: dayOff > 2 || iosDate ? '800' : '600', color: dayOff > 2 || iosDate ? c.primary : c.text2 }}>
            {dayOff > 2 ? `${when.getDate()}.${when.getMonth() + 1}` : 'תאריך…'}
          </Text>
        </Touchable>
      </View>

      {ios ? (
        <View style={[s.pickerBox, { backgroundColor: c.bg }]}>
          <DateTimePicker value={when} mode={iosDate ? 'date' : 'time'} display="spinner" locale="he-IL" minuteInterval={5}
            minimumDate={iosDate ? new Date() : undefined} onChange={(_e, v) => v && setWhen(v)} style={{ height: 180 }} />
        </View>
      ) : (
        <Touchable onPress={() => setAndroidPick('time')} scale={0.97} style={[s.timeBtn, { backgroundColor: c.bg }]}>
          <Text style={{ fontSize: 13, color: c.text2 }}>שעה</Text>
          <Text style={{ fontSize: 34, fontWeight: '800', color: c.text, writingDirection: 'ltr' }}>{hhmm}</Text>
          <Text style={{ fontSize: 13, color: c.primary, fontWeight: '700' }}>לחצו לשינוי</Text>
        </Touchable>
      )}
      {androidPick ? (
        <DateTimePicker value={when} mode={androidPick} is24Hour minimumDate={androidPick === 'date' ? new Date() : undefined} onChange={onPick} />
      ) : null}

      <Touchable onPress={save} disabled={!valid} scale={0.98} style={[s.save, { backgroundColor: c.primary, opacity: valid ? 1 : 0.4 }]}>
        <Text style={{ color: '#fff', fontWeight: '700', fontSize: 16 }}>שמירת תזכורת</Text>
      </Touchable>
      {item.remindAt ? (
        <Touchable onPress={clear} scale={0.98} style={{ alignItems: 'center', paddingVertical: 12 }}>
          <Text style={{ color: c.danger, fontWeight: '700', fontSize: 14 }}>ביטול התזכורת</Text>
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
  hero: { flexDirection: 'row-reverse', alignItems: 'center', gap: 12, borderRadius: 18, padding: 16 },
  seg: { flexDirection: 'row-reverse', borderRadius: 14, padding: 4, gap: 4, marginTop: 14 },
  segBtn: { alignItems: 'center', justifyContent: 'center', paddingVertical: 10, borderRadius: 11 },
  pickerBox: { borderRadius: 18, marginTop: 12, overflow: 'hidden', alignItems: 'center' },
  timeBtn: { alignItems: 'center', borderRadius: 18, paddingVertical: 16, marginTop: 12, gap: 2 },
  summary: { flexDirection: 'row-reverse', alignItems: 'center', gap: 8, borderRadius: 14, padding: 14, marginTop: 18 },
})
