import { useState, useEffect, useMemo } from 'react'
import { View, Text, TextInput, ScrollView, StyleSheet, Switch, Keyboard, Alert } from 'react-native'
import { X } from 'lucide-react-native'
import { useTheme } from '../../theme'
import { useData } from '../../context/DataContext'
import { money } from '../../lib/money'
import BottomSheet from '../BottomSheet'
import Touchable from '../Touchable'

// Finish a trip: shows the total, optionally records it as a food expense with the
// supermarket's name, remembers the list for next time and clears it.
export default function CheckoutSheet({ visible, total, count, onClose, onDone }: { visible: boolean; total: number; count: number; onClose: () => void; onDone: () => void }) {
  const c = useTheme()
  const d = useData()
  const [addExpense, setAddExpense] = useState(true)
  const [store, setStore] = useState('')
  useEffect(() => { if (visible) { setAddExpense(true); setStore('') } }, [visible])

  // Recent supermarkets from past trips, so the name is one tap.
  const recent = useMemo(() => {
    const seen: string[] = []
    d.transactions.forEach(t => {
      const n = (t.isShoppingTrip && t.description || '').trim()
      if (n && n !== 'קניות בסופר' && n !== 'קניות' && !seen.includes(n)) seen.push(n)
    })
    return seen.slice(0, 6)
  }, [d.transactions])

  const confirm = () => {
    Keyboard.dismiss()
    d.checkoutShopping(total, { addExpense, supermarket: store }).catch(() => Alert.alert('השמירה נכשלה', 'בדקו את החיבור לאינטרנט ונסו שוב.'))
    onClose(); onDone()
  }

  return (
    <BottomSheet visible={visible} onClose={onClose} avoidKeyboard>
      <View style={s.header}>
        <Text style={[s.title, { color: c.text }]}>סיום קנייה</Text>
        <Touchable onPress={onClose} scale={0.9} style={[s.x, { backgroundColor: c.bg }]}><X size={18} color={c.text2} /></Touchable>
      </View>

      <View style={{ alignItems: 'center', paddingVertical: 10 }}>
        <Text style={{ fontSize: 13, color: c.text2, fontWeight: '600' }}>{count} מוצרים בעגלה</Text>
        <Text style={{ fontSize: 40, fontWeight: '800', color: c.text, marginTop: 4 }}>{money(total)}</Text>
      </View>

      <View style={[s.toggle, { backgroundColor: c.bg }]}>
        <Switch value={addExpense} onValueChange={setAddExpense} trackColor={{ true: c.primary, false: undefined }} />
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 15, fontWeight: '700', color: c.text, textAlign: 'right' }}>לרשום כהוצאה במזון</Text>
          <Text style={{ fontSize: 12.5, color: c.text2, marginTop: 2, textAlign: 'right' }}>
            {addExpense ? (total > 0 ? `תירשם הוצאה של ${money(total)}` : 'לא הוזנו מחירים, לא תירשם הוצאה') : 'לא תירשם הוצאה'}
          </Text>
        </View>
      </View>

      <Text style={{ fontSize: 13, fontWeight: '700', color: c.text2, textAlign: 'right', marginTop: 16, marginBottom: 8 }}>באיזה סופר קניתם?</Text>
      {recent.length > 0 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} keyboardShouldPersistTaps="handled" style={{ flexGrow: 0, marginBottom: 8, transform: [{ scaleX: -1 }] }} contentContainerStyle={{ gap: 8 }}>
          {recent.map(n => (
            <Touchable key={n} onPress={() => setStore(n)} scale={0.94} style={{ transform: [{ scaleX: -1 }] }}>
              <View style={[s.chip, { backgroundColor: store === n ? c.primaryLight : c.bg, borderColor: store === n ? c.primary : 'transparent' }]}>
                <Text style={{ fontSize: 13, fontWeight: '600', color: c.text }}>{n}</Text>
              </View>
            </Touchable>
          ))}
        </ScrollView>
      )}
      <TextInput style={[s.input, { backgroundColor: c.bg, color: c.text }]} placeholder="שם הסופר (לא חובה)" placeholderTextColor={c.text3}
        value={store} onChangeText={setStore} textAlign="right" returnKeyType="done" onSubmitEditing={Keyboard.dismiss} />

      <Text style={{ fontSize: 12, color: c.text3, textAlign: 'center', marginTop: 12 }}>הרשימה והמחירים יישמרו כ"הקנייה האחרונה" לפעם הבאה</Text>

      <Touchable onPress={confirm} scale={0.98} style={[s.save, { backgroundColor: c.primary }]}>
        <Text style={{ color: '#fff', fontWeight: '700', fontSize: 16 }}>סיימתי, נקה את הרשימה</Text>
      </Touchable>
    </BottomSheet>
  )
}

const s = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
  title: { fontSize: 18, fontWeight: '700' },
  x: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  toggle: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 14, padding: 14, marginTop: 8 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, borderWidth: 1.5 },
  input: { borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12, fontSize: 15 },
  save: { borderRadius: 16, paddingVertical: 15, alignItems: 'center', marginTop: 14 },
})
