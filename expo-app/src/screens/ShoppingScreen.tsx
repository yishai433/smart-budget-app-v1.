import { useState, useMemo, useCallback, memo } from 'react'
import { View, Text, ScrollView, TextInput, StyleSheet, Alert, Keyboard } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Check, ScanLine, Plus, ListChecks, Clock, Trash2, ChevronLeft, ShoppingCart, Save } from 'lucide-react-native'
import { useTheme, radius, Theme } from '../theme'
import { useData } from '../context/DataContext'
import { useAuth } from '../context/AuthContext'
import { formatAmount, money } from '../lib/money'
import { SHOP_CATS, shopCat, guessShoppingCategory } from '../lib/shopCategories'
import FadeIn from '../components/FadeIn'
import Header from '../components/Header'
import Touchable from '../components/Touchable'
import Bar from '../components/Bar'
import BarcodeScanner from '../components/BarcodeScanner'
import ItemEditSheet from '../components/shopping/ItemEditSheet'
import LaterSheet from '../components/shopping/LaterSheet'
import BasketsSheet from '../components/shopping/BasketsSheet'
import CheckoutSheet from '../components/shopping/CheckoutSheet'
import type { ShoppingItem } from '../types'

const lineTotal = (i: ShoppingItem) => (i.estimatedPrice || 0) * (i.quantity || 1)
const fail = () => Alert.alert('הפעולה נכשלה', 'בדקו את החיבור לאינטרנט ונסו שוב.')

// One list row. Memoized so ticking one item doesn't re-render the whole list.
const ItemRow = memo(function ItemRow({ item, inCart, first, c, onToggle, onOpen }: {
  item: ShoppingItem; inCart: boolean; first: boolean; c: Theme; onToggle: (i: ShoppingItem) => void; onOpen: (i: ShoppingItem) => void
}) {
  const t = lineTotal(item)
  const q = item.quantity || 1
  return (
    <View style={[s.row, first ? null : { borderTopColor: c.sep, borderTopWidth: StyleSheet.hairlineWidth }]}>
      <Touchable onPress={() => onToggle(item)} scale={0.85} style={s.checkHit}>
        <View style={[s.check, inCart ? { backgroundColor: c.primary, borderColor: c.primary } : { borderColor: c.text3 }]}>
          {inCart ? <Check size={15} color="#fff" strokeWidth={3} /> : null}
        </View>
      </Touchable>
      <Touchable onPress={() => onOpen(item)} scale={0.98} containerStyle={{ flex: 1 }} style={s.rowBody}>
        <View style={{ flex: 1 }}>
          <Text numberOfLines={1} style={{ fontSize: 16, fontWeight: '500', textAlign: 'right', color: inCart ? c.text3 : c.text, textDecorationLine: inCart ? 'line-through' : 'none' }}>
            {item.name}{q > 1 ? <Text style={{ color: c.text2, fontWeight: '700' }}>{`  ×${q}`}</Text> : null}
          </Text>
        </View>
        {t > 0 ? <Text style={{ fontSize: 14.5, fontWeight: '700', color: inCart ? c.text3 : c.text }}>{formatAmount(t)}</Text> : null}
      </Touchable>
    </View>
  )
})

function Step({ n, title, sub, c }: { n: number; title: string; sub: string; c: Theme }) {
  return (
    <View style={s.step}>
      <View style={[s.stepNum, { backgroundColor: c.primaryLight }]}><Text style={{ fontWeight: '800', color: c.primary }}>{n}</Text></View>
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 14.5, fontWeight: '700', color: c.text, textAlign: 'right' }}>{title}</Text>
        <Text style={{ fontSize: 12.5, color: c.text2, textAlign: 'right', marginTop: 2, lineHeight: 18 }}>{sub}</Text>
      </View>
    </View>
  )
}

function MenuRow({ c, Icon, title, sub, onPress, badge, danger, first }: { c: Theme; Icon: typeof Clock; title: string; sub?: string; onPress: () => void; badge?: number; danger?: boolean; first?: boolean }) {
  return (
    <Touchable onPress={onPress} scale={0.98} style={[s.menuRow, first ? null : { borderTopColor: c.sep, borderTopWidth: StyleSheet.hairlineWidth }]}>
      <View style={[s.menuIcon, { backgroundColor: danger ? c.dangerLight : c.primaryLight }]}><Icon size={17} color={danger ? c.danger : c.primary} /></View>
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 14.5, fontWeight: '600', color: danger ? c.danger : c.text, textAlign: 'right' }}>{title}</Text>
        {sub ? <Text style={{ fontSize: 12, color: c.text2, textAlign: 'right', marginTop: 2 }}>{sub}</Text> : null}
      </View>
      {badge ? <View style={[s.count, { backgroundColor: c.primaryLight }]}><Text style={{ fontSize: 11.5, fontWeight: '800', color: c.primary }}>{badge}</Text></View> : null}
      <ChevronLeft size={18} color={c.text3} />
    </Touchable>
  )
}

