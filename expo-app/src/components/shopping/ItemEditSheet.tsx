import { useState, useEffect, useRef, useCallback } from 'react'
import { View, Text, TextInput, ScrollView, StyleSheet, Keyboard, Pressable, Alert } from 'react-native'
import { X, Trash2, Minus, Plus, ChevronDown, Store } from 'lucide-react-native'
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
export default function ItemEditSheet({ item, branchPrice, storeName, onClose }: { item: ShoppingItem | null; branchPrice: number | null; storeName: string; onClose: () => void }) {
  const c = useTheme()
  const d = useData()
  const visible = !!item
  const nameRef = useRef('')
  const [nameInit, setNameInit] = useState('')
  const [cat, setCat] = useState('other')
  const [qty, setQty] = useState(1)
  const [price, setPrice] = useState('')
  const [priceInit, setPriceInit] = useState('')
  const [catOpen, setCatOpen] = useState(false)
  const typing = useKeyboardHeight(visible) > 0

  useEffect(() => {
    if (!item) return
    nameRef.current = item.name; setNameInit(item.name)
    setCat(shopCat(item.category).id); setQty(item.quantity && item.quantity > 0 ? item.quantity : 1)
    const p = !item.priceManual && branchPrice != null ? branchPrice : item.estimatedPrice || 0
    setPrice(p ? String(p) : ''); setPriceInit(p ? String(p) : ''); setCatOpen(false)
  }, [item])

  const onKey = useCallback((k: string) => setPrice(p => applyKey(p, k)), [])
  const unit = parseFloat(price) || 0
  const save = () => {
    if (!item) return
    Keyboard.dismiss()
    const name = nameRef.current.trim() || item.name
    // A price the user changed is kept as theirs; otherwise it keeps following the branch.
    const manual = price !== priceInit ? true : !!item.priceManual
    d.updateShoppingItem(item.id, { name, category: cat, quantity: qty, estimatedPrice: unit, priceManual: manual }).catch(fail)
    onClose()
  }
  const useBranch = () => { if (!item || branchPrice == null) return; d.updateShoppingItem(item.id, { priceManual: false, estimatedPrice: branchPrice }).catch(fail); onClose() }
  const sc = shopCat(cat)
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

      {/* Department: one clear line; tap to choose from a grid. */}
      <Touchable onPress={() => { Keyboard.dismiss(); setCatOpen(o => !o) }} scale={0.98} style={[s.catLine, { backgroundColor: c.bg }]}>
        <Text style={{ fontSize: 13, color: c.text2 }}>מחלקה</Text>
        <Text style={{ fontSize: 16 }}>{sc.emoji}</Text>
        <Text style={{ flex: 1, fontSize: 14.5, fontWeight: '700', color: c.text, textAlign: 'right' }}>{sc.label}</Text>
        <Text style={{ fontSize: 13, color: c.primary, fontWeight: '700' }}>{catOpen ? 'סגירה' : 'שינוי'}</Text>
        <ChevronDown size={16} color={c.primary} style={{ transform: [{ rotate: catOpen ? '180deg' : '0deg' }] }} />
      </Touchable>
      {catOpen && (
        <View style={s.catGrid}>
          {SHOP_CATS.map(x => {
            const on = x.id === cat
            return (
              <Touchable key={x.id} onPress={() => { setCat(x.id); setCatOpen(false) }} scale={0.94} containerStyle={s.catCell}
                style={[s.catChip, { backgroundColor: on ? x.color + '22' : c.bg, borderColor: on ? x.color : 'transparent' }]}>
                <Text style={{ fontSize: 18 }}>{x.emoji}</Text>
                <Text style={{ fontSize: 11, fontWeight: '600', color: c.text, textAlign: 'center' }} numberOfLines={1}>{x.label}</Text>
              </Touchable>
            )
          })}
        </View>
      )}

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
      <View style={s.infoLine}>
        {branchPrice != null ? (
          item?.priceManual && String(branchPrice) !== price ? (
            <Touchable onPress={useBranch} scale={0.96}><Text style={{ fontSize: 12.5, color: c.primary, fontWeight: '700' }}>חזרה למחיר הסניף ({formatAmount(branchPrice)})</Text></Touchable>
          ) : (
            <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 4 }}><Store size={13} color={c.text2} /><Text style={{ fontSize: 12.5, color: c.text2 }}>המחיר ב{storeName}</Text></View>
          )
        ) : (
          <Text style={{ fontSize: 12.5, color: c.text2 }}>{storeName ? `אין מחיר ב${storeName}, אפשר להקליד` : 'הקלידו מחיר (לא חובה)'}</Text>
        )}
        <Text style={{ fontSize: 12.5, color: c.text, fontWeight: '700' }}>{unit > 0 && qty > 1 ? `סה״כ ${formatAmount(unit * qty)}` : ''}</Text>
      </View>

      <View style={typing || catOpen ? s.collapsed : null} pointerEvents={typing || catOpen ? 'none' : 'auto'}>
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
  catLine: { flexDirection: 'row-reverse', alignItems: 'center', gap: 8, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, marginTop: 10 },
  catGrid: { flexDirection: 'row-reverse', flexWrap: 'wrap', justifyContent: 'space-between', marginTop: 10 },
  catCell: { width: '23.5%', marginBottom: 8 },
  catChip: { height: 58, borderRadius: 14, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4, gap: 2 },
  infoLine: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', minHeight: 22, marginBottom: 8 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 14, marginBottom: 6 },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 999, padding: 4 },
  stepBtn: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  collapsed: { height: 0, opacity: 0, overflow: 'hidden' },
  save: { borderRadius: 16, paddingVertical: 14, alignItems: 'center', marginTop: 10 },
})
