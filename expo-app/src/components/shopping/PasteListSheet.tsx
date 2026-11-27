import { useState, useRef, useEffect } from 'react'
import { View, Text, TextInput, ScrollView, StyleSheet, Alert, ActivityIndicator, Keyboard, useWindowDimensions } from 'react-native'
import * as DocumentPicker from 'expo-document-picker'
import { X, Check, FileUp, ClipboardPaste, ChevronRight } from 'lucide-react-native'
import { useTheme } from '../../theme'
import { useData } from '../../context/DataContext'
import { formatAmount } from '../../lib/money'
import { guessShoppingCategory } from '../../lib/shopCategories'
import { parseList, ParsedLine } from '../../lib/listImport'
import { PriceIndex, searchProducts, autoMatch, priceAt, fuzzyMatch } from '../../lib/priceIndex'
import BottomSheet, { SHEET_TALL } from '../BottomSheet'
import useKeyboardHeight from '../../lib/useKeyboardHeight'
import Touchable from '../Touchable'

interface Match { line: ParsedLine; code?: string; product?: string; price: number | null; on: boolean }

// The closest real product for one line of the list: its barcode if it has one, otherwise the
// everyday product at the chosen branch, otherwise the best match sold at any compared branch.
function matchLine(idx: PriceIndex | null, l: ParsedLine, store: string, prefer: Set<string>): Match {
  if (idx && l.code) {
    const r = idx.byCode.get(l.code.replace(/^0+/, ''))
    if (r) return { line: l, code: r.code, product: r.name, price: priceAt(idx, r.code, store), on: true }
  }
  if (idx && l.name) {
    const m = autoMatch(idx, l.name, store, prefer)
      || searchProducts(idx, l.name, store, { limit: 8, prefer }).find(h => h.exact && !h.variant && h.branches > 0)
      || fuzzyMatch(idx, l.name, store, prefer)
    if (m) return { line: l, code: m.code, product: m.name, price: m.price, on: true }
  }
  return { line: l, price: null, on: !!l.name }
}

