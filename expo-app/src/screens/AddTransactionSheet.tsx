import { useState, useRef, useEffect, useCallback, memo } from 'react'
import { View, Text, TextInput, Modal, ScrollView, StyleSheet, Platform, Pressable, ActivityIndicator, Animated, Dimensions, Easing, KeyboardAvoidingView } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { X, Trash2, Delete } from 'lucide-react-native'
import { useTheme, Theme } from '../theme'
import { CATEGORIES, Category } from '../categories'
import { useData } from '../context/DataContext'
import { displayCurrency } from '../lib/money'
import { todayISO } from '../lib/month'
import Touchable from '../components/Touchable'
import type { TxType, Transaction } from '../types'

const SCREEN_H = Dimensions.get('window').height

// A single category chip. Memoized so typing the amount doesn't re-render all chips.
const Chip = memo(function Chip({ cat, selected, onPick, c }: { cat: Category; selected: boolean; onPick: (id: string) => void; c: Theme }) {
  return (
    <Touchable scale={0.94} onPress={() => onPick(cat.id)} containerStyle={s.cell}
      style={[s.chip, { backgroundColor: selected ? cat.color + '22' : c.bg, borderColor: selected ? cat.color : 'transparent' }]}>
      <Text style={{ fontSize: 19 }}>{cat.emoji}</Text>
      <Text style={{ fontSize: 11, fontWeight: '600', color: c.text, marginTop: 2 }} numberOfLines={1}>{cat.label}</Text>
    </Touchable>
  )
})

// One key of our own number pad. Themed, tactile, replaces the OS keyboard.
const Key = memo(function Key({ label, onPress, c, wide }: { label: string; onPress: (k: string) => void; c: Theme; wide?: boolean }) {
  const isBack = label === 'back'
  return (
    <Touchable scale={0.9} onPress={() => onPress(label)} containerStyle={s.keyCell}
      style={[s.key, { backgroundColor: c.bg }]}>
      {isBack
        ? <Delete size={24} color={c.text2} />
        : <Text style={{ fontSize: 26, fontWeight: '600', color: c.text }}>{label}</Text>}
    </Touchable>
  )
})

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0', 'back']

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

  const entrance = useRef(new Animated.Value(SCREEN_H)).current
  const backdrop = useRef(new Animated.Value(0)).current

  useEffect(() => {
    if (visible) {
      if (editTx) { setType(editTx.type); setCategory(editTx.category); setAmount(String(editTx.amount)); setDesc(editTx.description || '') }
      else { setType('expense'); setCategory('food'); setAmount(''); setDesc('') }
      setBusy(false)
      setMounted(true)
      entrance.setValue(SCREEN_H)
      backdrop.setValue(0)
      Animated.parallel([
        Animated.timing(backdrop, { toValue: 1, duration: 300, useNativeDriver: true }),
        // easeOutExpo-style curve: quick to rise, soft to settle — reads as smooth.
        Animated.timing(entrance, { toValue: 0, duration: 380, easing: Easing.bezier(0.16, 1, 0.3, 1), useNativeDriver: true }),
      ]).start()
    } else if (mounted) {
      Animated.parallel([
        Animated.timing(backdrop, { toValue: 0, duration: 200, useNativeDriver: true }),
        Animated.timing(entrance, { toValue: SCREEN_H, duration: 260, easing: Easing.in(Easing.cubic), useNativeDriver: true }),
      ]).start(() => setMounted(false))
    }
  }, [visible, editTx])

  const pick = useCallback((id: string) => setCategory(id), [])

  // Our own keypad logic — no OS keyboard involved for the amount.
  const press = useCallback((k: string) => {
    setAmount(prev => {
      if (k === 'back') return prev.slice(0, -1)
      if (k === '.') { if (prev.includes('.')) return prev; return prev === '' ? '0.' : prev + '.' }
      const next = prev === '0' ? k : prev + k
      if (next.includes('.')) { const dec = next.split('.')[1]; if (dec && dec.length > 2) return prev }
      if (next.replace('.', '').length > 9) return prev
      return next
    })
  }, [])

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

  if (!mounted) return null

  return (
    <Modal visible transparent animationType="none" onRequestClose={onClose} statusBarTranslucent>
      <View style={{ flex: 1, justifyContent: 'flex-end' }}>
        <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: '#000', opacity: backdrop.interpolate({ inputRange: [0, 1], outputRange: [0, 0.45] }) }]} />
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <Animated.View style={[s.sheet, { backgroundColor: c.card, paddingBottom: insets.bottom + 10, transform: [{ translateY: entrance }] }]}>
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
              <Text style={[s.amount, { color: amount === '' ? c.text3 : c.text }]}>{amount === '' ? '0' : amount}</Text>
            </View>

            <ScrollView style={{ maxHeight: 190 }} contentContainerStyle={s.grid} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
              {cats.map(cat => <Chip key={cat.id} cat={cat} selected={cat.id === category} onPick={pick} c={c} />)}
              {Array.from({ length: fillers }).map((_, i) => <View key={`f${i}`} style={s.cell} />)}
            </ScrollView>

            <TextInput style={[s.desc, { backgroundColor: c.bg, color: c.text }]} value={desc} onChangeText={setDesc}
              placeholder="תיאור (לא חובה)" placeholderTextColor={c.text3} textAlign="right" returnKeyType="done" />

            <View style={s.pad}>
              {KEYS.map(k => <Key key={k} label={k} onPress={press} c={c} />)}
            </View>

            <Touchable onPress={save} disabled={!canSave} scale={0.98} style={[s.save, { backgroundColor: c.primary, opacity: canSave ? 1 : 0.4 }]}>
              {busy ? <ActivityIndicator color="#fff" /> : <Text style={{ color: '#fff', fontWeight: '700', fontSize: 16 }}>{editTx ? 'עדכון' : 'שמירה'}</Text>}
            </Touchable>
          </Animated.View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  )
}

const s = StyleSheet.create({
  sheet: { borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: 20, paddingTop: 8 },
  handle: { alignSelf: 'center', width: 36, height: 4, borderRadius: 2, backgroundColor: 'rgba(128,128,128,0.35)', marginBottom: 8 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  title: { fontSize: 18, fontWeight: '700' },
  x: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  seg: { flexDirection: 'row', borderRadius: 999, padding: 4, gap: 4, marginBottom: 2 },
  segBtn: { paddingVertical: 10, borderRadius: 999, alignItems: 'center' },
  amountWrap: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, paddingVertical: 6 },
  cur: { fontSize: 18, fontWeight: '700' },
  amount: { fontSize: 32, fontWeight: '800', minWidth: 44, textAlign: 'center' },
  grid: { flexDirection: 'row-reverse', flexWrap: 'wrap', justifyContent: 'space-between' },
  cell: { width: '31%' },
  chip: { height: 54, borderRadius: 14, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  desc: { borderRadius: 12, paddingHorizontal: 16, paddingVertical: 10, fontSize: 14, marginTop: 2, marginBottom: 8 },
  pad: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 7 },
  keyCell: { width: '31.5%' },
  key: { height: 46, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  save: { borderRadius: 16, paddingVertical: 14, alignItems: 'center', marginTop: 10 },
})
