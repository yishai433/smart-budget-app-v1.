import { useState, useRef, useEffect, useCallback, memo } from 'react'
import { View, Text, TextInput, Modal, ScrollView, StyleSheet, Platform, Pressable, ActivityIndicator, Animated, Keyboard, Dimensions, Easing } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { X, Trash2 } from 'lucide-react-native'
import { useTheme, Theme } from '../theme'
import { CATEGORIES, Category } from '../categories'
import { useData } from '../context/DataContext'
import { displayCurrency } from '../lib/money'
import { todayISO } from '../lib/month'
import Touchable from '../components/Touchable'
import type { TxType, Transaction } from '../types'

const SCREEN_H = Dimensions.get('window').height

// A single category chip. Memoized so typing the amount/description doesn't
// re-render all twelve chips (the main source of the previous lag).
const Chip = memo(function Chip({ cat, selected, onPick, c }: { cat: Category; selected: boolean; onPick: (id: string) => void; c: Theme }) {
  return (
    <Touchable scale={0.94} onPress={() => onPick(cat.id)} containerStyle={s.cell}
      style={[s.chip, { backgroundColor: selected ? cat.color + '22' : c.bg, borderColor: selected ? cat.color : 'transparent' }]}>
      <Text style={{ fontSize: 22 }}>{cat.emoji}</Text>
      <Text style={{ fontSize: 12, fontWeight: '600', color: c.text, marginTop: 4 }} numberOfLines={1}>{cat.label}</Text>
    </Touchable>
  )
})

