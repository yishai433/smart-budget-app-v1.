import { useState, useEffect, useCallback } from 'react'
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native'
import { useTheme } from '../theme'
import { displayCurrency } from '../lib/money'
import Touchable from './Touchable'
import BottomSheet from './BottomSheet'
import NumPad, { applyKey } from './NumPad'

export default function BudgetModal({ visible, current, monthLabel, onClose, onSave }: { visible: boolean; current: number | null; monthLabel: string; onClose: () => void; onSave: (n: number) => Promise<void> }) {
  const c = useTheme()
  const [val, setVal] = useState('')
  const [busy, setBusy] = useState(false)
  useEffect(() => { if (visible) { setVal(current ? String(current) : ''); setBusy(false) } }, [visible, current])
  const onKey = useCallback((k: string) => setVal(prev => applyKey(prev, k)), [])
  const n = parseFloat(val) || 0
  const save = async () => { if (!(n > 0)) return; setBusy(true); try { await onSave(n); onClose() } catch { setBusy(false) } }
  return (
    <BottomSheet visible={visible} onClose={onClose}>
      <Text style={{ fontSize: 18, fontWeight: '700', color: c.text, textAlign: 'center' }}>תקציב ל{monthLabel}</Text>
      <Text style={{ fontSize: 13, color: c.text2, textAlign: 'center', marginTop: 6 }}>כמה אתם מתכננים להוציא החודש?</Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, paddingVertical: 14 }}>
        <Text style={{ fontSize: 20, fontWeight: '700', color: c.text3 }}>{displayCurrency()}</Text>
        <Text style={{ fontSize: 38, fontWeight: '800', color: val === '' ? c.text3 : c.text, minWidth: 60, textAlign: 'center' }}>{val === '' ? '0' : val}</Text>
      </View>
      <NumPad onKey={onKey} />
      <Touchable onPress={save} disabled={!(n > 0) || busy} scale={0.98} style={{ marginTop: 12, borderRadius: 16, paddingVertical: 15, alignItems: 'center', backgroundColor: c.primary, opacity: n > 0 ? 1 : 0.4 }}>
        {busy ? <ActivityIndicator color="#fff" /> : <Text style={{ color: '#fff', fontWeight: '700', fontSize: 16 }}>שמירה</Text>}
      </Touchable>
    </BottomSheet>
  )
}