export default function ShoppingScreen() {
  const c = useTheme()
  const insets = useSafeAreaInsets()
  const { user } = useAuth()
  const d = useData()
  const [text, setText] = useState('')
  const [scanning, setScanning] = useState(false)
  const [editing, setEditing] = useState<ShoppingItem | null>(null)
  const [laterOpen, setLaterOpen] = useState(false)
  const [basketsOpen, setBasketsOpen] = useState(false)
  const [checkoutOpen, setCheckoutOpen] = useState(false)
  const names = [user?.displayName || user?.email?.split('@')[0] || 'אני', d.partnerName || ''].filter(Boolean)

  const items = d.shoppingItems
  const toBuy = items.filter(i => !i.checked)
  const inCart = items.filter(i => i.checked)
  const toBuyTotal = toBuy.reduce((a, i) => a + lineTotal(i), 0)
  const cartTotal = inCart.reduce((a, i) => a + lineTotal(i), 0)

  // To-buy items grouped by supermarket department, in aisle order.
  const groups = useMemo(() => {
    const by: Record<string, ShoppingItem[]> = {}
    toBuy.forEach(i => { const id = shopCat(!i.category || i.category === 'other' ? guessShoppingCategory(i.name) : i.category).id; (by[id] ||= []).push(i) })
    return SHOP_CATS.filter(sc => by[sc.id]).map(sc => ({ cat: sc, items: by[sc.id] }))
  }, [items])

  // "Bought last time" suggestions not on the list now.
  const suggestions = useMemo(() => {
    const have = new Set(items.map(i => i.name.trim()))
    const out: typeof d.lastTrip = []
    ;[...d.lastTrip, ...d.savedBaskets.flatMap(b => b.items)].forEach(p => { if (!have.has(p.name.trim()) && !out.some(o => o.name === p.name)) out.push(p) })
    return out.slice(0, 10)
  }, [items, d.lastTrip, d.savedBaskets])

  const addTyped = () => {
    const n = text.trim(); if (!n) return
    setText('')
    d.addShoppingItem({ name: n, category: guessShoppingCategory(n), quantity: 1, estimatedPrice: 0, checked: false }).catch(fail)
  }
  const onToggle = useCallback((i: ShoppingItem) => { d.updateShoppingItem(i.id, { checked: !i.checked }).catch(fail) }, [d.updateShoppingItem])
  const onOpen = useCallback((i: ShoppingItem) => { Keyboard.dismiss(); setEditing(i) }, [])
  const confirmClear = () => Alert.alert('למחוק את כל הרשימה?', `${items.length} פריטים יימחקו.`, [
    { text: 'ביטול', style: 'cancel' },
    { text: 'מחיקה', style: 'destructive', onPress: () => d.clearShoppingList().catch(fail) },
  ])

  const empty = items.length === 0

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <ScrollView contentContainerStyle={{ padding: 16, paddingTop: insets.top + 12, paddingBottom: inCart.length ? 110 : 40 }}
        keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <FadeIn>
          <Header title="קניות" names={names} />
          <Text style={{ fontSize: 14, color: c.text2, textAlign: 'right', marginTop: -6 }}>
            {empty ? 'רשימת הקניות של הבית' : toBuy.length === 0 ? 'הכל בעגלה 🎉' : `${toBuy.length} ${toBuy.length === 1 ? 'מוצר' : 'מוצרים'} לקנות${toBuyTotal > 0 ? ` · כ-${formatAmount(toBuyTotal)}` : ''}`}
          </Text>
        </FadeIn>

        {/* Add a product */}
        <FadeIn delay={50}>
          <View style={[s.addBox, { backgroundColor: c.card, borderColor: c.border }]}>
            <TextInput style={{ flex: 1, height: 52, color: c.text, fontSize: 16 }} placeholder="הוספת מוצר, למשל: חלב" placeholderTextColor={c.text3}
              value={text} onChangeText={setText} onSubmitEditing={addTyped} returnKeyType="done" blurOnSubmit={false} textAlign="right" />
            <Touchable onPress={() => setScanning(true)} scale={0.88} style={s.scanBtn}><ScanLine size={21} color={c.text2} /></Touchable>
            <Touchable onPress={addTyped} scale={0.88} style={[s.plus, { backgroundColor: c.primary, opacity: text.trim() ? 1 : 0.35 }]}><Plus size={20} color="#fff" strokeWidth={2.5} /></Touchable>
          </View>
        </FadeIn>

        {/* Bought last time */}
        {suggestions.length > 0 && (
          <FadeIn delay={90}>
            <Text style={[s.label, { color: c.text2 }]}>קניתם בפעם הקודמת · לחצו להוספה</Text>
            <View style={s.suggWrap}>
              {suggestions.map(p => (
                <Touchable key={p.name} scale={0.93} onPress={() => d.loadBasket([p]).catch(fail)}>
                  <View style={[s.sugg, { backgroundColor: c.card, borderColor: c.border }]}>
                    <Plus size={13} color={c.primary} strokeWidth={2.6} />
                    <Text style={{ fontSize: 13, fontWeight: '600', color: c.text }}>{p.name}</Text>
                  </View>
                </Touchable>
              ))}
            </View>
          </FadeIn>
        )}

        {/* First use: explain how it works */}
        {empty && (
          <FadeIn delay={130}>
            <View style={[s.card, { backgroundColor: c.card, borderColor: c.border, padding: 18, marginTop: 18 }]}>
              <View style={{ alignItems: 'center', marginBottom: 14 }}>
                <View style={[s.emptyIcon, { backgroundColor: c.primaryLight }]}><ShoppingCart size={28} color={c.primary} /></View>
                <Text style={{ fontSize: 17, fontWeight: '800', color: c.text, marginTop: 10 }}>איך זה עובד?</Text>
              </View>
              <Step c={c} n={1} title="מוסיפים מוצרים" sub="כותבים בשורה למעלה או סורקים ברקוד. המוצרים מסתדרים לבד לפי מחלקות בסופר." />
              <Step c={c} n={2} title="בסופר מסמנים ✓" sub="כל מוצר שנכנס לעגלה מסמנים בעיגול שלידו." />
              <Step c={c} n={3} title="לוחצים &quot;סיימתי קנייה&quot;" sub="הסכום נרשם אוטומטית בהוצאות, והרשימה נשמרת לפעם הבאה." />
              <Touchable onPress={() => setBasketsOpen(true)} scale={0.97} style={[s.primaryBtn, { backgroundColor: c.primary }]}>
                <ListChecks size={18} color="#fff" /><Text style={{ color: '#fff', fontWeight: '700', fontSize: 15 }}>להתחיל מרשימה מוכנה</Text>
              </Touchable>
            </View>
          </FadeIn>
        )}

        {/* To buy, by department */}
        {!empty && toBuy.length > 0 && (
          <Text style={[s.label, { color: c.text2, marginTop: 20 }]}>לקנות · סמנו ✓ כשהמוצר בעגלה, לחצו על מוצר לעריכה</Text>
        )}
        {groups.map(({ cat, items: gi }) => (
          <View key={cat.id} style={{ marginTop: 10 }}>
            <View style={s.groupHead}>
              <Text style={{ fontSize: 15 }}>{cat.emoji}</Text>
              <Text style={{ fontSize: 13.5, fontWeight: '800', color: c.text }}>{cat.label}</Text>
            </View>
            <View style={[s.card, { backgroundColor: c.card, borderColor: c.border }]}>
              {gi.map((it, i) => <ItemRow key={it.id} item={it} inCart={false} first={i === 0} c={c} onToggle={onToggle} onOpen={onOpen} />)}
            </View>
          </View>
        ))}

        {/* In the cart */}
        {inCart.length > 0 && (
          <View style={{ marginTop: 22 }}>
            <View style={s.groupHead}>
              <ShoppingCart size={15} color={c.primary} />
              <Text style={{ fontSize: 13.5, fontWeight: '800', color: c.text2 }}>כבר בעגלה ({inCart.length})</Text>
            </View>
            <View style={[s.card, { backgroundColor: c.card, borderColor: c.border }]}>
              {inCart.map((it, i) => <ItemRow key={it.id} item={it} inCart first={i === 0} c={c} onToggle={onToggle} onOpen={onOpen} />)}
            </View>
          </View>
        )}

        {/* More options, spelled out */}
        <Text style={[s.label, { color: c.text2, marginTop: 26 }]}>עוד אפשרויות</Text>
        <View style={[s.card, { backgroundColor: c.card, borderColor: c.border }]}>
          <MenuRow first c={c} Icon={ListChecks} title="רשימות שמורות" sub="קנייה שבועית, שבת... טוענים בלחיצה" onPress={() => setBasketsOpen(true)} badge={d.savedBaskets.length || undefined} />
          {!empty && <MenuRow c={c} Icon={Save} title="לשמור את הרשימה הזאת" sub="כדי לטעון אותה שוב בקנייה הבאה" onPress={() => setBasketsOpen(true)} />}
          <MenuRow c={c} Icon={Clock} title="לקנות בהמשך" sub="דברים לא דחופים, כדי שלא תשכחו" onPress={() => setLaterOpen(true)} badge={d.laterItems.length || undefined} />
          {!empty && <MenuRow c={c} Icon={Trash2} title="מחיקת כל הרשימה" onPress={confirmClear} danger />}
        </View>
      </ScrollView>

      {inCart.length > 0 && (
        <View pointerEvents="box-none" style={s.footer}>
          <Touchable onPress={() => { Keyboard.dismiss(); setCheckoutOpen(true) }} scale={0.97} style={[s.checkout, { backgroundColor: c.primary }]}>
            <View>
              <Text style={{ color: '#fff', fontWeight: '800', fontSize: 16, textAlign: 'right' }}>סיימתי קנייה</Text>
              <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 12, textAlign: 'right' }}>{inCart.length} מתוך {items.length} בעגלה</Text>
            </View>
            <View style={s.checkoutPill}><Text style={{ color: '#fff', fontWeight: '800', fontSize: 15 }}>{money(cartTotal)}</Text></View>
          </Touchable>
          <View style={{ marginTop: 6, marginHorizontal: 18 }}><Bar pct={items.length ? (inCart.length / items.length) * 100 : 0} color={c.primary} track={c.sep} height={4} /></View>
        </View>
      )}

      <BarcodeScanner visible={scanning} onClose={() => setScanning(false)} />
      <ItemEditSheet item={editing} onClose={() => setEditing(null)} />
      <LaterSheet visible={laterOpen} onClose={() => setLaterOpen(false)} />
      <BasketsSheet visible={basketsOpen} onClose={() => setBasketsOpen(false)} onLoaded={() => {}} />
      <CheckoutSheet visible={checkoutOpen} total={cartTotal} count={inCart.length} onClose={() => setCheckoutOpen(false)} onDone={() => {}} />
    </View>
  )
}

