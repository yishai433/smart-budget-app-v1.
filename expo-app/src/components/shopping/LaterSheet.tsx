import { useState } from 'react'
import { View, Text, TextInput, ScrollView, StyleSheet, Keyboard, Alert } from 'react-native'
import { X, Plus, ArrowUpLeft, Trash2 } from 'lucide-react-native'
import { useTheme } from '../../theme'
import { useData } from '../../context/DataContext'
import { shopCat } from '../../lib/shopCategories'
import BottomSheet, { SHEET_MIN_HEIGHT } from '../BottomSheet'
import Touchable from '../Touchable'

const fail = () => Alert.alert('הפעולה נכשלה', 'בדקו את החיבור לאינטרנט ונסו שוב.')

// "Later" list: jot down things to buy some day, move them to the list when it's time.
export default function LaterSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const c = useTheme()
  const d = useData()
  const [text, setText] = useState('')
  const add = () => { const n = text.trim(); if (!n) return; setText(''); d.addLaterItem(n).catch(fail) }
  const items = d.laterItems

  return (
    <BottomSheet visible={visible} onClose={onClose} avoidKeyboard minHeight={SHEET_MIN_HEIGHT}>
      <View style={s.header}>
        <View>
          <Text style={[s.title, { color: c.text }]}>לקנות בהמשך</Text>
          <Text style={{ fontSize: 12.5, color: c.text2, marginTop: 2 }}>דברים שלא דחופים עכשיו, כדי שלא תשכחו</Text>
        </View>
        <Touchable onPress={onClose} scale={0.9} style={[s.x, { backgroundColor: c.bg }]}><X size={18} color={c.text2} /></Touchable>
      </View>

      <View style={[s.addBar, { backgroundColor: c.bg }]}>
        <TextInput style={{ flex: 1, height: 46, color: c.text, fontSize: 15 }} placeholder="למשל: סוללות, מגבות..." placeholderTextColor={c.text3}
          value={text} onChangeText={setText} onSubmitEditing={add} returnKeyType="done" blurOnSubmit={false} textAlign="right" />
        <Touchable onPress={add} scale={0.88} style={[s.plus, { backgroundColor: c.primary, opacity: text.trim() ? 1 : 0.4 }]}><Plus size={18} color="#fff" /></Touchable>
      </View>

      <ScrollView style={{ flex: 1, marginTop: 12 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        {items.length === 0 ? (
          <Text style={{ color: c.text2, textAlign: 'center', marginTop: 30, fontSize: 14 }}>אין כרגע כלום ברשימה הזאת.</Text>
        ) : items.map((it, i) => {
          const sc = shopCat(it.category)
          return (
            <View key={it.id} style={[s.row, i ? { borderTopColor: c.sep, borderTopWidth: StyleSheet.hairlineWidth } : null]}>
              <View style={[s.icon, { backgroundColor: sc.color + '22' }]}><Text style={{ fontSize: 16 }}>{sc.emoji}</Text></View>
              <Text style={{ flex: 1, fontSize: 15, color: c.text, textAlign: 'right' }}>{it.name}</Text>
              <Touchable onPress={() => d.moveLaterToList([it]).catch(fail)} scale={0.9} style={[s.move, { backgroundColor: c.primaryLight }]}>
                <ArrowUpLeft size={14} color={c.primary} /><Text style={{ fontSize: 12.5, fontWeight: '700', color: c.primary }}>לרשימה</Text>
              </Touchable>
              <Touchable onPress={() => d.deleteLaterItem(it.id).catch(fail)} scale={0.9} style={{ padding: 6 }}><Trash2 size={16} color={c.text3} /></Touchable>
            </View>
          )
        })}
      </ScrollView>

      {items.length > 1 && (
        <Touchable onPress={() => { Keyboard.dismiss(); d.moveLaterToList(items).catch(fail); onClose() }} scale={0.98} style={[s.save, { backgroundColor: c.primary }]}>
          <Text style={{ color: '#fff', fontWeight: '700', fontSize: 15.5 }}>העבר הכל לרשימת הקניות ({items.length})</Text>
        </Touchable>
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
  row: { flexDirection: 'row-reverse', alignItems: 'center', gap: 10, paddingVertical: 11 },
  icon: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  move: { flexDirection: 'row-reverse', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999 },
  save: { borderRadius: 16, paddingVertical: 14, alignItems: 'center', marginTop: 10 },
})