// Paste a whole shopping list (or pick a text / CSV file) and add it in one go, with prices.
export default function PasteListSheet({ visible, idx, store, prefer, onClose, onAdded }: {
  visible: boolean; idx: PriceIndex | null; store: string; prefer: Set<string>; onClose: () => void; onAdded: (n: number) => void
}) {
  const c = useTheme()
  const d = useData()
  const textRef = useRef('')
  const [seed, setSeed] = useState({ k: 0, v: '' })     // set the box's text from a file
  const [hasText, setHasText] = useState(false)
  const hasTextRef = useRef(false)
  const [matches, setMatches] = useState<Match[] | null>(null)
  const [busy, setBusy] = useState(false)
  const [saving, setSaving] = useState(false)
  // The text box has a fixed height and scrolls inside, so a long list never pushes the
  // buttons down behind the keyboard (and the sheet doesn't re-layout on every new line).
  const { height: winH } = useWindowDimensions()
  const kb = useKeyboardHeight(visible)
  const boxH = Math.round(Math.max(130, Math.min(winH * 0.42, winH - kb - 330)))

  useEffect(() => { if (!visible) { textRef.current = ''; setSeed(x => ({ k: x.k + 1, v: '' })); setHasText(false); hasTextRef.current = false; setMatches(null); setBusy(false) } }, [visible])

  const pickFile = async () => {
    try {
      const res = await DocumentPicker.getDocumentAsync({ type: ['text/*', 'text/csv', 'text/comma-separated-values', 'application/csv', 'text/tab-separated-values', '*/*'], copyToCacheDirectory: true, multiple: false })
      if (res.canceled || !res.assets?.length) return
      const a = res.assets[0]
      if (/\.(xlsx?|numbers|pdf|docx?)$/i.test(a.name || '')) {
        Alert.alert('הקובץ הזה לא נתמך', 'אפשר להעלות קובץ טקסט או CSV. מאקסל: מסמנים את העמודות, מעתיקים ומדביקים כאן, או שומרים בתור CSV.')
        return
      }
      const txt = await (await fetch(a.uri)).text()
      textRef.current = txt
      setSeed(x => ({ k: x.k + 1, v: txt }))
      hasTextRef.current = !!txt.trim(); setHasText(hasTextRef.current)
    } catch {
      Alert.alert('לא הצלחנו לקרוא את הקובץ', 'נסו להעתיק את התוכן ולהדביק אותו כאן.')
    }
  }

  // Match line by line, a few at a time, so the screen stays responsive on long lists.
  const check = () => {
    Keyboard.dismiss()
    const lines = parseList(textRef.current)
    if (!lines.length) { Alert.alert('לא מצאנו מוצרים', 'כתבו או הדביקו מוצר בכל שורה, למשל:\nחלב x2\nלחם\nביצים'); return }
    setBusy(true)
    const out: Match[] = []
    let i = 0
    const step = () => {
      for (const end = Math.min(lines.length, i + 4); i < end; i++) out.push(matchLine(idx, lines[i], store, prefer))
      if (i < lines.length) setTimeout(step, 0)
      else { setMatches(out); setBusy(false) }
    }
    setTimeout(step, 30)
  }

  const chosen = (matches || []).filter(m => m.on)
  const total = chosen.reduce((a, m) => a + (m.price || 0) * m.line.qty, 0)
  const toggle = (i: number) => setMatches(ms => ms && ms.map((m, j) => j === i ? { ...m, on: !m.on } : m))

  const add = async () => {
    if (!chosen.length || saving) return
    setSaving(true)
    try {
      const batch = String(Date.now())
      await Promise.all(chosen.map(m => d.addShoppingItem({
        name: m.line.name || m.product || '', category: guessShoppingCategory(m.line.name || m.product || ''), quantity: m.line.qty,
        estimatedPrice: m.price ?? 0, priceManual: false, checked: false, batch,
        ...(m.code ? { code: m.code, matchedName: m.product } : {}),
      })))
      onAdded(chosen.length)
    } catch {
      Alert.alert('ההוספה נכשלה', 'בדקו את החיבור לאינטרנט ונסו שוב.')
    } finally { setSaving(false) }
  }

  return (
    <BottomSheet visible={visible} onClose={onClose} avoidKeyboard minHeight={SHEET_TALL}>
      <View style={s.header}>
        <View style={{ flex: 1 }}>
          <Text style={[s.title, { color: c.text }]}>{matches ? 'בדיקה לפני הוספה' : 'הדבקת רשימה'}</Text>
          <Text style={{ fontSize: 12.5, color: c.text2, marginTop: 2, textAlign: 'right' }}>
            {matches ? `${matches.filter(m => m.code).length} מתוך ${matches.length} זוהו עם מחיר` : 'רשימה קבועה, הודעה, קובץ מהסופר: מוצר בכל שורה'}
          </Text>
        </View>
        <Touchable onPress={onClose} scale={0.9} style={[s.x, { backgroundColor: c.bg }]}><X size={18} color={c.text2} /></Touchable>
      </View>

      {!matches ? (
        <View>
          {/* actions first, at eye level: continue, or open a file */}
          <View style={s.btns}>
            <Touchable onPress={check} disabled={!hasText || busy} scale={0.97} containerStyle={{ flex: 1 }} style={[s.primary, { backgroundColor: c.primary, opacity: hasText ? 1 : 0.4 }]}>
              {busy ? <ActivityIndicator color="#fff" /> : <Text style={{ color: '#fff', fontWeight: '700', fontSize: 15.5 }}>המשך ומחירים</Text>}
            </Touchable>
            <Touchable onPress={pickFile} scale={0.95} style={[s.file, { backgroundColor: c.primaryLight }]}>
              <FileUp size={17} color={c.primary} /><Text style={{ color: c.primary, fontWeight: '700', fontSize: 14 }}>פתיחת קובץ</Text>
            </Touchable>
          </View>
          <TextInput key={seed.k} defaultValue={seed.v} multiline scrollEnabled textAlignVertical="top" textAlign="right"
            onChangeText={v => { textRef.current = v; const h = !!v.trim(); if (h !== hasTextRef.current) { hasTextRef.current = h; setHasText(h) } }}
            placeholder={'למשל:\nחלב 3% x2\nלחם\n2 קוטג\'\nביצים\nנייר טואלט'} placeholderTextColor={c.text3}
            style={[s.box, { backgroundColor: c.bg, color: c.text, height: boxH }]} />
          <View style={s.tips}>
            <ClipboardPaste size={14} color={c.text3} />
            <Text style={{ flex: 1, fontSize: 12, color: c.text3, textAlign: 'right', lineHeight: 17 }}>
              לחיצה ארוכה בתיבה ← "הדבק". אפשר כמה מוצרים בשורה (עם נקודה ביניהם), כמויות כמו "x2" או "3 יח'", ועמודות מאקסל.
            </Text>
          </View>
        </View>
      ) : (
        <View style={{ flex: 1 }}>
          <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator>
            {matches.map((m, i) => (
              <Touchable key={i} onPress={() => toggle(i)} scale={0.99} style={[s.row, i ? { borderTopColor: c.sep, borderTopWidth: StyleSheet.hairlineWidth } : null]}>
                <View style={[s.check, m.on ? { backgroundColor: c.primary, borderColor: c.primary } : { borderColor: c.text3 }]}>
                  {m.on ? <Check size={14} color="#fff" strokeWidth={3} /> : null}
                </View>
                <View style={{ flex: 1 }}>
                  <Text numberOfLines={1} style={{ fontSize: 15, fontWeight: '600', color: m.on ? c.text : c.text3, textAlign: 'right' }}>
                    {m.line.name || m.product}{m.line.qty > 1 ? `  ×${m.line.qty}` : ''}
                  </Text>
                  <Text numberOfLines={1} style={{ fontSize: 11.5, color: m.code ? c.text2 : c.danger, textAlign: 'right', marginTop: 2 }}>
                    {m.code ? m.product : 'לא נמצא מוצר תואם · יתווסף בלי מחיר'}
                  </Text>
                </View>
                <Text style={{ fontSize: 14, fontWeight: '700', color: m.on ? c.text : c.text3 }}>
                  {m.price != null ? formatAmount(m.price * m.line.qty) : m.code ? 'לא בסניף' : ''}
                </Text>
              </Touchable>
            ))}
          </ScrollView>
          <View style={[s.sum, { borderTopColor: c.sep }]}>
            <Touchable onPress={() => setMatches(null)} scale={0.95} style={s.back}>
              <ChevronRight size={16} color={c.primary} /><Text style={{ color: c.primary, fontWeight: '700', fontSize: 13.5 }}>עריכה</Text>
            </Touchable>
            <Text style={{ fontSize: 13.5, color: c.text2 }}>בערך <Text style={{ fontWeight: '800', color: c.text }}>{formatAmount(total)}</Text></Text>
          </View>
          <Touchable onPress={add} disabled={!chosen.length || saving} scale={0.98} style={[s.primary, { backgroundColor: c.primary, opacity: chosen.length ? 1 : 0.4 }]}>
            {saving ? <ActivityIndicator color="#fff" /> : <Text style={{ color: '#fff', fontWeight: '700', fontSize: 15.5 }}>הוספת {chosen.length} מוצרים והשוואת מחירים</Text>}
          </Touchable>
        </View>
      )}
    </BottomSheet>
  )
}

