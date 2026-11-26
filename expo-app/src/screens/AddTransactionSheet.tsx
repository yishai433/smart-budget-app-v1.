import { useState } from 'react'
import { View, Text, TextInput, Modal, ScrollView, StyleSheet, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native'
import { X } from 'lucide-react-native'
import { useTheme } from '../theme'
import { CATEGORIES } from '../categories'
import { useData } from '../context/DataContext'
import { todayISO } from '../lib/month'
import Touchable from '../components/Touchable'
import type { TxType } from '../types'

export default function AddTransactionSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const c = useTheme()
  const { addTransaction } = useData()
  const [type, setType] = useState<TxType>('expense')
  const [category, setCategory] = useState('food')
  const [amount, setAmount] = useState('')
  const [desc, setDesc] = useState('')
  const [busy, setBusy] = useState(false)

  const reset = () => { setType('expense'); setCategory('food'); setAmount(''); setDesc('') }
  const save = async () => {
    const n = parseFloat(amount)
    if (!(n > 0)) return
    setBusy(true)
    try {
      await addTransaction({ type, category, amount: n, description: desc.trim(), date: todayISO() })
      reset(); onClose()
    } finally { setBusy(false) }
  }
  const cats = CATEGORIES[type]

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' }}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={{ backgroundColor: c.card, borderTopLeftRadius: 28, borderTopRightRadius: 28, maxHeight: '88%' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20, paddingBottom: 8 }}>
              <Text style={{ fontSize: 18, fontWeight: '700', color: c.text }}>הוספת תנועה</Text>
              <Touchable onPress={onClose} scale={0.9} style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: c.bg, alignItems: 'center', justifyContent: 'center' }}>
                <X size={17} color={c.text} />
              </Touchable>
            </View>
            <ScrollView contentContainerStyle={{ padding: 20, paddingTop: 8, gap: 16 }} keyboardShouldPersistTaps="handled">
              <View style={{ flexDirection: 'row', backgroundColor: c.bg, borderRadius: 999, padding: 3 }}>
                {(['expense', 'income'] as TxType[]).map(t => (
                  <Touchable key={t} containerStyle={{ flex: 1 }} onPress={() => { setType(t); setCategory(CATEGORIES[t][0].id) }}
                    style={[s.seg, type === t && { backgroundColor: c.card }]}>
                    <Text style={{ fontWeight: '700', color: type === t ? c.text : c.text2 }}>{t === 'expense' ? 'הוצאה' : 'הכנסה'}</Text>
                  </Touchable>
                ))}
              </View>
              <TextInput style={[s.input, { backgroundColor: c.bg, color: c.text }]} placeholder="סכום" placeholderTextColor={c.text3}
                keyboardType="decimal-pad" value={amount} onChangeText={setAmount} textAlign="center" />
              <TextInput style={[s.input, { backgroundColor: c.bg, color: c.text }]} placeholder="תיאור (לא חובה)" placeholderTextColor={c.text3}
                value={desc} onChangeText={setDesc} textAlign="right" />
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'flex-end' }}>
                {cats.map(cat => {
                  const on = cat.id === category
                  return (
                    <Touchable key={cat.id} onPress={() => setCategory(cat.id)} scale={0.95}
                      style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 9, borderRadius: 999, backgroundColor: on ? cat.color + '22' : c.bg, borderWidth: 1.5, borderColor: on ? cat.color : 'transparent' }}>
                      <Text>{cat.emoji}</Text>
                      <Text style={{ fontSize: 13, fontWeight: '600', color: c.text }}>{cat.label}</Text>
                    </Touchable>
                  )
                })}
              </View>
              <Touchable onPress={save} disabled={busy || !(parseFloat(amount) > 0)}
                style={{ backgroundColor: c.primary, borderRadius: 14, paddingVertical: 15, alignItems: 'center' }}>
                {busy ? <ActivityIndicator color="#fff" /> : <Text style={{ color: '#fff', fontWeight: '700', fontSize: 16 }}>שמירה</Text>}
              </Touchable>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  )
}
const s = StyleSheet.create({
  seg: { paddingVertical: 10, borderRadius: 999, alignItems: 'center' },
  input: { borderRadius: 14, paddingHorizontal: 16, paddingVertical: 14, fontSize: 18, fontWeight: '600' },
})
