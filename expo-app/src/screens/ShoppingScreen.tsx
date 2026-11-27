import { useState, useMemo, useCallback, memo } from 'react'
import { View, Text, ScrollView, TextInput, StyleSheet, LayoutAnimation, Platform, Alert, Keyboard } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Check, ScanLine, Plus, ShoppingBasket, Clock, Trash2, ChevronDown, ShoppingCart } from 'lucide-react-native'
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
const animate = () => { if (Platform.OS === 'ios') LayoutAnimation.configureNext(LayoutAnimation.create(220, 'easeInEaseOut', 'opacity')) }
const fail = () => Alert.alert('הפעולה נכשלה', 'בדקו את החיבור לאינטרנט ונסו שוב.')

// One list row. Memoized so ticking one item doesn't re-render the whole list.
const ItemRow = memo(function ItemRow({ item, inBasket, first, c, onToggle, onOpen }: {
  item: ShoppingItem; inBasket: boolean; first: boolean; c: Theme; onToggle: (i: ShoppingItem) => void; onOpen: (i: ShoppingItem) => void
}) {
  const t = lineTotal(item)
  const q = item.quantity || 1
  return (
    <View style={[s.row, first ? null : { borderTopColor: c.sep, borderTopWidth: StyleSheet.hairlineWidth }]}>
      <Touchable onPress={() => onToggle(item)} scale={0.85} style={s.checkHit}>
        <View style={[s.check, inBasket ? { backgroundColor: c.primary, borderColor: c.primary } : { borderColor: c.text3 }]}>
          {inBasket ? <Check size={14} color="#fff" strokeWidth={3} /> : null}
        </View>
      </Touchable>
      <Touchable onPress={() => onOpen(item)} scale={0.98} containerStyle={{ flex: 1 }} style={s.rowBody}>
        <View style={{ flex: 1 }}>
          <Text numberOfLines={1} style={{ fontSize: 15.5, fontWeight: '500', textAlign: 'right', color: inBasket ? c.text3 : c.text, textDecorationLine: inBasket ? 'line-through' : 'none' }}>{item.name}</Text>
          {q > 1 || item.estimatedPrice ? (
            <Text style={{ fontSize: 12, color: c.text2, marginTop: 2, textAlign: 'right' }}>
              {q > 1 ? `${q} יח׳` : ''}{q > 1 && item.estimatedPrice ? ' · ' : ''}{item.estimatedPrice ? `${formatAmount(item.estimatedPrice)} ליח׳` : ''}
            </Text>
          ) : null}
        </View>
        <Text style={{ fontSize: 14.5, fontWeight: '700', color: inBasket ? c.text3 : t > 0 ? c.text : c.text3 }}>{t > 0 ? formatAmount(t) : 'הוסף מחיר'}</Text>
      </Touchable>
    </View>
  )
})

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
  const [showBasket, setShowBasket] = useState(true)
  const names = [user?.displayName || user?.email?.split('@')[0] || 'אני', d.partnerName || ''].filter(Boolean)

  const items = d.shoppingItems
  const toBuy = items.filter(i => !i.checked)
  const inBasket = items.filter(i => i.checked)
  const toBuyTotal = toBuy.reduce((a, i) => a + lineTotal(i), 0)
  const basketTotal = inBasket.reduce((a, i) => a + lineTotal(i), 0)
  const progress = items.length ? Math.round((inBasket.length / items.length) * 100) : 0

  // To-buy items grouped by supermarket department, in aisle order.
  const groups = useMemo(() => {
    const by: Record<string, ShoppingItem[]> = {}
    toBuy.forEach(i => { const id = shopCat(i.category === 'other' || !i.category ? guessShoppingCategory(i.name) : i.category).id; (by[id] ||= []).push(i) })
    return SHOP_CATS.filter(sc => by[sc.id]).map(sc => ({ cat: sc, items: by[sc.id] }))
  }, [items])

  // One-tap suggestions: things from past trips / baskets that aren't on the list now.
  const suggestions = useMemo(() => {
    const have = new Set(items.map(i => i.name.trim()))
    const pool = [...d.lastTrip, ...d.savedBaskets.flatMap(b => b.items)]
    const out: typeof pool = []
    pool.forEach(p => { if (!have.has(p.name.trim()) && !out.some(o => o.name === p.name)) out.push(p) })
    return out.slice(0, 12)
  }, [items, d.lastTrip, d.savedBaskets])

  const addTyped = () => {
    const n = text.trim(); if (!n) return
    setText(''); animate()
    d.addShoppingItem({ name: n, category: guessShoppingCategory(n), quantity: 1, estimatedPrice: 0, checked: false }).catch(fail)
  }
  const onToggle = useCallback((i: ShoppingItem) => { animate(); d.updateShoppingItem(i.id, { checked: !i.checked }).catch(fail) }, [d.updateShoppingItem])
  const onOpen = useCallback((i: ShoppingItem) => { Keyboard.dismiss(); setEditing(i) }, [])
  const confirmClear = () => Alert.alert('ניקוי הרשימה', `למחוק את כל ${items.length} הפריטים?`, [
    { text: 'ביטול', style: 'cancel' },
    { text: 'קודם לשמור כסל', onPress: () => setBasketsOpen(true) },
    { text: 'מחק הכל', style: 'destructive', onPress: () => { animate(); d.clearShoppingList().catch(fail) } },
  ])

  const subtitle = items.length === 0 ? 'הרשימה ריקה'
    : toBuy.length === 0 ? 'הכל בסל! אפשר לסיים קנייה'
    : `נשארו ${toBuy.length} ${toBuy.length === 1 ? 'פריט' : 'פריטים'}${toBuyTotal > 0 ? ` · כ-${formatAmount(toBuyTotal)}` : ''}`

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <ScrollView contentContainerStyle={{ padding: 16, paddingTop: insets.top + 12, paddingBottom: inBasket.length ? 120 : 60 }}
        keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <FadeIn><Header title="קניות" names={names} /></FadeIn>

        {/* Summary */}
        <FadeIn delay={40}>
          <View style={[s.hero, { backgroundColor: c.ink }]}>
            <Text style={{ fontSize: 12, fontWeight: '700', color: c.inkText2, textAlign: 'right' }}>רשימת הקניות</Text>
            <Text style={{ fontSize: 22, fontWeight: '800', color: c.inkText, textAlign: 'right', marginTop: 4 }}>{subtitle}</Text>
            {items.length > 0 && (
              <>
                <View style={{ marginTop: 14 }}><Bar pct={progress} color={c.inkText} track={c.inkLine} height={7} /></View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 }}>
                  <Text style={{ fontSize: 12.5, color: c.inkText2 }}>{basketTotal > 0 ? `בסל: ${formatAmount(basketTotal)}` : ''}</Text>
                  <Text style={{ fontSize: 12.5, color: c.inkText2 }}>{inBasket.length} מתוך {items.length} בסל</Text>
                </View>
              </>
            )}
          </View>
        </FadeIn>

        {/* Quick actions */}
        <FadeIn delay={80}>
          <View style={s.actions}>
            <Action c={c} Icon={ShoppingBasket} label="סלים שמורים" onPress={() => setBasketsOpen(true)} />
            <Action c={c} Icon={Clock} label="לקנות בהמשך" badge={d.laterItems.length} onPress={() => setLaterOpen(true)} />
            <Action c={c} Icon={Trash2} label="ניקוי" disabled={!items.length} onPress={confirmClear} />
          </View>
        </FadeIn>

        {/* Add */}
        <FadeIn delay={120}>
          <View style={s.addRow}>
            <View style={[s.addBox, { backgroundColor: c.card, borderColor: c.border }]}>
              <TextInput style={{ flex: 1, height: 50, color: c.text, fontSize: 15.5 }} placeholder="מה צריך לקנות?" placeholderTextColor={c.text3}
                value={text} onChangeText={setText} onSubmitEditing={addTyped} returnKeyType="done" blurOnSubmit={false} textAlign="right" />
              <Touchable onPress={addTyped} scale={0.88} style={[s.plus, { backgroundColor: c.primary, opacity: text.trim() ? 1 : 0.35 }]}><Plus size={19} color="#fff" strokeWidth={2.5} /></Touchable>
            </View>
            <Touchable onPress={() => setScanning(true)} scale={0.92} style={[s.scan, { backgroundColor: c.card, borderColor: c.border }]}>
              <ScanLine size={22} color={c.primary} />
            </Touchable>
          </View>
          {suggestions.length > 0 && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} keyboardShouldPersistTaps="handled"
              style={{ flexGrow: 0, marginTop: 10, transform: [{ scaleX: -1 }] }} contentContainerStyle={{ gap: 8 }}>
              {suggestions.map(p => (
                <Touchable key={p.name} scale={0.93} style={{ transform: [{ scaleX: -1 }] }}
                  onPress={() => { animate(); d.loadBasket([p]).catch(fail) }}>
                  <View style={[s.sugg, { backgroundColor: c.card, borderColor: c.border }]}>
                    <Plus size={13} color={c.primary} strokeWidth={2.6} />
                    <Text style={{ fontSize: 13, fontWeight: '600', color: c.text }}>{p.name}</Text>
                  </View>
                </Touchable>
              ))}
            </ScrollView>
          )}
        </FadeIn>

        {/* Empty state */}
        {items.length === 0 && (
          <FadeIn delay={160}>
            <View style={[s.empty, { backgroundColor: c.card, borderColor: c.border }]}>
              <View style={[s.emptyIcon, { backgroundColor: c.primaryLight }]}><ShoppingCart size={30} color={c.primary} /></View>
              <Text style={{ fontSize: 17, fontWeight: '800', color: c.text, marginTop: 14 }}>מתחילים רשימה חדשה</Text>
              <Text style={{ fontSize: 13.5, color: c.text2, textAlign: 'center', marginTop: 6, lineHeight: 20 }}>
                כתבו מוצר למעלה, סרקו ברקוד, או טענו סל מוכן. הפריטים יסודרו לבד לפי מחלקות בסופר.
              </Text>
              <Touchable onPress={() => setBasketsOpen(true)} scale={0.97} style={[s.emptyBtn, { backgroundColor: c.primary }]}>
                <ShoppingBasket size={17} color="#fff" /><Text style={{ color: '#fff', fontWeight: '700', fontSize: 15 }}>בחירת סל מוכן</Text>
              </Touchable>
            </View>
          </FadeIn>
        )}

        {/* To buy, by department */}
        {groups.map(({ cat, items: gi }) => (
          <View key={cat.id} style={{ marginTop: 18 }}>
            <View style={s.groupHead}>
              <Text style={{ fontSize: 16 }}>{cat.emoji}</Text>
              <Text style={{ fontSize: 14, fontWeight: '800', color: c.text }}>{cat.label}</Text>
              <View style={[s.count, { backgroundColor: cat.color + '22' }]}><Text style={{ fontSize: 11.5, fontWeight: '800', color: cat.color }}>{gi.length}</Text></View>
            </View>
            <View style={[s.card, { backgroundColor: c.card, borderColor: c.border }]}>
              {gi.map((it, i) => <ItemRow key={it.id} item={it} inBasket={false} first={i === 0} c={c} onToggle={onToggle} onOpen={onOpen} />)}
            </View>
          </View>
        ))}

        {/* Already in the cart */}
        {inBasket.length > 0 && (
          <View style={{ marginTop: 22 }}>
            <Touchable onPress={() => { animate(); setShowBasket(v => !v) }} scale={0.98} style={s.groupHead}>
              <Text style={{ fontSize: 16 }}>🛒</Text>
              <Text style={{ fontSize: 14, fontWeight: '800', color: c.text2 }}>כבר בסל</Text>
              <View style={[s.count, { backgroundColor: c.primaryLight }]}><Text style={{ fontSize: 11.5, fontWeight: '800', color: c.primary }}>{inBasket.length}</Text></View>
              <View style={{ flex: 1 }} />
              <ChevronDown size={18} color={c.text3} style={{ transform: [{ rotate: showBasket ? '0deg' : '90deg' }] }} />
            </Touchable>
            {showBasket && (
              <View style={[s.card, { backgroundColor: c.card, borderColor: c.border, borderStyle: 'dashed' }]}>
                {inBasket.map((it, i) => <ItemRow key={it.id} item={it} inBasket first={i === 0} c={c} onToggle={onToggle} onOpen={onOpen} />)}
              </View>
            )}
          </View>
        )}
      </ScrollView>

      {inBasket.length > 0 && (
        <View pointerEvents="box-none" style={[s.footer, { bottom: 12 }]}>
          <Touchable onPress={() => { Keyboard.dismiss(); setCheckoutOpen(true) }} scale={0.97} style={[s.checkout, { backgroundColor: c.primary }]}>
            <Text style={{ color: '#fff', fontWeight: '800', fontSize: 16 }}>סיימתי קנייה</Text>
            <View style={s.checkoutPill}><Text style={{ color: '#fff', fontWeight: '800', fontSize: 14 }}>{money(basketTotal)}</Text></View>
          </Touchable>
        </View>
      )}

      <BarcodeScanner visible={scanning} onClose={() => setScanning(false)} />
      <ItemEditSheet item={editing} onClose={() => setEditing(null)} />
      <LaterSheet visible={laterOpen} onClose={() => setLaterOpen(false)} />
      <BasketsSheet visible={basketsOpen} onClose={() => setBasketsOpen(false)} onLoaded={() => animate()} />
      <CheckoutSheet visible={checkoutOpen} total={basketTotal} count={inBasket.length} onClose={() => setCheckoutOpen(false)} onDone={animate} />
    </View>
  )
}

