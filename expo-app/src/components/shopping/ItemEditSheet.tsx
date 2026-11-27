import { useState, useEffect, useRef, useCallback } from 'react'
import { View, Text, TextInput, ScrollView, StyleSheet, Keyboard, Pressable, Alert } from 'react-native'
import { X, Trash2, Minus, Plus } from 'lucide-react-native'
import { useTheme } from '../../theme'
import { useData } from '../../context/DataContext'
import { SHOP_CATS, shopCat } from '../../lib/shopCategories'
import { displayCurrency, formatAmount } from '../../lib/money'
import useKeyboardHeight from '../../lib/useKeyboardHeight'
import BottomSheet from '../BottomSheet'
import Touchable from '../Touchable'
import NumPad, { applyKey } from '../NumPad'
import AmountDisplay from '../AmountDisplay'
import type { ShoppingItem } from '../../types'

const fail = () => Alert.alert('השמירה נכשלה', 'בדקו את החיבור לאינטרנט ונסו שוב.')

// Edit one list item: name, department, quantity and price per unit.
export default function ItemEditSheet({ item, onClose }: { item: ShoppingItem | null; onClose: () => void }) {
  const c = useTheme()
  const d = useData()
  const visible = !!item
  const nameRef = useRef('')
  const [nameInit, setNameInit] = useState('')
  const [cat, setCat] = useState('other')
  const [qty, setQty] = useState(1)
  const [price, setPrice] = useState('')
  const typing = useKeyboardHeight(visible) > 0

  useEffect(() => {
    if (!item) return
    nameRef.current = item.name; setNameInit(item.name)
    setCat(shopCat(item.category).id); setQty(item.quantity && item.quantity > 0 ? item.quantity : 1)
    setPrice(item.estimatedPrice ? String(item.estimatedPrice) : '')
  }, [item])

  const onKey = useCallback((k: string) => setPrice(p => applyKey(p, k)), [])
  const unit = parseFloat(price) || 0
  const save = () => {
    if (!item) return
    Keyboard.dismiss()
    const name = nameRef.current.trim() || item.name
    d.updateShoppingItem(item.id, { name, category: cat, quantity: qty, estimatedPrice: unit }).catch(fail)
    onClose()
  }
  const remove = () => { if (!item) return; d.deleteShoppingItem(item.id).catch(fail); onClose() }

  return (
    <BottomSheet visible={visible} onClose={onClose} avoidKeyboard>
      <View style={s.header}>
        <Text style={[s.title, { color: c.text }]}>עריכת פריט</Text>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <Touchable onPress={remove} scale={0.9} style={[s.x, { backgroundColor: c.dangerLight }]}><Trash2 size={17} color={c.danger} /></Touchable>
          <Touchable onPress={onClose} scale={0.9} style={[s.x, { backgroundColor: c.bg }]}><X size={18} color={c.text2} /></Touchable>
        </View>
      </View>

      <TextInput key={nameInit} defaultValue={nameInit} onChangeText={v => { nameRef.current = v }}
        style={[s.input, { backgroundColor: c.bg, color: c.text }]} placeholder="שם המוצר" placeholderTextColor={c.text3}
        textAlign="right" returnKeyType="done" blurOnSubmit onSubmitEditing={Keyboard.dismiss} />

      <ScrollView horizontal showsHorizontalScrollIndicator={false} keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ gap: 8, paddingVertical: 12 }} style={{ flexGrow: 0, transform: [{ scaleX: -1 }] }}>
        {SHOP_CATS.map(sc => {
          const on = sc.id === cat
          return (
            <Touchable key={sc.id} onPress={() => setCat(sc.id)} scale={0.94} style={{ transform: [{ scaleX: -1 }] }}>
              <View style={[s.catChip, { backgroundColor: on ? sc.color + '22' : c.bg, borderColor: on ? sc.color : 'transparent' }]}>
                <Text style={{ fontSize: 15 }}>{sc.emoji}</Text>
                <Text style={{ fontSize: 12.5, fontWeight: '600', color: c.text }}>{sc.label}</Text>
              </View>
            </Touchable>
          )
        })}
      </ScrollView>

      <View style={s.row}>
        <View style={[s.stepper, { backgroundColor: c.bg }]}>
          <Touchable onPress={() => setQty(q => Math.max(1, q - 1))} scale={0.88} style={[s.stepBtn, { backgroundColor: c.card }]}><Minus size={16} color={c.text} /></Touchable>
          <Text style={{ fontSize: 18, fontWeight: '800', color: c.text, minWidth: 30, textAlign: 'center' }}>{qty}</Text>
          <Touchable onPress={() => setQty(q => q + 1)} scale={0.88} style={[s.stepBtn, { backgroundColor: c.card }]}><Plus size={16} color={c.text} /></Touchable>
        </View>
        <Pressable onPress={Keyboard.dismiss} style={{ alignItems: 'flex-end' }}>
          <Text style={{ fontSize: 11, color: c.text2, fontWeight: '600' }}>מחיר ליחידה</Text>
          <AmountDisplay value={price} currency={displayCurrency()} size={26} curSize={15} c={c} caretHeight={24} />
        </Pressable>
      </View>
      <Text style={{ fontSize: 13, color: c.text2, textAlign: 'center', marginBottom: 8, minHeight: 18 }}>
        {unit > 0 && qty > 1 ? `סה״כ ${formatAmount(unit * qty)}` : ' '}
      </Text>

      <View style={typing ? s.collapsed : null} pointerEvents={typing ? 'none' : 'auto'}>
        <NumPad onKey={onKey} />
      </View>

      <Touchable onPress={save} scale={0.98} style={[s.save, { backgroundColor: c.primary }]}>
        <Text style={{ color: '#fff', fontWeight: '700', fontSize: 16 }}>שמירה</Text>
      </Touchable>
    </BottomSheet>
  )
}

const s = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  title: { fontSize: 18, fontWeight: '700' },
  x: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  input: { borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12, fontSize: 16, fontWeight: '600' },
  catChip: { flexDirection: 'row-reverse', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, borderWidth: 1.5 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 999, padding: 4 },
  stepBtn: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  collapsed: { height: 0, opacity: 0, overflow: 'hidden' },
  save: { borderRadius: 16, paddingVertical: 14, alignItems: 'center', marginTop: 10 },
})