export default function AddTransactionSheet({ visible, onClose, editTx }: { visible: boolean; onClose: () => void; editTx?: Transaction | null }) {
  const c = useTheme()
  const insets = useSafeAreaInsets()
  const { addTransaction, updateTransaction, deleteTransaction } = useData()
  const [type, setType] = useState<TxType>('expense')
  const [category, setCategory] = useState('food')
  const [amount, setAmount] = useState('')
  const [desc, setDesc] = useState('')
  const [busy, setBusy] = useState(false)
  const [mounted, setMounted] = useState(visible)
  const amountRef = useRef<TextInput>(null)

  // Entrance offset (SCREEN_H = fully off-screen, 0 = in place) and the
  // keyboard lift. The sheet's final transform is entrance - keyboard, so a
  // single translateY carries both motions and they read as one gesture.
  const entrance = useRef(new Animated.Value(SCREEN_H)).current
  const keyboard = useRef(new Animated.Value(0)).current
  const backdrop = useRef(new Animated.Value(0)).current

  // Keep the sheet glued to the top of the keyboard, animating in step with it.
  useEffect(() => {
    const showEvt = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow'
    const hideEvt = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide'
    const show = Keyboard.addListener(showEvt, e => {
      Animated.timing(keyboard, {
        toValue: Math.max(0, e.endCoordinates.height - insets.bottom),
        duration: e.duration || 250,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }).start()
    })
    const hide = Keyboard.addListener(hideEvt, e => {
      Animated.timing(keyboard, { toValue: 0, duration: e.duration || 220, easing: Easing.out(Easing.ease), useNativeDriver: true }).start()
    })
    return () => { show.remove(); hide.remove() }
  }, [insets.bottom])

  useEffect(() => {
    if (visible) {
      // Reset fields before the sheet appears.
      if (editTx) { setType(editTx.type); setCategory(editTx.category); setAmount(String(editTx.amount)); setDesc(editTx.description || '') }
      else { setType('expense'); setCategory('food'); setAmount(''); setDesc('') }
      setBusy(false)
      setMounted(true)
      entrance.setValue(SCREEN_H)
      backdrop.setValue(0)
      keyboard.setValue(0)
      Animated.parallel([
        Animated.timing(backdrop, { toValue: 1, duration: 220, useNativeDriver: true }),
        Animated.spring(entrance, { toValue: 0, useNativeDriver: true, damping: 24, stiffness: 260, mass: 0.9 }),
      ]).start()
      // Raise the keyboard while the sheet is still sliding in, so the two
      // motions merge instead of stacking.
      if (!editTx) setTimeout(() => amountRef.current?.focus(), 90)
    } else if (mounted) {
      Keyboard.dismiss()
      Animated.parallel([
        Animated.timing(backdrop, { toValue: 0, duration: 180, useNativeDriver: true }),
        Animated.timing(entrance, { toValue: SCREEN_H, duration: 220, easing: Easing.in(Easing.ease), useNativeDriver: true }),
      ]).start(() => setMounted(false))
    }
  }, [visible, editTx])

  const pick = useCallback((id: string) => setCategory(id), [])
  const n = parseFloat(amount) || 0
  const canSave = n > 0 && !busy
  const save = async () => {
    if (!canSave) return
    setBusy(true)
    try {
      if (editTx) await updateTransaction(editTx.id, { type, category, amount: n, description: desc.trim() })
      else await addTransaction({ type, category, amount: n, description: desc.trim(), date: todayISO() })
      onClose()
    } catch { setBusy(false) }
  }
  const remove = async () => { if (!editTx) return; setBusy(true); try { await deleteTransaction(editTx.id); onClose() } catch { setBusy(false) } }
  const cats = CATEGORIES[type]
  const fillers = (3 - (cats.length % 3)) % 3

  const translateY = Animated.subtract(entrance, keyboard)

  if (!mounted) return null

  return (
    <Modal visible transparent animationType="none" onRequestClose={onClose} statusBarTranslucent>
      <View style={{ flex: 1, justifyContent: 'flex-end' }}>
        <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: '#000', opacity: backdrop.interpolate({ inputRange: [0, 1], outputRange: [0, 0.45] }) }]} />
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <Animated.View style={[s.sheet, { backgroundColor: c.card, paddingBottom: insets.bottom + 12, transform: [{ translateY }] }]}>
          <View style={s.handle} />
          <View style={s.header}>
            <Text style={[s.title, { color: c.text }]}>{editTx ? 'עריכת תנועה' : 'הוספת תנועה'}</Text>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {editTx ? <Touchable onPress={remove} scale={0.9} style={[s.x, { backgroundColor: c.dangerLight }]}><Trash2 size={17} color={c.danger} /></Touchable> : null}
              <Touchable onPress={onClose} scale={0.9} style={[s.x, { backgroundColor: c.bg }]}><X size={18} color={c.text2} /></Touchable>
            </View>
          </View>

          <View style={[s.seg, { backgroundColor: c.bg }]}>
            {(['expense', 'income'] as TxType[]).map(t => {
              const on = type === t
              return (
                <Touchable key={t} containerStyle={{ flex: 1 }} scale={0.97} onPress={() => { setType(t); setCategory(CATEGORIES[t][0].id) }}
                  style={[s.segBtn, on && { backgroundColor: t === 'income' ? c.accent2Dark : c.primary }]}>
                  <Text style={{ fontWeight: '700', fontSize: 15, color: on ? '#fff' : c.text2 }}>{t === 'expense' ? 'הוצאה' : 'הכנסה'}</Text>
                </Touchable>
              )
            })}
          </View>

          <View style={s.amountWrap}>
            <Text style={[s.cur, { color: c.text3 }]}>{displayCurrency()}</Text>
            <TextInput ref={amountRef} style={[s.amount, { color: c.text }]} value={amount} onChangeText={t => setAmount(t.replace(/[^0-9.]/g, ''))}
              keyboardType="decimal-pad" placeholder="0" placeholderTextColor={c.text3} />
          </View>

          <ScrollView style={{ maxHeight: 186 }} contentContainerStyle={s.grid} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} keyboardDismissMode="none">
            {cats.map(cat => <Chip key={cat.id} cat={cat} selected={cat.id === category} onPick={pick} c={c} />)}
            {Array.from({ length: fillers }).map((_, i) => <View key={`f${i}`} style={s.cell} />)}
          </ScrollView>

          <TextInput style={[s.desc, { backgroundColor: c.bg, color: c.text }]} value={desc} onChangeText={setDesc}
            placeholder="תיאור (לא חובה)" placeholderTextColor={c.text3} textAlign="right" returnKeyType="done" />

          <Touchable onPress={save} disabled={!canSave} scale={0.98} style={[s.save, { backgroundColor: c.primary, opacity: canSave ? 1 : 0.4 }]}>
            {busy ? <ActivityIndicator color="#fff" /> : <Text style={{ color: '#fff', fontWeight: '700', fontSize: 16 }}>{editTx ? 'עדכון' : 'שמירה'}</Text>}
          </Touchable>
        </Animated.View>
      </View>
    </Modal>
  )
}

const s = StyleSheet.create({
  sheet: { borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: 20, paddingTop: 8 },
  handle: { alignSelf: 'center', width: 36, height: 4, borderRadius: 2, backgroundColor: 'rgba(128,128,128,0.35)', marginBottom: 8 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  title: { fontSize: 18, fontWeight: '700' },
  x: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  seg: { flexDirection: 'row', borderRadius: 999, padding: 4, gap: 4, marginBottom: 6 },
  segBtn: { paddingVertical: 11, borderRadius: 999, alignItems: 'center' },
  amountWrap: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, paddingVertical: 14 },
  cur: { fontSize: 26, fontWeight: '700' },
  amount: { fontSize: 44, fontWeight: '800', minWidth: 80, textAlign: 'center', padding: 0 },
  grid: { flexDirection: 'row-reverse', flexWrap: 'wrap', justifyContent: 'space-between' },
  cell: { width: '31%' },
  chip: { height: 68, borderRadius: 16, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  desc: { borderRadius: 14, paddingHorizontal: 16, paddingVertical: 13, fontSize: 15, marginTop: 4, marginBottom: 12 },
  save: { borderRadius: 16, paddingVertical: 16, alignItems: 'center' },
})
