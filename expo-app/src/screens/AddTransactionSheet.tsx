import { useState, useEffect, useCallback, memo } from 'react'
import { View, Text, TextInput, ScrollView, StyleSheet, ActivityIndicator } from 'react-native'
import { X, Trash2 } from 'lucide-react-native'
import { useTheme, Theme } from '../theme'
import { CATEGORIES, Category } from '../categories'
import { useData } from '../context/DataContext'
import { displayCurrency } from '../lib/money'
import { todayISO } from '../lib/month'
import Touchable from '../components/Touchable'
import BottomSheet from '../components/BottomSheet'
import NumPad, { applyKey } from '../components/NumPad'
import Caret from '../components/Caret'
import type { TxType, Transaction } from '../types'

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

export default function AddTransactionSheet({ visible, onClose, editTx }: { visible: boolean; onClose: () => void; editTx?: Transaction | null }) {
  const c = useTheme()
  const { addTransaction, updateTransaction, deleteTransaction } = useData()
  const [type, setType] = useState<TxType>('expense')
  const [category, setCategory] = useState('food')
  const [amount, setAmount] = useState('')
  const [desc, setDesc] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!visible) return
    if (editTx) { setType(editTx.type); setCategory(editTx.category); setAmount(String(editTx.amount)); setDesc(editTx.description || '') }
    else { setType('expense'); setCategory('food'); setAmount(''); setDesc('') }
    setBusy(false)
  }, [visible, editTx])

  const pick = useCallback((id: string) => setCategory(id), [])
  const onKey = useCallback((k: string) => setAmount(prev => applyKey(prev, k)), [])
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

  return (
    <BottomSheet visible={visible} onClose={onClose} avoidKeyboard>
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
        <Caret color={c.primary} height={30} />
      </View>

      <ScrollView style={{ height: 160 }} contentContainerStyle={s.grid} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator persistentScrollbar>
        {cats.map(cat => <Chip key={cat.id} cat={cat} selected={cat.id === category} onPick={pick} c={c} />)}
        {Array.from({ length: fillers }).map((_, i) => <View key={`f${i}`} style={s.cell} />)}
      </ScrollView>

      <TextInput style={[s.desc, { backgroundColor: c.bg, color: c.text }]} value={desc} onChangeText={setDesc}
        placeholder="תיאור (לא חובה)" placeholderTextColor={c.text3} textAlign="right" returnKeyType="done" />

      <NumPad onKey={onKey} />

      <Touchable onPress={save} disabled={!canSave} scale={0.98} style={[s.save, { backgroundColor: c.primary, opacity: canSave ? 1 : 0.4 }]}>
        {busy ? <ActivityIndicator color="#fff" /> : <Text style={{ color: '#fff', fontWeight: '700', fontSize: 16 }}>{editTx ? 'עדכון' : 'שמירה'}</Text>}
      </Touchable>
    </BottomSheet>
  )
}

const s = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  title: { fontSize: 18, fontWeight: '700' },
  x: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  seg: { flexDirection: 'row', borderRadius: 999, padding: 4, gap: 4, marginBottom: 2 },
  segBtn: { paddingVertical: 10, borderRadius: 999, alignItems: 'center' },
  amountWrap: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, paddingVertical: 6 },
  cur: { fontSize: 18, fontWeight: '700' },
  amount: { fontSize: 32, fontWeight: '800', minWidth: 44, textAlign: 'center' },
  grid: { flexDirection: 'row-reverse', flexWrap: 'wrap', justifyContent: 'space-between', alignContent: 'center', flexGrow: 1 },
  cell: { width: '31%' },
  chip: { height: 54, borderRadius: 14, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  desc: { borderRadius: 12, paddingHorizontal: 16, paddingVertical: 10, fontSize: 14, marginTop: 2, marginBottom: 8 },
  save: { borderRadius: 16, paddingVertical: 14, alignItems: 'center', marginTop: 10 },
})
