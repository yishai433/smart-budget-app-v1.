import { View, Text, ScrollView, StyleSheet } from 'react-native'
import { X, Trophy, Store, Shuffle, Plus } from 'lucide-react-native'
import { useTheme } from '../../theme'
import { useData } from '../../context/DataContext'
import { formatAmount } from '../../lib/money'
import { storeLabel } from '../../lib/stores'
import type { BasketResult } from '../../lib/listImport'
import BottomSheet, { SHEET_TALL } from '../BottomSheet'
import Touchable from '../Touchable'

// Where does the whole list cost the least? Every branch the household compares, cheapest first.
export default function BasketCompareSheet({ visible, result, labels, onClose, onAddStores }: {
  visible: boolean; result: BasketResult; labels?: Record<string, string>; onClose: () => void; onAddStores: () => void
}) {
  const c = useTheme()
  const d = useData()
  const { branches, split, priced, lines } = result
  const best = branches[0]
  const mine = branches.find(b => b.key === d.activeStore)
  const save = best && mine && mine.key !== best.key ? mine.total - best.total : 0
  const worst = branches[branches.length - 1]

  return (
    <BottomSheet visible={visible} onClose={onClose} minHeight={SHEET_TALL}>
      <View style={s.header}>
        <View style={{ flex: 1 }}>
          <Text style={[s.title, { color: c.text }]}>איפה הסל הכי זול?</Text>
          <Text style={{ fontSize: 12.5, color: c.text2, marginTop: 2, textAlign: 'right' }}>
            {priced} מתוך {lines} מוצרים ברשימה עם מחיר · {branches.length} סניפים
          </Text>
        </View>
        <Touchable onPress={onClose} scale={0.9} style={[s.x, { backgroundColor: c.bg }]}><X size={18} color={c.text2} /></Touchable>
      </View>

      <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
        {!best ? (
          <Text style={{ color: c.text2, textAlign: 'center', marginTop: 30, fontSize: 14, lineHeight: 21 }}>
            עוד אין מספיק מחירים להשוואה.{'\n'}הוסיפו מוצרים מהחיפוש (כדי שיהיה להם מחיר) ועוד סניפים באזור.
          </Text>
        ) : (
          <>
            <View style={[s.hero, { backgroundColor: c.ink }]}>
              <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 8 }}>
                <Trophy size={18} color={c.inkText} />
                <Text style={{ fontSize: 13, color: c.inkText2, fontWeight: '700' }}>הכי זול</Text>
              </View>
              <Text style={{ fontSize: 19, fontWeight: '800', color: c.inkText, textAlign: 'right', marginTop: 6 }} numberOfLines={2}>{storeLabel(best.key, labels)}</Text>
              <Text style={{ fontSize: 30, fontWeight: '800', color: c.inkText, textAlign: 'right', marginTop: 2 }}>{formatAmount(best.total)}</Text>
              {save > 0.5 ? (
                <Text style={{ fontSize: 13.5, color: c.inkText, textAlign: 'right', marginTop: 4, fontWeight: '600' }}>
                  חוסכים {formatAmount(save)} לעומת {storeLabel(d.activeStore, labels)}
                </Text>
              ) : mine && mine.key === best.key ? (
                <Text style={{ fontSize: 13.5, color: c.inkText, textAlign: 'right', marginTop: 4, fontWeight: '600' }}>זה הסניף שלכם 👌</Text>
              ) : null}
              {worst && worst.key !== best.key ? (
                <Text style={{ fontSize: 12, color: c.inkText2, textAlign: 'right', marginTop: 4 }}>ההפרש מהיקר ביותר: {formatAmount(worst.total - best.total)}</Text>
              ) : null}
              {best.key !== d.activeStore ? (
                <Touchable onPress={() => { d.setActiveStore(best.key).catch(() => {}); onClose() }} scale={0.97} style={s.heroBtn}>
                  <Store size={15} color={c.ink} /><Text style={{ fontSize: 14, fontWeight: '700', color: c.ink }}>לקנות שם (מחירי הרשימה יתעדכנו)</Text>
                </Touchable>
              ) : null}
            </View>

            {branches.length > 1 && split < best.total - 1 ? (
              <View style={[s.split, { backgroundColor: c.primaryLight }]}>
                <Shuffle size={16} color={c.primary} />
                <Text style={{ flex: 1, fontSize: 13, color: c.text, textAlign: 'right', lineHeight: 19 }}>
                  אם קונים כל מוצר איפה שהוא הכי זול: <Text style={{ fontWeight: '800' }}>{formatAmount(split)}</Text> (עוד {formatAmount(best.total - split)} חיסכון, אבל כמה סופרים)
                </Text>
              </View>
            ) : null}

            <Text style={[s.label, { color: c.text2 }]}>כל הסניפים</Text>
            <View style={[s.card, { backgroundColor: c.card, borderColor: c.border }]}>
              {branches.map((b, i) => (
                <View key={b.key} style={[s.row, i ? { borderTopColor: c.sep, borderTopWidth: StyleSheet.hairlineWidth } : null]}>
                  <Text style={{ width: 22, fontSize: 14, fontWeight: '800', color: i === 0 ? c.primary : c.text3, textAlign: 'center' }}>{i + 1}</Text>
                  <View style={{ flex: 1 }}>
                    <Text numberOfLines={1} style={{ fontSize: 14.5, fontWeight: '600', color: c.text, textAlign: 'right' }}>
                      {storeLabel(b.key, labels)}{b.key === d.activeStore ? '  · הסניף שלכם' : ''}
                    </Text>
                    <Text numberOfLines={2} style={{ fontSize: 11.5, color: b.missing.length ? c.text2 : c.text3, textAlign: 'right', marginTop: 2 }}>
                      {b.missing.length
                        ? `חסרים ${b.missing.length}: ${b.missing.slice(0, 3).join(', ')}${b.missing.length > 3 ? '…' : ''} (הוערכו לפי מחיר ממוצע)`
                        : 'יש את כל המוצרים'}
                    </Text>
                  </View>
                  <View style={{ alignItems: 'flex-start' }}>
                    <Text style={{ fontSize: 15, fontWeight: '800', color: i === 0 ? c.primary : c.text }}>{b.missing.length ? '~' : ''}{formatAmount(b.total)}</Text>
                    {i > 0 ? <Text style={{ fontSize: 11, color: c.text3 }}>+{formatAmount(b.total - best.total)}</Text> : null}
                  </View>
                </View>
              ))}
            </View>
          </>
        )}

        <Touchable onPress={onAddStores} scale={0.98} style={[s.more, { backgroundColor: c.bg }]}>
          <Plus size={16} color={c.primary} />
          <Text style={{ fontSize: 14, fontWeight: '700', color: c.primary }}>להוסיף עוד סופרים מהאזור להשוואה</Text>
        </Touchable>
        <Text style={{ fontSize: 11.5, color: c.text3, textAlign: 'center', marginTop: 8, lineHeight: 17 }}>
          ההשוואה לפי מחירי המדף של היום, בלי מבצעים. מוצרים בלי מחיר (שנכתבו ידנית) לא נספרים.
        </Text>
        <View style={{ height: 16 }} />
      </ScrollView>
    </BottomSheet>
  )
}

const s = StyleSheet.create({
  header: { flexDirection: 'row-reverse', alignItems: 'center', gap: 10, marginBottom: 14 },
  title: { fontSize: 18, fontWeight: '800', textAlign: 'right' },
  x: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  hero: { borderRadius: 20, padding: 16 },
  heroBtn: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: '#fff', borderRadius: 12, paddingVertical: 11, marginTop: 12 },
  split: { flexDirection: 'row-reverse', alignItems: 'center', gap: 10, borderRadius: 14, padding: 12, marginTop: 10 },
  label: { fontSize: 12.5, fontWeight: '700', textAlign: 'right', marginTop: 18, marginBottom: 8 },
  card: { borderWidth: 1, borderRadius: 16, overflow: 'hidden' },
  row: { flexDirection: 'row-reverse', alignItems: 'center', gap: 10, paddingVertical: 12, paddingHorizontal: 12 },
  more: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center', gap: 6, borderRadius: 14, paddingVertical: 13, marginTop: 14 },
})