function Action({ c, Icon, label, onPress, badge, disabled }: { c: Theme; Icon: typeof Clock; label: string; onPress: () => void; badge?: number; disabled?: boolean }) {
  return (
    <Touchable onPress={onPress} disabled={disabled} scale={0.95} containerStyle={{ flex: 1 }} style={[s.action, { backgroundColor: c.card, borderColor: c.border }]}>
      <View>
        <Icon size={20} color={c.primary} />
        {badge ? <View style={[s.badge, { backgroundColor: c.danger }]}><Text style={{ color: '#fff', fontSize: 10, fontWeight: '800' }}>{badge}</Text></View> : null}
      </View>
      <Text style={{ fontSize: 12, fontWeight: '700', color: c.text, marginTop: 6 }}>{label}</Text>
    </Touchable>
  )
}

const s = StyleSheet.create({
  hero: { borderRadius: radius.xl, padding: 18 },
  actions: { flexDirection: 'row-reverse', gap: 10, marginTop: 12 },
  action: { borderWidth: 1, borderRadius: radius.lg, paddingVertical: 12, alignItems: 'center' },
  badge: { position: 'absolute', top: -6, right: -10, minWidth: 17, height: 17, borderRadius: 9, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
  addRow: { flexDirection: 'row-reverse', gap: 8, marginTop: 14 },
  addBox: { flex: 1, flexDirection: 'row-reverse', alignItems: 'center', borderWidth: 1, borderRadius: 16, paddingRight: 14, paddingLeft: 6, gap: 6 },
  plus: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  scan: { width: 52, height: 52, borderRadius: 16, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  sugg: { flexDirection: 'row-reverse', alignItems: 'center', gap: 4, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999, borderWidth: 1 },
  empty: { borderWidth: 1, borderRadius: radius.lg, alignItems: 'center', padding: 24, marginTop: 18 },
  emptyIcon: { width: 64, height: 64, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  emptyBtn: { flexDirection: 'row-reverse', alignItems: 'center', gap: 8, borderRadius: 14, paddingHorizontal: 20, paddingVertical: 12, marginTop: 18 },
  groupHead: { flexDirection: 'row-reverse', alignItems: 'center', gap: 7, marginBottom: 8, paddingHorizontal: 4 },
  count: { minWidth: 22, height: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6 },
  card: { borderWidth: 1, borderRadius: radius.lg, overflow: 'hidden' },
  row: { flexDirection: 'row-reverse', alignItems: 'center' },
  checkHit: { paddingVertical: 13, paddingRight: 14, paddingLeft: 8 },
  check: { width: 26, height: 26, borderRadius: 13, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  rowBody: { flexDirection: 'row-reverse', alignItems: 'center', gap: 10, paddingVertical: 12, paddingLeft: 14 },
  footer: { position: 'absolute', left: 16, right: 16 },
  checkout: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', borderRadius: 999, paddingVertical: 10, paddingRight: 22, paddingLeft: 10, shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 12, shadowOffset: { width: 0, height: 5 }, elevation: 6 },
  checkoutPill: { backgroundColor: 'rgba(255,255,255,0.22)', borderRadius: 999, paddingHorizontal: 14, paddingVertical: 8 },
})
