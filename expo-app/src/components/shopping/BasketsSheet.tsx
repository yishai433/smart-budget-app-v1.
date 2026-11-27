import { useState } from 'react'
import { View, Text, TextInput, ScrollView, StyleSheet, Keyboard, Alert } from 'react-native'
import { X, Trash2, History, Sparkles, ShoppingBasket, Save } from 'lucide-react-native'
import { useTheme, Theme } from '../../theme'
import { useData } from '../../context/DataContext'
import { STARTER_BASKET, shopCat } from '../../lib/shopCategories'
import { formatAmount } from '../../lib/money'
import BottomSheet, { SHEET_MIN_HEIGHT } from '../BottomSheet'
import Touchable from '../Touchable'
import type { BasketItem } from '../../types'

const fail = () => Alert.alert('הפעולה נכשלה', 'בדקו את החיבור לאינטרנט ונסו שוב.')
const est = (items: BasketItem[]) => items.reduce((a, i) => a + (i.estimatedPrice || 0) * (i.quantity || 1), 0)

function BasketCard({ c, Icon, tint, name, items, onLoad, onDelete, onSave }: {
  c: Theme; Icon: typeof History; tint: string; name: string; items: BasketItem[]; onLoad: () => void; onDelete?: () => void; onSave?: () => void
}) {
  const total = est(items)
  const emojis = Array.from(new Set(items.map(i => shopCat(i.category).emoji))).slice(0, 5).join(' ')
  return (
    <View style={[s.card, { backgroundColor: c.bg }]}>
      <View style={s.cardTop}>
        <View style={[s.cardIcon, { backgroundColor: tint }]}><Icon size={18} color={c.primary} /></View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 15.5, fontWeight: '700', color: c.text, textAlign: 'right' }}>{name}</Text>
          <Text style={{ fontSize: 12.5, color: c.text2, marginTop: 2, textAlign: 'right' }}>
            {items.length} פריטים{total > 0 ? ` · כ-${formatAmount(total)}` : ''}{emojis ? `  ${emojis}` : ''}
          </Text>
        </View>
      </View>
      <View style={s.cardActions}>
        <Touchable onPress={onLoad} scale={0.96} containerStyle={{ flex: 1 }} style={[s.btn, { backgroundColor: c.primary }]}>
          <Text style={{ color: '#fff', fontWeight: '700', fontSize: 14 }}>הוסף לרשימה</Text>
        </Touchable>
        {onSave ? (
          <Touchable onPress={onSave} scale={0.9} style={[s.iconBtn, { backgroundColor: c.card }]}><Save size={16} color={c.text2} /></Touchable>
        ) : null}
        {onDelete ? (
          <Touchable onPress={onDelete} scale={0.9} style={[s.iconBtn, { backgroundColor: c.card }]}><Trash2 size={16} color={c.danger} /></Touchable>
        ) : null}
      </View>
    </View>
  )
}

