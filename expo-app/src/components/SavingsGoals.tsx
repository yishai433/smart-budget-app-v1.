import { useState, useCallback } from 'react'
import { View, Text, TextInput, StyleSheet, ActivityIndicator } from 'react-native'
import { Plus, Target, Trash2 } from 'lucide-react-native'
import { useTheme, radius } from '../theme'
import { useData } from '../context/DataContext'
import { formatAmount, displayCurrency } from '../lib/money'
import Bar from './Bar'
import Touchable from './Touchable'
import FadeIn from './FadeIn'
import BottomSheet, { SHEET_MIN_HEIGHT } from './BottomSheet'
import NumPad, { applyKey } from './NumPad'
import Caret from './Caret'
import type { SavingsGoal } from '../types'

export default function SavingsGoals() {
  const c = useTheme()
  const d = useData()
  const [addOpen, setAddOpen] = useState(false)
  const [deposit, setDeposit] = useState<SavingsGoal | null>(null)
  if (!d.savingsGoals.length && !addOpen) {
    return (
      <FadeIn delay={260}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 26, marginBottom: 12 }}>
          <Text style={{ fontSize: 17, fontWeight: '700', color: c.text }}>יעדי חיסכון</Text>
          <Touchable onPress={() => setAddOpen(true)} scale={0.9} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Plus size={16} color={c.primary} /><Text style={{ color: c.primary, fontWeight: '600', fontSize: 13 }}>הוסף</Text>
          </Touchable>
        </View>
        <View style={{ borderWidth: 1, borderColor: c.border, borderRadius: radius.lg, backgroundColor: c.card, padding: 20, alignItems: 'center' }}>
          <Target size={24} color={c.text3} />
          <Text style={{ color: c.text2, marginTop: 8, textAlign: 'center' }}>הגדר יעד חיסכון כדי לעקוב אחרי ההתקדמות.</Text>
        </View>
        <AddGoal visible={addOpen} onClose={() => setAddOpen(false)} />
      </FadeIn>
    )
  }
  return (
    <FadeIn delay={260}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 26, marginBottom: 12 }}>
        <Text style={{ fontSize: 17, fontWeight: '700', color: c.text }}>יעדי חיסכון</Text>
        <Touchable onPress={() => setAddOpen(true)} scale={0.9} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <Plus size={16} color={c.primary} /><Text style={{ color: c.primary, fontWeight: '600', fontSize: 13 }}>הוסף</Text>
        </Touchable>
      </View>
      <View style={{ gap: 10 }}>
        {d.savingsGoals.map(g => {
          const pct = g.target > 0 ? Math.round((g.saved / g.target) * 100) : 0
          return (
            <Touchable key={g.id} scale={0.99} onPress={() => setDeposit(g)} style={{ borderWidth: 1, borderColor: c.border, borderRadius: radius.lg, backgroundColor: c.card, padding: 16 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                <Text style={{ fontSize: 15, fontWeight: '700', color: c.text }}>{g.name}</Text>
                <Text style={{ fontSize: 13, color: c.text2 }}>{formatAmount(g.saved)} <Text style={{ color: c.text3 }}>/ {formatAmount(g.target)}</Text></Text>
              </View>
              <Bar pct={pct} color={g.color || c.primary} track={c.bg} height={8} />
              <Text style={{ fontSize: 11, color: c.text3, marginTop: 6 }}>{pct}% · הקש להפקדה</Text>
            </Touchable>
          )
        })}
      </View>
      <AddGoal visible={addOpen} onClose={() => setAddOpen(false)} />
      <DepositGoal goal={deposit} onClose={() => setDeposit(null)} />
    </FadeIn>
  )
}

