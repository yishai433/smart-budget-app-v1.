import { useState } from 'react'
import { View, Text, TextInput, ScrollView, StyleSheet, Keyboard, Alert } from 'react-native'
import { X, Trash2, History, Sparkles, ShoppingBasket, Save, Pencil, Check } from 'lucide-react-native'
import { useTheme, Theme } from '../../theme'
import { useData } from '../../context/DataContext'
import { STARTER_BASKET, shopCat } from '../../lib/shopCategories'
import { formatAmount } from '../../lib/money'
import BottomSheet, { SHEET_TALL } from '../BottomSheet'
import Touchable from '../Touchable'
import type { BasketItem } from '../../types'

const fail = () => Alert.alert('הפעולה נכשלה', 'בדקו את החיבור לאינטרנט ונסו שוב.')
const est = (items: BasketItem[]) => items.reduce((a, i) => a + (i.estimatedPrice || 0) * (i.quantity || 1), 0)

function BasketCard({ c, Icon, tint, name, items, onLoad, onDelete, onSave, onRemoveItem }: {
  c: Theme; Icon: typeof History; tint: string; name: string; items: BasketItem[]; onLoad: () => void; onDelete?: () => void; onSave?: () => void; onRemoveItem?: (i: number) => void
}) {
  const [editing, setEditing] = useState(false)
  const total = est(items)
  const emojis = Array.from(new Set(items.map(i => shopCat(i.category).emoji))).slice(0, 5).join(' ')
  return (
    <View style={[s.card, { backgroundColor: c.bg }]}>
      <View style={s.cardTop}>
        <View style={[s.cardIcon, { backgroundColor: tint }]}><Icon size={18} color={c.primary} /></View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 15.5, fontWeight: '700', color: c.text, textAlign: 'right' }}>{name}</Text>
          <Text style={{ fontSize: 12.5, color: c.text2, marginTop: 2, textAlign: 'right' }}>
            {items.length} מוצרים{total > 0 ? ` · כ-${formatAmount(total)}` : ''}{emojis ? `  ${emojis}` : ''}
          </Text>
        </View>
      </View>
      <View style={s.cardActions}>
        <Touchable onPress={onLoad} scale={0.96} containerStyle={{ flex: 1 }} style={[s.btn, { backgroundColor: c.primary }]}>
          <Text style={{ color: '#fff', fontWeight: '700', fontSize: 14 }}>הוסף לרשימה</Text>
        </Touchable>
        {onRemoveItem ? (
          <Touchable onPress={() => setEditing(e => !e)} scale={0.9} style={[s.iconBtn, { backgroundColor: editing ? c.primary : c.card }]}>
            {editing ? <Check size={16} color="#fff" /> : <Pencil size={16} color={c.text2} />}
          </Touchable>
        ) : null}
        {onSave ? (
          <Touchable onPress={onSave} scale={0.9} style={[s.iconBtn, { backgroundColor: c.card }]}><Save size={16} color={c.text2} /></Touchable>
        ) : null}
        {onDelete ? (
          <Touchable onPress={onDelete} scale={0.9} style={[s.iconBtn, { backgroundColor: c.card }]}><Trash2 size={16} color={c.danger} /></Touchable>
        ) : null}
      </View>
      {editing && onRemoveItem ? (
        <View style={[s.items, { backgroundColor: c.card }]}>
          {items.length === 0 ? <Text style={{ color: c.text2, textAlign: 'center', padding: 12 }}>הרשימה ריקה</Text> : items.map((it, i) => (
            <View key={`${it.name}-${i}`} style={[s.itemRow, i ? { borderTopColor: c.sep, borderTopWidth: StyleSheet.hairlineWidth } : null]}>
              <Text style={{ fontSize: 15 }}>{shopCat(it.category).emoji}</Text>
              <Text numberOfLines={1} style={{ flex: 1, fontSize: 14.5, color: c.text, textAlign: 'right' }}>{it.name}{(it.quantity || 1) > 1 ? `  ×${it.quantity}` : ''}</Text>
              <Touchable onPress={() => onRemoveItem(i)} scale={0.88} style={[s.rm, { backgroundColor: c.dangerLight }]}><X size={14} color={c.danger} /></Touchable>
            </View>
          ))}
        </View>
      ) : null}
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
    Alert.alert('מחיקת רשימה', `למחוק את "${nm}"?`, [{ text: 'ביטול', style: 'cancel' }, { text: 'מחיקה', style: 'destructive', onPress: () => d.deleteBasket(id).catch(fail) }])
  const overwrite = (id: string, nm: string) =>
    Alert.alert('עדכון רשימה', `לשמור את הרשימה הנוכחית (${current.length} פריטים) במקום התוכן של "${nm}"?`, [{ text: 'ביטול', style: 'cancel' }, { text: 'עדכון', onPress: () => d.saveBasket(nm, current, id).catch(fail) }])

  return (
    <BottomSheet visible={visible} onClose={onClose} avoidKeyboard minHeight={SHEET_TALL}>
      <View style={s.header}>
        <View>
          <Text style={[s.title, { color: c.text }]}>רשימות שמורות</Text>
          <Text style={{ fontSize: 12.5, color: c.text2, marginTop: 2 }}>רשימה שחוזרת על עצמה? שמרו אותה פעם אחת וטענו בלחיצה</Text>
        </View>
        <Touchable onPress={onClose} scale={0.9} style={[s.x, { backgroundColor: c.bg }]}><X size={18} color={c.text2} /></Touchable>
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ gap: 10, paddingBottom: 6 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        {d.savedBaskets.map(b => (
          <BasketCard key={b.id} c={c} Icon={ShoppingBasket} tint={c.primaryLight} name={b.name} items={b.items}
            onLoad={() => load(b.items)} onDelete={() => confirmDelete(b.id, b.name)}
            onSave={current.length ? () => overwrite(b.id, b.name) : undefined}
            onRemoveItem={(i) => d.saveBasket(b.name, b.items.filter((_, j) => j !== i), b.id).catch(fail)} />
        ))}
        {d.lastTrip.length > 0 && (
          <BasketCard c={c} Icon={History} tint={c.accent2Light} name="הקנייה האחרונה" items={d.lastTrip} onLoad={() => load(d.lastTrip)} />
        )}
        {d.savedBaskets.length === 0 && (
          <BasketCard c={c} Icon={Sparkles} tint={c.primaryLight} name="רשימה בסיסית לבית (מוכנה)" items={STARTER_BASKET} onLoad={() => load(STARTER_BASKET)} />
        )}
      </ScrollView>

      <View style={[s.saveBox, { borderTopColor: c.sep }]}>
        <Text style={{ fontSize: 13, fontWeight: '700', color: c.text2, textAlign: 'right', marginBottom: 8 }}>
          {current.length ? `לשמור את הרשימה הנוכחית (${current.length} מוצרים)` : 'כדי לשמור רשימה, הוסיפו קודם מוצרים'}
        </Text>
        <View style={[s.saveRow, { backgroundColor: c.bg, opacity: current.length ? 1 : 0.5 }]}>
          <TextInput style={{ flex: 1, height: 46, color: c.text, fontSize: 15 }} placeholder="שם, למשל: קנייה שבועית" placeholderTextColor={c.text3}
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
  items: { borderRadius: 12, marginTop: 10, overflow: 'hidden' },
  itemRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: 10, paddingVertical: 10, paddingHorizontal: 12 },
  rm: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  saveBox: { borderTopWidth: StyleSheet.hairlineWidth, paddingTop: 12, marginTop: 6 },
  saveRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: 8, borderRadius: 14, paddingRight: 14, paddingLeft: 6 },
  saveBtn: { borderRadius: 11, paddingHorizontal: 14, paddingVertical: 9 },
})