// Saved baskets ("weekly shop", "Shabbat"...): load one into the list with a tap,
// or save the current list as a new basket.
export default function BasketsSheet({ visible, onClose, onLoaded }: { visible: boolean; onClose: () => void; onLoaded: (n: number) => void }) {
  const c = useTheme()
  const d = useData()
  const [name, setName] = useState('')
  const current = d.shoppingItems
  const load = (items: BasketItem[]) => { d.loadBasket(items).then(onLoaded).catch(fail); onClose() }
  const saveCurrent = () => {
    const n = name.trim(); if (!n || !current.length) return
    Keyboard.dismiss(); d.saveBasket(n, current).catch(fail); setName('')
  }
  const confirmDelete = (id: string, nm: string) =>
    Alert.alert('מחיקת סל', `למחוק את "${nm}"?`, [{ text: 'ביטול', style: 'cancel' }, { text: 'מחיקה', style: 'destructive', onPress: () => d.deleteBasket(id).catch(fail) }])
  const overwrite = (id: string, nm: string) =>
    Alert.alert('עדכון סל', `לשמור את הרשימה הנוכחית (${current.length} פריטים) במקום התוכן של "${nm}"?`, [{ text: 'ביטול', style: 'cancel' }, { text: 'עדכון', onPress: () => d.saveBasket(nm, current, id).catch(fail) }])

  return (
    <BottomSheet visible={visible} onClose={onClose} avoidKeyboard minHeight={SHEET_MIN_HEIGHT}>
      <View style={s.header}>
        <View>
          <Text style={[s.title, { color: c.text }]}>סלים שמורים</Text>
          <Text style={{ fontSize: 12.5, color: c.text2, marginTop: 2 }}>הכינו פעם אחת, טענו בלחיצה בכל קנייה</Text>
        </View>
        <Touchable onPress={onClose} scale={0.9} style={[s.x, { backgroundColor: c.bg }]}><X size={18} color={c.text2} /></Touchable>
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ gap: 10, paddingBottom: 6 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        {d.savedBaskets.map(b => (
          <BasketCard key={b.id} c={c} Icon={ShoppingBasket} tint={c.primaryLight} name={b.name} items={b.items}
            onLoad={() => load(b.items)} onDelete={() => confirmDelete(b.id, b.name)}
            onSave={current.length ? () => overwrite(b.id, b.name) : undefined} />
        ))}
        {d.lastTrip.length > 0 && (
          <BasketCard c={c} Icon={History} tint={c.accent2Light} name="הקנייה האחרונה" items={d.lastTrip} onLoad={() => load(d.lastTrip)} />
        )}
        {d.savedBaskets.length === 0 && (
          <BasketCard c={c} Icon={Sparkles} tint={c.primaryLight} name="סל בסיסי לבית" items={STARTER_BASKET} onLoad={() => load(STARTER_BASKET)} />
        )}
      </ScrollView>

      <View style={[s.saveBox, { borderTopColor: c.sep }]}>
        <Text style={{ fontSize: 13, fontWeight: '700', color: c.text2, textAlign: 'right', marginBottom: 8 }}>
          {current.length ? `שמירת הרשימה הנוכחית (${current.length} פריטים) כסל` : 'כדי לשמור סל, הוסיפו קודם פריטים לרשימה'}
        </Text>
        <View style={[s.saveRow, { backgroundColor: c.bg, opacity: current.length ? 1 : 0.5 }]}>
          <TextInput style={{ flex: 1, height: 46, color: c.text, fontSize: 15 }} placeholder="שם הסל, למשל: קנייה שבועית" placeholderTextColor={c.text3}
            value={name} onChangeText={setName} editable={current.length > 0} textAlign="right" returnKeyType="done" onSubmitEditing={saveCurrent} />
          <Touchable onPress={saveCurrent} disabled={!name.trim() || !current.length} scale={0.94} style={[s.saveBtn, { backgroundColor: c.primary }]}>
            <Text style={{ color: '#fff', fontWeight: '700', fontSize: 14 }}>שמירה</Text>
          </Touchable>
        </View>
      </View>
    </BottomSheet>
  )
}

const s = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  title: { fontSize: 18, fontWeight: '700' },
  x: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  card: { borderRadius: 18, padding: 14 },
  cardTop: { flexDirection: 'row-reverse', alignItems: 'center', gap: 12 },
  cardIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  cardActions: { flexDirection: 'row-reverse', gap: 8, marginTop: 12 },
  btn: { borderRadius: 12, paddingVertical: 10, alignItems: 'center' },
  iconBtn: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  saveBox: { borderTopWidth: StyleSheet.hairlineWidth, paddingTop: 12, marginTop: 6 },
  saveRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: 8, borderRadius: 14, paddingRight: 14, paddingLeft: 6 },
  saveBtn: { borderRadius: 11, paddingHorizontal: 14, paddingVertical: 9 },
})