function AddGoal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const c = useTheme()
  const { addGoal } = useData()
  const [name, setName] = useState('')
  const [target, setTarget] = useState('')
  const [busy, setBusy] = useState(false)
  const t = parseFloat(target) || 0
  const save = async () => { if (!name.trim() || !(t > 0)) return; setBusy(true); try { await addGoal(name.trim(), t); setName(''); setTarget(''); onClose() } catch { setBusy(false) } }
  return (
    <BottomSheet visible={visible} onClose={onClose} avoidKeyboard>
      <Text style={{ fontSize: 18, fontWeight: '700', color: c.text, textAlign: 'center', marginBottom: 16 }}>יעד חיסכון חדש</Text>
      <TextInput style={[gs.input, { backgroundColor: c.bg, color: c.text }]} placeholder="שם היעד (למשל חופשה)" placeholderTextColor={c.text3} value={name} onChangeText={setName} textAlign="right" />
      <TextInput style={[gs.input, { backgroundColor: c.bg, color: c.text, marginTop: 10 }]} placeholder="סכום יעד" placeholderTextColor={c.text3} keyboardType="decimal-pad" value={target} onChangeText={v => setTarget(v.replace(/[^0-9.]/g, ''))} textAlign="right" />
      <Touchable onPress={save} disabled={!name.trim() || !(t > 0) || busy} scale={0.98} style={{ marginTop: 16, borderRadius: 16, paddingVertical: 16, alignItems: 'center', backgroundColor: c.primary, opacity: name.trim() && t > 0 ? 1 : 0.4 }}>
        {busy ? <ActivityIndicator color="#fff" /> : <Text style={{ color: '#fff', fontWeight: '700', fontSize: 16 }}>שמירה</Text>}
      </Touchable>
    </BottomSheet>
  )
}

function DepositGoal({ goal, onClose }: { goal: SavingsGoal | null; onClose: () => void }) {
  const c = useTheme()
  const { depositGoal, deleteGoal } = useData()
  const [amount, setAmount] = useState('')
  const [busy, setBusy] = useState(false)
  const onKey = useCallback((k: string) => setAmount(prev => applyKey(prev, k)), [])
  const n = parseFloat(amount) || 0
  const doDeposit = async (sign: number) => { if (!goal || !(n > 0)) return; setBusy(true); try { await depositGoal(goal.id, sign * n); setAmount(''); onClose() } catch { setBusy(false) } }
  const remove = async () => { if (!goal) return; setBusy(true); try { await deleteGoal(goal.id); onClose() } catch { setBusy(false) } }
  return (
    <BottomSheet visible={!!goal} onClose={onClose} minHeight={SHEET_MIN_HEIGHT}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
        <Text style={{ fontSize: 18, fontWeight: '700', color: c.text }}>{goal?.name}</Text>
        <Touchable onPress={remove} scale={0.9} style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: c.dangerLight, alignItems: 'center', justifyContent: 'center' }}><Trash2 size={16} color={c.danger} /></Touchable>
      </View>
      <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, minHeight: 90 }}>
        <Text style={{ fontSize: 24, fontWeight: '700', color: c.text3 }}>{displayCurrency()}</Text>
        <Text style={{ fontSize: 48, fontWeight: '800', color: amount === '' ? c.text3 : c.text }}>{amount === '' ? '0' : amount}</Text>
        <Caret color={c.primary} height={44} />
      </View>
      <NumPad onKey={onKey} />
      <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
        <Touchable containerStyle={{ flex: 1 }} onPress={() => doDeposit(-1)} disabled={!(n > 0) || busy} scale={0.98} style={{ borderRadius: 16, paddingVertical: 15, alignItems: 'center', backgroundColor: c.bg, borderWidth: 1, borderColor: c.border, opacity: n > 0 ? 1 : 0.4 }}>
          <Text style={{ color: c.text, fontWeight: '700' }}>משיכה</Text>
        </Touchable>
        <Touchable containerStyle={{ flex: 2 }} onPress={() => doDeposit(1)} disabled={!(n > 0) || busy} scale={0.98} style={{ borderRadius: 16, paddingVertical: 15, alignItems: 'center', backgroundColor: c.primary, opacity: n > 0 ? 1 : 0.4 }}>
          {busy ? <ActivityIndicator color="#fff" /> : <Text style={{ color: '#fff', fontWeight: '700' }}>הפקדה</Text>}
        </Touchable>
      </View>
    </BottomSheet>
  )
}

const gs = StyleSheet.create({
  input: { borderRadius: 14, paddingHorizontal: 16, paddingVertical: 14, fontSize: 15 },
})
