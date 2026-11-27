import { useState, useEffect, useMemo, memo } from 'react'
import { View, Text, TextInput, ScrollView, StyleSheet, ActivityIndicator, Alert } from 'react-native'
import { X, Check, Search, Plus, Trash2 } from 'lucide-react-native'
import { useTheme, Theme } from '../../theme'
import { useData } from '../../context/DataContext'
import { loadCatalog, StoreInfo, CHAIN, cityName, storeLabel } from '../../lib/stores'
import BottomSheet, { SHEET_TALL } from '../BottomSheet'
import Touchable from '../Touchable'

const Row = memo(function Row({ s, on, c, onPick, onRemove }: { s: { k: string; title: string; sub: string }; on: boolean; c: Theme; onPick: (k: string) => void; onRemove?: (k: string) => void }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
    {onRemove ? <Touchable onPress={() => onRemove(s.k)} scale={0.88} style={st.rm}><Trash2 size={16} color={c.text3} /></Touchable> : null}
    <Touchable onPress={() => onPick(s.k)} scale={0.98} containerStyle={{ flex: 1 }} style={[st.row, { backgroundColor: on ? c.primaryLight : 'transparent' }]}>
      <View style={[st.radio, { borderColor: on ? c.primary : c.text3, backgroundColor: on ? c.primary : 'transparent' }]}>{on ? <Check size={12} color="#fff" strokeWidth={3} /> : null}</View>
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 15, fontWeight: '600', color: c.text, textAlign: 'right' }}>{s.title}</Text>
        {s.sub ? <Text style={{ fontSize: 12, color: c.text2, marginTop: 2, textAlign: 'right' }}>{s.sub}</Text> : null}
      </View>
    </Touchable>
    </View>
  )
})

