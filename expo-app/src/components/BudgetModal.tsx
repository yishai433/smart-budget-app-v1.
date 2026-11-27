import { useState, useEffect, useCallback } from 'react'
import { View, Text, StyleSheet, ActivityIndicator, Alert } from 'react-native'
import { useTheme } from '../theme'
import { displayCurrency } from '../lib/money'
import Touchable from './Touchable'
import BottomSheet, { SHEET_MIN_HEIGHT } from './BottomSheet'
import NumPad, { applyKey } from './NumPad'
import AmountDisplay from './AmountDisplay'

export default function BudgetModal({ visible, current, monthLabel, onClose, onSave }: { visible: boolean; current: number | null; monthLabel: string; onClose: () => void; onSave: (n: number) => Promise<void> }) {
  const c = useTheme()
  const [val, setVal] = useState('')
  const [busy, setBusy] = useState(false)
  useEffect(() => { if (visible) { setVal(current ? String(current) : ''); setBusy(false) } }, [visible, current])
  const onKey = useCallback((k: string) => setVal(prev => applyKey(prev, k)), [])
  const n = parseFloat(val) || 0
  const save = () => { if (!(n > 0)) return; onSave(n).catch(() => Alert.alert('השמירה נכשלה', 'בדקו את החיבור לאינטרנט ונסו שוב.')); onClose() }
  return (
    <BottomSheet visible={visible} onClose={onClose} minHeight={SHEET_MIN_HEIGHT}>
      <Text style={{ fontSize: 18, fontWeight: '700', color: c.text, textAlign: 'center' }}>תקציב ל{monthLabel}</Text>
      <Text style={{ fontSize: 13, color: c.text2, textAlign: 'center', marginTop: 6 }}>כמה אתם מתכננים להוציא החודש?</Text>
      <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, minHeight: 90 }}>
        <AmountDisplay value={val} currency={displayCurrency()} size={48} curSize={24} c={c} caretHeight={44} />
      </View>
      <NumPad onKey={onKey} />
      <Touchable onPress={save} disabled={!(n > 0) || busy} scale={0.98} style={{ marginTop: 12, borderRadius: 16, paddingVertical: 15, alignItems: 'center', backgroundColor: c.primary, opacity: n > 0 ? 1 : 0.4 }}>
        {busy ? <ActivityIndicator color="#fff" /> : <Text style={{ color: '#fff', fontWeight: '700', fontSize: 16 }}>שמירה</Text>}
      </Touchable>
    </BottomSheet>
  )
}
