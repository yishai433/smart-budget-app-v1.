import { useState } from 'react'
import { View, Text, ScrollView, TextInput, StyleSheet } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Check, ScanLine, Plus, Trash2 } from 'lucide-react-native'
import { useTheme, radius } from '../theme'
import { useData } from '../context/DataContext'
import { useAuth } from '../context/AuthContext'
import { formatAmount } from '../lib/money'
import FadeIn from '../components/FadeIn'
import Header from '../components/Header'
import Touchable from '../components/Touchable'
import BarcodeScanner from '../components/BarcodeScanner'

export default function ShoppingScreen() {
  const c = useTheme()
  const insets = useSafeAreaInsets()
  const { user } = useAuth()
  const d = useData()
  const [text, setText] = useState('')
  const [scanning, setScanning] = useState(false)
  const names = [user?.displayName || user?.email?.split('@')[0] || 'אני', d.partnerName || ''].filter(Boolean)

  const items = d.shoppingItems
  const left = items.filter(i => !i.checked).length
  const anyChecked = items.some(i => i.checked)
  const addTyped = async () => { const n = text.trim(); if (!n) return; setText(''); await d.addShoppingItem({ name: n, checked: false }) }

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <ScrollView contentContainerStyle={{ padding: 16, paddingTop: insets.top + 12, paddingBottom: 140 }} keyboardShouldPersistTaps="handled">
        <FadeIn><Header title="קניות" names={names} /><Text style={[s.sub, { color: c.text2 }]}>{left} פריטים ברשימה</Text></FadeIn>

        <FadeIn delay={60}>
          <View style={{ flexDirection: 'row', gap: 8, marginBottom: 14 }}>
            <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: c.card, borderWidth: 1, borderColor: c.border, borderRadius: 14, paddingHorizontal: 12 }}>
              <TextInput style={{ flex: 1, height: 48, color: c.text, fontSize: 15 }} placeholder="הוסף פריט" placeholderTextColor={c.text3}
                value={text} onChangeText={setText} onSubmitEditing={addTyped} returnKeyType="done" textAlign="right" />
              <Touchable onPress={addTyped} scale={0.9}><Plus size={22} color={c.primary} /></Touchable>
            </View>
            <Touchable onPress={() => setScanning(true)} style={{ width: 48, height: 48, borderRadius: 14, backgroundColor: c.accent2Light, alignItems: 'center', justifyContent: 'center' }}>
              <ScanLine size={22} color={c.accent2Dark} />
            </Touchable>
          </View>
        </FadeIn>

        {items.length === 0 ? (
          <FadeIn delay={120}>
            <View style={[s.card, { backgroundColor: c.card, borderColor: c.border, alignItems: 'center', padding: 28 }]}>
              <Text style={{ color: c.text2, textAlign: 'center' }}>הרשימה ריקה. הוסף פריט למעלה או סרוק ברקוד.</Text>
            </View>
          </FadeIn>
        ) : (
          <FadeIn delay={120}>
            <View style={[s.card, { backgroundColor: c.card, borderColor: c.border }]}>
              {items.map((it, i) => (
                <View key={it.id} style={[s.row, i ? { borderTopColor: c.sep, borderTopWidth: StyleSheet.hairlineWidth } : null]}>
                  <Touchable onPress={() => d.updateShoppingItem(it.id, { checked: !it.checked })} scale={0.9}>
                    <View style={[s.box, it.checked ? { backgroundColor: c.primary, borderColor: c.primary } : { borderColor: c.text3 }]}>
                      {it.checked ? <Check size={15} color="#fff" strokeWidth={3} /> : null}
                    </View>
                  </Touchable>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 15, color: it.checked ? c.text3 : c.text, textDecorationLine: it.checked ? 'line-through' : 'none' }}>{it.name}</Text>
                    {it.estimatedPrice ? <Text style={{ fontSize: 12, color: c.text2, marginTop: 2 }}>{formatAmount(it.estimatedPrice)}{it.quantity && it.quantity > 1 ? ` × ${it.quantity}` : ''}</Text> : null}
                  </View>
                  <Touchable onPress={() => d.deleteShoppingItem(it.id)} scale={0.9}><Trash2 size={17} color={c.text3} /></Touchable>
                </View>
              ))}
            </View>
          </FadeIn>
        )}

        {anyChecked && (
          <FadeIn delay={60}>
            <Touchable onPress={() => d.clearChecked()} style={{ marginTop: 14, paddingVertical: 13, borderRadius: 14, backgroundColor: c.card, borderWidth: 1, borderColor: c.border, alignItems: 'center' }}>
              <Text style={{ color: c.text2, fontWeight: '600' }}>נקה פריטים מסומנים</Text>
            </Touchable>
          </FadeIn>
        )}
      </ScrollView>

      <BarcodeScanner visible={scanning} onClose={() => setScanning(false)} />
    </View>
  )
}
const s = StyleSheet.create({
  sub: { fontSize: 13, textAlign: 'right', marginTop: 2, marginBottom: 16 },
  card: { borderWidth: 1, borderRadius: radius.lg, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 15 },
  box: { width: 24, height: 24, borderRadius: 7, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
})