// Pick the supermarket branch we're shopping at. Prices on the list follow this branch.
export default function StorePicker({ visible, labels, onClose }: { visible: boolean; labels?: Record<string, string>; onClose: () => void }) {
  const c = useTheme()
  const d = useData()
  const [catalog, setCatalog] = useState<StoreInfo[] | null>(null)
  const [q, setQ] = useState('')
  useEffect(() => { if (visible) { setQ(''); loadCatalog().then(setCatalog) } }, [visible])

  const mine = d.priceStores.map(k => {
    const s = catalog?.find(x => x.k === k)
    return { k, title: storeLabel(k, labels), sub: s ? [CHAIN[s.c], cityName(s.city)].filter(Boolean).join(' · ') : '' }
  })
  const found = useMemo(() => {
    const t = q.trim()
    if (!catalog || t.length < 2) return []
    const n = (x: string) => x.replace(/[-–'"׳״\s]/g, '')
    const tn = n(t)
    return catalog.filter(s => !d.priceStores.includes(s.k) && n(`${s.n} ${cityName(s.city)} ${s.a || ''} ${CHAIN[s.c] || ''}`).includes(tn)).slice(0, 40)
      .map(s => ({ k: s.k, title: s.n, sub: [CHAIN[s.c], cityName(s.city), s.a].filter(Boolean).join(' · ') }))
  }, [q, catalog, d.priceStores])

  const remove = (k: string) => Alert.alert('להסיר את הסניף?', `${storeLabel(k, labels)} לא ישתתף יותר בהשוואת המחירים.`, [
    { text: 'ביטול', style: 'cancel' },
    { text: 'הסרה', style: 'destructive', onPress: () => d.removeStore(k).catch(() => Alert.alert('השמירה נכשלה', 'בדקו את החיבור לאינטרנט ונסו שוב.')) },
  ])
  // every branch the search found (e.g. all supermarkets in a city) joins the comparison at once
  const addAll = () => {
    const keys = found.map(f => f.k)
    d.addStores(keys).then(n => {
      setQ('')
      Alert.alert(n ? `נוספו ${n} סניפים` : 'לא נוסף סניף', n
        ? 'השרת מוריד עכשיו את המחירים שלהם (כדקה לכל סניף). אחר כך כל מוצר וכל סל יושוו בין כולם.'
        : 'אפשר עד 15 סניפים להשוואה. הסירו סניף כדי להוסיף אחר.')
    }).catch(() => Alert.alert('השמירה נכשלה', 'בדקו את החיבור לאינטרנט ונסו שוב.'))
  }
  const pick = (k: string) => {
    const isNew = !d.priceStores.includes(k)
    d.setActiveStore(k).catch(() => Alert.alert('השמירה נכשלה', 'בדקו את החיבור לאינטרנט ונסו שוב.'))
    onClose()
    if (isNew) Alert.alert('הסניף נוסף', 'השרת מוריד עכשיו את המחירים של הסניף. זה לוקח בערך דקה, ואז המחירים יופיעו לבד.')
  }

  return (
    <BottomSheet visible={visible} onClose={onClose} avoidKeyboard minHeight={SHEET_TALL}>
      <View style={st.header}>
        <Text style={[st.title, { color: c.text }]}>איפה קונים?</Text>
        <Touchable onPress={onClose} scale={0.9} style={[st.x, { backgroundColor: c.bg }]}><X size={18} color={c.text2} /></Touchable>
      </View>
      <Text style={{ fontSize: 13, color: c.text2, textAlign: 'right', marginBottom: 12, lineHeight: 19 }}>
        המחירים ברשימה נלקחים מהסניף שתבחרו, ומתעדכנים לבד כל בוקר. בכל מוצר נראה גם איפה הוא הכי זול מבין הסניפים שלכם, אז כדאי להוסיף כאן כמה סניפים קרובים.
      </Text>

      <ScrollView style={{ flex: 1 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        {mine.length > 0 && <Text style={[st.label, { color: c.text2 }]}>הסניפים שלי</Text>}
        {mine.map(s => <Row key={s.k} s={s} on={s.k === d.activeStore} c={c} onPick={pick} onRemove={mine.length > 1 ? remove : undefined} />)}
        {mine.length > 1 ? <Text style={{ fontSize: 12, color: c.text3, textAlign: 'right', marginTop: 4 }}>המחירים מושווים בין כל {mine.length} הסניפים. הסניף המסומן הוא איפה שאתם קונים עכשיו.</Text> : null}

        <Text style={[st.label, { color: c.text2, marginTop: 16 }]}>סניף אחר</Text>
        <View style={[st.search, { backgroundColor: c.bg }]}>
          <Search size={16} color={c.text3} />
          <TextInput style={{ flex: 1, height: 44, color: c.text, fontSize: 15 }} placeholder="חיפוש לפי עיר או רשת, למשל: חצור" placeholderTextColor={c.text3}
            value={q} onChangeText={setQ} textAlign="right" autoCorrect={false} returnKeyType="search" />
        </View>
        {catalog === null ? <ActivityIndicator color={c.primary} style={{ marginTop: 16 }} /> : null}
        {catalog && q.trim().length >= 2 && !found.length ? <Text style={{ color: c.text2, textAlign: 'center', marginTop: 16 }}>לא נמצאו סניפים. נסו שם עיר אחר.</Text> : null}
        {found.length > 1 ? (
          <Touchable onPress={addAll} scale={0.97} style={[st.addAll, { backgroundColor: c.primary }]}>
            <Plus size={17} color="#fff" strokeWidth={2.6} />
            <Text style={{ color: '#fff', fontWeight: '700', fontSize: 14.5 }}>להוסיף את כל {found.length} הסניפים להשוואה</Text>
          </Touchable>
        ) : null}
        {found.map(s => <Row key={s.k} s={s} on={false} c={c} onPick={pick} />)}
        {catalog && catalog.length === 0 ? <Text style={{ color: c.text2, textAlign: 'center', marginTop: 16 }}>רשימת הסניפים עדיין לא מוכנה בשרת.</Text> : null}
        <View style={{ height: 20 }} />
      </ScrollView>
    </BottomSheet>
  )
}

const st = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
  title: { fontSize: 18, fontWeight: '700' },
  x: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  label: { fontSize: 12.5, fontWeight: '700', textAlign: 'right', marginBottom: 6 },
  row: { flexDirection: 'row-reverse', alignItems: 'center', gap: 12, paddingVertical: 12, paddingHorizontal: 10, borderRadius: 12 },
  radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  rm: { width: 36, height: 44, alignItems: 'center', justifyContent: 'center' },
  addAll: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center', gap: 6, borderRadius: 12, paddingVertical: 11, marginVertical: 8 },
  search: { flexDirection: 'row-reverse', alignItems: 'center', gap: 8, borderRadius: 12, paddingHorizontal: 12, marginBottom: 6 },
})
