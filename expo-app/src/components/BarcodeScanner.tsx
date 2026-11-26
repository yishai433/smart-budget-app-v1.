import { useState, useRef } from 'react'
import { View, Text, Modal, TextInput, ActivityIndicator, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native'
import { CameraView, useCameraPermissions, BarcodeScanningResult } from 'expo-camera'
import { X, Search, Check } from 'lucide-react-native'
import { useTheme } from '../theme'
import { useData } from '../context/DataContext'
import { askPriceServer, PriceResult } from '../lib/priceApi'
import { formatAmount } from '../lib/money'
import Touchable from './Touchable'

type Stage = 'scan' | 'looking' | 'result' | 'notfound' | 'error'

export default function BarcodeScanner({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const c = useTheme()
  const d = useData()
  const [perm, requestPerm] = useCameraPermissions()
  const [stage, setStage] = useState<Stage>('scan')
  const [typed, setTyped] = useState('')
  const [results, setResults] = useState<PriceResult[]>([])
  const [pick, setPick] = useState(0)
  const [name, setName] = useState('')
  const [price, setPrice] = useState('')
  const [preparing, setPreparing] = useState(false)
  const [barcode, setBarcode] = useState('')
  const busy = useRef(false)

  if (visible && !perm?.granted) { if (perm && !perm.granted && perm.canAskAgain) requestPerm() }

  const lookup = async (raw: string) => {
    const clean = String(raw).replace(/\D/g, '')
    if (clean.length < 6) { busy.current = false; return }
    setBarcode(clean); setStage('looking')
    try {
      const ans = await askPriceServer(d.activeHouseholdId || '', d.uid || '', { barcode: clean }, 15000)
      if (ans.status === 'done' && ans.results?.length) {
        const sorted = [...ans.results].sort((a, b) => a.price - b.price)
        setResults(sorted); setPick(0); setName(sorted[0].name); setPrice(String(sorted[0].price)); setStage('result')
      } else if (ans.status === 'done') { setPreparing(!!ans.preparing); setStage('notfound') }
      else setStage('error')
    } catch { setStage('error') }
    busy.current = false
  }

  const onScan = (r: BarcodeScanningResult) => { if (!busy.current && stage === 'scan') { busy.current = true; lookup(r.data) } }

  const reset = () => { busy.current = false; setResults([]); setName(''); setPrice(''); setTyped(''); setStage('scan') }
  const close = () => { reset(); onClose() }

  const add = async () => {
    const p = Math.max(0, parseFloat(price) || 0)
    if (!name.trim()) return
    const existing = d.shoppingItems.find(i => i.barcode === barcode || i.name.trim() === name.trim())
    if (existing) await d.updateShoppingItem(existing.id, { estimatedPrice: p, checked: true, barcode })
    else await d.addShoppingItem({ name: name.trim(), quantity: 1, estimatedPrice: p, category: 'other', barcode, checked: true })
    reset()
  }

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={close}>
      <View style={{ flex: 1, backgroundColor: c.bg }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20, paddingTop: 56 }}>
          <Text style={{ fontSize: 20, fontWeight: '700', color: c.text }}>סריקת מוצר</Text>
          <Touchable onPress={close} scale={0.9} style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: c.card, alignItems: 'center', justifyContent: 'center' }}>
            <X size={18} color={c.text} />
          </Touchable>
        </View>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, padding: 20, paddingTop: 0 }}>
          {stage === 'scan' && (
            <>
              <View style={{ borderRadius: 20, overflow: 'hidden', backgroundColor: '#000', aspectRatio: 3 / 4, maxHeight: 420 }}>
                {perm?.granted ? (
                  <CameraView style={{ flex: 1 }} facing="back" barcodeScannerSettings={{ barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e', 'code128'] }} onBarcodeScanned={onScan} />
                ) : (
                  <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 }}>
                    <Text style={{ color: '#fff', textAlign: 'center' }}>צריך הרשאת מצלמה כדי לסרוק. אפשר גם להקליד את הברקוד למטה.</Text>
                  </View>
                )}
                <View pointerEvents="none" style={{ position: 'absolute', left: '12%', right: '12%', top: '40%', bottom: '40%', borderWidth: 2, borderColor: 'rgba(255,255,255,0.85)', borderRadius: 12 }} />
              </View>
              <Text style={{ fontSize: 13, color: c.text2, textAlign: 'center', marginTop: 14 }}>כוון את המצלמה אל הברקוד</Text>
              <View style={{ flexDirection: 'row', gap: 8, marginTop: 14 }}>
                <TextInput style={{ flex: 1, backgroundColor: c.card, borderWidth: 1, borderColor: c.border, borderRadius: 14, paddingHorizontal: 14, height: 48, color: c.text }}
                  placeholder="או הקלד מספר ברקוד" placeholderTextColor={c.text3} keyboardType="number-pad" value={typed} onChangeText={t => setTyped(t.replace(/\D/g, ''))} textAlign="right" />
                <Touchable onPress={() => { busy.current = true; lookup(typed) }} style={{ width: 48, height: 48, borderRadius: 14, backgroundColor: c.primary, alignItems: 'center', justifyContent: 'center' }}>
                  <Search size={18} color="#fff" />
                </Touchable>
              </View>
            </>
          )}

          {stage === 'looking' && (
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 }}>
              <ActivityIndicator color={c.primary} size="large" />
              <Text style={{ color: c.text2 }}>מחפש מחירים בשרת…</Text>
            </View>
          )}

          {stage === 'result' && (
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 13, color: c.text2, marginBottom: 10 }}>נמצאו {results.length} סניפים. בחר מחיר:</Text>
              <View style={{ gap: 8 }}>
                {results.slice(0, 6).map((r, i) => {
                  const on = i === pick
                  return (
                    <Touchable key={i} onPress={() => { setPick(i); setName(r.name); setPrice(String(r.price)) }}
                      style={{ flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14, borderRadius: 14, backgroundColor: c.card, borderWidth: 1.5, borderColor: on ? c.primary : c.border }}>
                      {on ? <Check size={18} color={c.primary} /> : <View style={{ width: 18 }} />}
                      <Text style={{ flex: 1, color: c.text, fontSize: 14 }}>{r.label || r.chain || 'סניף'}</Text>
                      <Text style={{ fontWeight: '700', color: c.text }}>{formatAmount(r.price)}</Text>
                    </Touchable>
                  )
                })}
              </View>
              <TextInput style={{ backgroundColor: c.card, borderWidth: 1, borderColor: c.border, borderRadius: 14, padding: 14, color: c.text, marginTop: 14 }}
                value={name} onChangeText={setName} textAlign="right" placeholder="שם המוצר" placeholderTextColor={c.text3} />
              <View style={{ flexDirection: 'row', gap: 10, marginTop: 14 }}>
                <Touchable containerStyle={{ flex: 1 }} onPress={reset} style={{ paddingVertical: 15, borderRadius: 14, backgroundColor: c.card, borderWidth: 1, borderColor: c.border, alignItems: 'center' }}>
                  <Text style={{ color: c.text, fontWeight: '600' }}>סרוק עוד</Text>
                </Touchable>
                <Touchable containerStyle={{ flex: 2 }} onPress={add} style={{ paddingVertical: 15, borderRadius: 14, backgroundColor: c.primary, alignItems: 'center' }}>
                  <Text style={{ color: '#fff', fontWeight: '700' }}>הוסף לרשימה</Text>
                </Touchable>
              </View>
            </View>
          )}

          {(stage === 'notfound' || stage === 'error') && (
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 14, padding: 24 }}>
              <Text style={{ color: c.text, fontSize: 16, fontWeight: '600', textAlign: 'center' }}>
                {stage === 'notfound' ? (preparing ? 'מחירי הסניפים עדיין נטענים בשרת. נסה שוב בעוד דקה.' : 'המוצר לא נמצא בסניפים שבחרת.') : 'השרת הביתי לא ענה. בדוק שהוא פועל.'}
              </Text>
              <Touchable onPress={reset} style={{ paddingVertical: 14, paddingHorizontal: 28, borderRadius: 14, backgroundColor: c.primary }}>
                <Text style={{ color: '#fff', fontWeight: '700' }}>סרוק שוב</Text>
              </Touchable>
            </View>
          )}
        </KeyboardAvoidingView>
      </View>
    </Modal>
  )
}