const s = StyleSheet.create({
  header: { flexDirection: 'row-reverse', alignItems: 'center', gap: 10, marginBottom: 12 },
  title: { fontSize: 18, fontWeight: '800', textAlign: 'right' },
  x: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  box: { borderRadius: 16, padding: 14, paddingTop: 14, fontSize: 16, lineHeight: 24, marginTop: 12 },
  tips: { flexDirection: 'row-reverse', alignItems: 'flex-start', gap: 6, marginTop: 8 },
  btns: { flexDirection: 'row-reverse', alignItems: 'center', gap: 10 },
  primary: { borderRadius: 16, paddingVertical: 14, alignItems: 'center', justifyContent: 'center', minHeight: 50 },
  file: { flexDirection: 'row-reverse', alignItems: 'center', gap: 6, borderRadius: 16, paddingHorizontal: 16, height: 50 },
  row: { flexDirection: 'row-reverse', alignItems: 'center', gap: 10, paddingVertical: 11 },
  check: { width: 24, height: 24, borderRadius: 12, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  sum: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', borderTopWidth: StyleSheet.hairlineWidth, paddingTop: 10, marginTop: 4, marginBottom: 2 },
  back: { flexDirection: 'row-reverse', alignItems: 'center', gap: 2, padding: 4 },
})