const s = StyleSheet.create({
  addBox: { flexDirection: 'row-reverse', alignItems: 'center', borderWidth: 1, borderRadius: 16, paddingRight: 14, paddingLeft: 6, gap: 4, marginTop: 16 },
  scanBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  plus: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  label: { fontSize: 12.5, fontWeight: '700', textAlign: 'right', marginTop: 16, marginBottom: 8, paddingHorizontal: 4 },
  suggWrap: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 8 },
  sugg: { flexDirection: 'row-reverse', alignItems: 'center', gap: 4, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999, borderWidth: 1 },
  emptyIcon: { width: 58, height: 58, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  step: { flexDirection: 'row-reverse', alignItems: 'flex-start', gap: 12, marginBottom: 14 },
  stepNum: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  primaryBtn: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 14, paddingVertical: 13, marginTop: 4 },
  groupHead: { flexDirection: 'row-reverse', alignItems: 'center', gap: 7, marginBottom: 7, paddingHorizontal: 4 },
  count: { minWidth: 22, height: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6 },
  card: { borderWidth: 1, borderRadius: radius.lg, overflow: 'hidden' },
  row: { flexDirection: 'row-reverse', alignItems: 'center' },
  checkHit: { paddingVertical: 13, paddingRight: 14, paddingLeft: 8 },
  check: { width: 26, height: 26, borderRadius: 13, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  rowBody: { flexDirection: 'row-reverse', alignItems: 'center', gap: 10, paddingVertical: 13, paddingLeft: 14 },
  menuRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: 12, padding: 14 },
  menuIcon: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  footer: { position: 'absolute', left: 16, right: 16, bottom: 10 },
  checkout: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', borderRadius: 20, paddingVertical: 10, paddingRight: 18, paddingLeft: 10, shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 12, shadowOffset: { width: 0, height: 5 }, elevation: 6 },
  checkoutPill: { backgroundColor: 'rgba(255,255,255,0.22)', borderRadius: 14, paddingHorizontal: 14, paddingVertical: 9 },
})
