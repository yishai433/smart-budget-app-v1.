import { useState, useRef, useEffect } from 'react'
import { View, Text, TextInput, Modal, ScrollView, StyleSheet, KeyboardAvoidingView, Platform, Pressable, ActivityIndicator } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { X } from 'lucide-react-native'
import { useTheme, radius, Theme } from '../theme'
import { CATEGORIES } from '../categories'
import { useData } from '../context/DataContext'
import { todayISO } from '../lib/month'
import Touchable from '../components/Touchable'
import type { TxType } from '../types'

export default function AddTransactionSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const c = useTheme()
  const insets = useSafeAreaInsets()
  const { addTransaction } = useData()
  const [type, setType] = useState<TxType>('expense')
  const [category, setCategory] = useState('food')
  const [amount, setAmount] = useState('')
  const [desc, setDesc] = useState('')
  const [busy, setBusy] = useState(false)
  const amountRef = useRef<TextInput>(null)

  useEffect(() => {
    if (visible) { setType('expense'); setCategory('food'); setAmount(''); setDesc(''); setBusy(false); setTimeout(() => amountRef.current?.focus(), 300) }
  }, [visible])

  const n = parseFloat(amount) || 0
  const canSave = n > 0 && !busy
  const save = async () => {
    if (!canSave) return
    setBusy(true)
    try { await addTransaction({ type, category, amount: n, description: desc.trim(), date: todayISO() }); onClose() }
    catch { setBusy(false) }
  }
  const cats = CATEGORIES[type]

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose} statusBarTranslucent>
      <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.45)' }}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={[s.sheet, { backgroundColor: c.card, paddingBottom: insets.bottom + 12 }]}>
            <View style={s.handle} />
            <View style={s.header}>
              <Text style={[s.title, { color: c.text }]}>הוספת תנועה</Text>
              <Touchable onPress={onClose} scale={0.9} style={[s.x, { backgroundColor: c.bg }]}><X size={18} color={c.text2} /></Touchable>
            </View>

            {/* type toggle */}
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

            {/* amount */}
            <View style={s.amountWrap}>
              <Text style={[s.cur, { color: c.text3 }]}>₪</Text>
              <TextInput ref={amountRef} style={[s.amount, { color: c.text }]} value={amount} onChangeText={t => setAmount(t.replace(/[^0-9.]/g, ''))}
                keyboardType="decimal-pad" placeholder="0" placeholderTextColor={c.text3} />
            </View>

            {/* categories */}
            <ScrollView style={{ maxHeight: 190 }} contentContainerStyle={s.grid} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
              {cats.map(cat => {
                const on = cat.id === category
                return (
                  <Touchable key={cat.id} scale={0.94} onPress={() => setCategory(cat.id)} containerStyle={s.cell}
                    style={[s.chip, { backgroundColor: on ? cat.color + '22' : c.bg, borderColor: on ? cat.color : 'transparent' }]}>
                    <Text style={{ fontSize: 22 }}>{cat.emoji}</Text>
                    <Text style={{ fontSize: 12, fontWeight: '600', color: c.text, marginTop: 4 }} numberOfLines={1}>{cat.label}</Text>
                  </Touchable>
                )
              })}
              {Array.from({ length: (3 - (cats.length % 3)) % 3 }).map((_, i) => <View key={`f${i}`} style={s.cell} />)}
            </ScrollView>

            {/* description */}
            <TextInput style={[s.desc, { backgroundColor: c.bg, color: c.text }]} value={desc} onChangeText={setDesc}
              placeholder="תיאור (לא חובה)" placeholderTextColor={c.text3} textAlign="right" />

            {/* save */}
            <Touchable onPress={save} disabled={!canSave} scale={0.98}
              style={[s.save, { backgroundColor: c.primary, opacity: canSave ? 1 : 0.4 }]}>
              {busy ? <ActivityIndicator color="#fff" /> : <Text style={{ color: '#fff', fontWeight: '700', fontSize: 16 }}>שמירה</Text>}
            </Touchable>
          </View>
        </KeyboardAvoidingView>
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
