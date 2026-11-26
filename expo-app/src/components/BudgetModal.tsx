import { useState, useEffect, useRef } from 'react'
import { View, Text, TextInput, Modal, StyleSheet, KeyboardAvoidingView, Platform, Pressable, ActivityIndicator } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useTheme } from '../theme'
import Touchable from './Touchable'

export default function BudgetModal({ visible, current, monthLabel, onClose, onSave }: { visible: boolean; current: number | null; monthLabel: string; onClose: () => void; onSave: (n: number) => Promise<void> }) {
  const c = useTheme()
  const insets = useSafeAreaInsets()
  const [val, setVal] = useState('')
  const [busy, setBusy] = useState(false)
  const ref = useRef<TextInput>(null)
  useEffect(() => { if (visible) { setVal(current ? String(current) : ''); setBusy(false); setTimeout(() => ref.current?.focus(), 350) } }, [visible, current])
  const n = parseFloat(val) || 0
  const save = async () => { if (!(n > 0)) return; setBusy(true); try { await onSave(n); onClose() } catch { setBusy(false) } }
  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose} statusBarTranslucent>
      <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.45)' }}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={[s.sheet, { backgroundColor: c.card, paddingBottom: insets.bottom + 16 }]}>
            <View style={s.handle} />
            <Text style={{ fontSize: 18, fontWeight: '700', color: c.text, textAlign: 'center' }}>תקציב ל{monthLabel}</Text>
            <Text style={{ fontSize: 13, color: c.text2, textAlign: 'center', marginTop: 6 }}>כמה אתם מתכננים להוציא החודש?</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, paddingVertical: 18 }}>
              <Text style={{ fontSize: 24, fontWeight: '700', color: c.text3 }}>₪</Text>
              <TextInput ref={ref} style={{ fontSize: 40, fontWeight: '800', color: c.text, minWidth: 80, textAlign: 'center', padding: 0 }}
                keyboardType="decimal-pad" placeholder="0" placeholderTextColor={c.text3} value={val} onChangeText={t => setVal(t.replace(/[^0-9.]/g, ''))} />
            </View>
            <Touchable onPress={save} disabled={!(n > 0) || busy} scale={0.98} style={{ borderRadius: 16, paddingVertical: 16, alignItems: 'center', backgroundColor: c.primary, opacity: n > 0 ? 1 : 0.4 }}>
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
  handle: { alignSelf: 'center', width: 36, height: 4, borderRadius: 2, backgroundColor: 'rgba(128,128,128,0.35)', marginBottom: 14 },
})
