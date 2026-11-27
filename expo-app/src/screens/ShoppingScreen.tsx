import { useState, useMemo, useCallback, memo, useEffect, useRef } from 'react'
import { View, Text, ScrollView, TextInput, StyleSheet, Alert, Keyboard, ActivityIndicator, useWindowDimensions } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Check, ScanLine, Plus, ListChecks, Clock, Trash2, ChevronLeft, ShoppingCart, Save, Store, HelpCircle, X, ClipboardPaste, Trophy } from 'lucide-react-native'
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
import StorePicker from '../components/shopping/StorePicker'
import PasteListSheet from '../components/shopping/PasteListSheet'
import BasketCompareSheet from '../components/shopping/BasketCompareSheet'
import { compareBasket } from '../lib/listImport'
import { usePriceIndex, searchProducts, autoMatch, priceAt, refreshPriceIndex, ProductHit } from '../lib/priceIndex'
import { storeLabel } from '../lib/stores'
import useKeyboardHeight from '../lib/useKeyboardHeight'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { syncReminders } from '../lib/reminders'

const GUIDE_KEY = 'sb-shop-guide-hidden'
import type { ShoppingItem } from '../types'

const fail = () => Alert.alert('הפעולה נכשלה', 'בדקו את החיבור לאינטרנט ונסו שוב.')

// One list row. Memoized so ticking one item doesn't re-render the whole list.
const ItemRow = memo(function ItemRow({ item, unit, inCart, first, c, onToggle, onOpen }: {
  item: ShoppingItem; unit: number; inCart: boolean; first: boolean; c: Theme; onToggle: (i: ShoppingItem) => void; onOpen: (i: ShoppingItem) => void
}) {
  const q = item.quantity || 1
  const t = unit * q
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
          {item.matchedName && item.matchedName !== item.name && !item.priceManual ? (
            <Text numberOfLines={1} style={{ fontSize: 11.5, color: c.text3, textAlign: 'right', marginTop: 2 }}>{item.matchedName}</Text>
          ) : null}
        </View>
        {t > 0
          ? <Text style={{ fontSize: 14.5, fontWeight: '700', color: inCart ? c.text3 : c.text }}>{formatAmount(t)}</Text>
          : <Text style={{ fontSize: 12, color: c.text3 }}>אין מחיר</Text>}
      </Touchable>
    </View>
  )
})

// Under each product: where it's cheapest among the household's branches.
function Cheapest({ h, store, labels, c }: { h: ProductHit; store: string; labels?: Record<string, string>; c: Theme }) {
  if (!h.cheapKey || !isFinite(h.min)) return null
  const here = h.cheapKey === store || (h.price != null && h.price <= h.min)
  if (here) {
    if (h.branches < 2) return null
    return <Text style={[s.cheap, { color: c.primary }]}>✓ הכי זול כאן (מתוך {h.branches} סניפים)</Text>
  }
  const save = h.price != null ? h.price - h.min : 0
  return (
    <View style={[s.cheapBox, { backgroundColor: c.primaryLight }]}>
      <Text numberOfLines={1} style={[s.cheap, { color: c.primary, marginTop: 0 }]}>
        {`הכי זול: ${formatAmount(h.min)} ב${storeLabel(h.cheapKey, labels)}`}
      </Text>
      {save > 0.005 ? <Text style={[s.cheap, { color: c.text2, marginTop: 0 }]}>{`חוסכים ${formatAmount(save)}`}</Text> : null}
    </View>
  )
}

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
  // The product search box is uncontrolled: typing doesn't re-render the page on every letter.
  // `hasText` only flips when the box goes empty/non-empty, and the search runs once typing
  // pauses for a moment (`q`).
  const inputRef = useRef<TextInput>(null)
  const textRef = useRef('')
  const [hasText, setHasText] = useState(false)
  const [q, setQ] = useState('')
  const qTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const onType = useCallback((v: string) => {
    textRef.current = v
    setHasText(!!v)
    if (qTimer.current) clearTimeout(qTimer.current)
    qTimer.current = setTimeout(() => setQ(v), v.trim().length < 2 ? 0 : 140)
  }, [])
  const clearSearch = useCallback(() => {
    inputRef.current?.clear(); textRef.current = ''
    if (qTimer.current) clearTimeout(qTimer.current)
    setHasText(false); setQ('')
  }, [])
  useEffect(() => () => { if (qTimer.current) clearTimeout(qTimer.current) }, [])
  const [scanning, setScanning] = useState(false)
  const [editing, setEditing] = useState<ShoppingItem | null>(null)
  const [laterOpen, setLaterOpen] = useState(false)
  const [basketsOpen, setBasketsOpen] = useState(false)
  const [checkoutOpen, setCheckoutOpen] = useState(false)
  const names = [user?.displayName || user?.email?.split('@')[0] || 'אני', d.partnerName || ''].filter(Boolean)

  const [storeOpen, setStoreOpen] = useState(false)
  const [pasteOpen, setPasteOpen] = useState(false)
  const [compareOpen, setCompareOpen] = useState(false)
  // "How it works" stays until the user dismisses it; the ? button brings it back.
  const [guide, setGuide] = useState(false)
  useEffect(() => { AsyncStorage.getItem(GUIDE_KEY).then(v => setGuide(v !== '1')).catch(() => setGuide(true)) }, [])
  const hideGuide = () => { setGuide(false); AsyncStorage.setItem(GUIDE_KEY, '1').catch(() => {}) }
  // Keep this phone's reminders in step with the shared "buy later" list.
  useEffect(() => { syncReminders(d.laterItems) }, [d.laterItems])
  // While the keyboard is up it hides the bottom of the page: make room for it so everything can still be scrolled to.
  const kb = useKeyboardHeight()
  const { idx, status } = usePriceIndex(d.activeHouseholdId)
  const store = d.activeStore
  // A newly picked branch is downloaded by the server in about a minute: check again then.
  const storesKey = d.priceStores.join(',')
  useEffect(() => {
    if (!storesKey) return
    // a quick version check after the page has drawn (cheap when nothing changed)
    const a = setTimeout(() => refreshPriceIndex(d.activeHouseholdId), 600)
    const t = setTimeout(() => refreshPriceIndex(d.activeHouseholdId), 75000)
    return () => { clearTimeout(a); clearTimeout(t) }
  }, [storesKey])
  const storeName = storeLabel(store, idx?.labels)

  // The price per unit we show: the user's own price if they typed one, otherwise today's
  // price at the chosen branch, otherwise whatever was saved with the item.
  const unitPrice = useCallback((i: ShoppingItem) => {
    if (i.priceManual) return i.estimatedPrice || 0
    if (i.code && idx) return priceAt(idx, i.code, store) ?? 0
    return i.estimatedPrice || 0
  }, [idx, store])
  const lineTotal = (i: ShoppingItem) => unitPrice(i) * (i.quantity || 1)

  // Live product search at the chosen branch while typing.
  // Products this household has bought before rank first in the search.
  const prefer = useMemo(() => {
    const set = new Set<string>()
    d.shoppingItems.forEach(i => i.code && set.add(i.code))
    d.lastTrip.forEach(i => i.code && set.add(i.code))
    d.savedBaskets.forEach(b => b.items.forEach(i => i.code && set.add(i.code)))
    d.transactions.forEach(t => t.items?.forEach(i => i.code && set.add(i.code)))
    return set
  }, [d.shoppingItems, d.lastTrip, d.savedBaskets, d.transactions])
  const hits = useMemo(() => (q.trim().length >= 2 && idx ? searchProducts(idx, q, store, { limit: 40, prefer }) : []), [q, idx, store, prefer])
  // The results get their own scrolling box that fits between the search line and the
  // keyboard (or the bottom of the screen), so the page itself never has to move.
  const { height: winH } = useWindowDimensions()
  const hitsWrap = useRef<View>(null)
  const hitsScroll = useRef<ScrollView>(null)
  const [hitsTop, setHitsTop] = useState(0)
  const measureHits = () => hitsWrap.current?.measureInWindow((_x, y) => { if (y > 0) setHitsTop(y) })
  const hasHits = hits.length > 0
  useEffect(() => { if (hasHits) { measureHits(); const t = setTimeout(() => hitsScroll.current?.flashScrollIndicators(), 350); return () => clearTimeout(t) } }, [hasHits, kb])
  useEffect(() => { hitsScroll.current?.scrollTo({ y: 0, animated: false }) }, [q])
  // Search mode: while typing a product, the big summary card steps aside so the search line
  // sits at the top, and while results show, the rest of the page waits below them (no empty
  // space to scroll into). Clearing the search brings everything back.
  const pageRef = useRef<ScrollView>(null)
  const [focused, setFocused] = useState(false)
  const searching = focused || hasText
  const showingHits = q.trim().length >= 2
  useEffect(() => { pageRef.current?.scrollTo({ y: 0, animated: false }); const t = setTimeout(measureHits, 60); return () => clearTimeout(t) }, [searching])
  const hitsMax = Math.max(180, winH - hitsTop - 34 - (kb ? kb + 14 : insets.bottom + 90))

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

  const addHit = (h: ProductHit) => {
    clearSearch()
    d.addShoppingItem({ name: h.name, code: h.code, category: guessShoppingCategory(h.name), quantity: 1, estimatedPrice: h.price ?? 0, priceManual: false, checked: false }).catch(fail)
  }
  // Typed a plain word: keep the word, and attach the closest product's price at this branch.
  const addTyped = () => {
    const n = textRef.current.trim(); if (!n) return
    clearSearch()
    const m = idx && store ? autoMatch(idx, n, store, prefer) : null
    d.addShoppingItem({
      name: n, category: guessShoppingCategory(n), quantity: 1, estimatedPrice: m?.price ?? 0, priceManual: false, checked: false,
      ...(m ? { code: m.code, matchedName: m.name } : {}),
    }).catch(fail)
  }
  const onToggle = useCallback((i: ShoppingItem) => { d.updateShoppingItem(i.id, { checked: !i.checked }).catch(fail) }, [d.updateShoppingItem])
  const onOpen = useCallback((i: ShoppingItem) => { Keyboard.dismiss(); setEditing(i) }, [])
  const confirmClear = () => Alert.alert('למחוק את כל הרשימה?', `${items.length} פריטים יימחקו.`, [
    { text: 'ביטול', style: 'cancel' },
    { text: 'מחיקה', style: 'destructive', onPress: () => d.clearShoppingList().catch(fail) },
  ])

  const empty = items.length === 0
  // The whole list priced at every compared branch (only when there's something to compare).
  const basket = useMemo(() => compareBasket(idx, items.map(i => ({ code: i.code, qty: i.quantity || 1, name: i.name }))), [idx, items])
  const bestB = basket.branches[0]
  const mineB = basket.branches.find(b => b.key === store)
  const basketSave = bestB && mineB && bestB.key !== store ? mineB.total - bestB.total : 0
  const onPasted = (n: number) => {
    setPasteOpen(false)
    if (idx && idx.keys.length) setTimeout(() => setCompareOpen(true), 450)
    else Alert.alert(`נוספו ${n} מוצרים`, 'בחרו סופרים באזור כדי לראות איפה הסל הכי זול.')
  }

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <ScrollView ref={pageRef} onScrollEndDrag={measureHits} onMomentumScrollEnd={measureHits}
        contentContainerStyle={{ padding: 16, paddingTop: insets.top + 12, paddingBottom: (inCart.length ? 110 : 40) + kb }}
        keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" showsVerticalScrollIndicator={false}>
        <FadeIn>
          <Header title="קניות" names={names} />
        </FadeIn>

        {/* Hero: where we shop (prices follow this branch) + how much is left */}
        {!searching && <FadeIn delay={30}>
          <View style={[s.hero, { backgroundColor: c.ink }]}>
            <View style={s.heroTop}>
              <Touchable onPress={() => setStoreOpen(true)} scale={0.97} containerStyle={{ flex: 1 }} style={s.heroStore}>
                <View style={[s.storeIcon, { backgroundColor: 'rgba(255,255,255,0.16)' }]}><Store size={17} color={c.inkText} /></View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 11.5, color: c.inkText2, fontWeight: '600', textAlign: 'right' }}>{store ? 'קונים ב' : 'מחירים אוטומטיים'}</Text>
                  <Text numberOfLines={1} style={{ fontSize: 15, fontWeight: '800', color: c.inkText, textAlign: 'right' }}>{store ? storeName : 'בחרו את הסופר שלכם ›'}</Text>
                </View>
                {store ? <View style={s.pill}><Text style={{ fontSize: 12, fontWeight: '700', color: c.inkText }}>החלפה</Text></View> : null}
              </Touchable>
              <Touchable onPress={() => setGuide(true)} scale={0.88} style={s.help}>
                <HelpCircle size={20} color={c.inkText} />
              </Touchable>
            </View>

            <View style={[s.heroLine, { backgroundColor: c.inkLine }]} />
            <Text style={{ fontSize: 26, fontWeight: '800', color: c.inkText, textAlign: 'right' }}>
              {empty ? 'הרשימה ריקה' : toBuy.length === 0 ? 'הכל בעגלה 🎉' : `${toBuy.length} ${toBuy.length === 1 ? 'מוצר' : 'מוצרים'} לקנות`}
            </Text>
            <Text style={{ fontSize: 13, color: c.inkText2, textAlign: 'right', marginTop: 3 }}>
              {empty ? 'הוסיפו מוצרים בשורה למטה'
                : [toBuyTotal > 0 ? `כ-${formatAmount(toBuyTotal)} לקנות` : '', inCart.length ? `${inCart.length} כבר בעגלה` : ''].filter(Boolean).join(' · ') || 'הוסיפו מחירים כדי לראות סכום'}
            </Text>
            {!empty && <View style={{ marginTop: 12 }}><Bar pct={(inCart.length / items.length) * 100} color={c.inkText} track={c.inkLine} height={6} /></View>}
            {store && status !== 'ready' ? (
              <Touchable onPress={() => refreshPriceIndex(d.activeHouseholdId)} scale={0.97} style={{ marginTop: 10 }}>
                <Text style={{ fontSize: 12, color: c.inkText2, textAlign: 'right' }}>{status === 'loading' ? 'טוען מחירים…' : 'המחירים של הסניף נטענים בשרת · לחצו לרענון'}</Text>
              </Touchable>
            ) : null}
          </View>
        </FadeIn>}

        {/* The cheapest basket among the compared branches */}
        {!searching && basket.branches.length > 1 && basket.priced >= 2 && (
          <FadeIn delay={40}>
            <Touchable onPress={() => setCompareOpen(true)} scale={0.98} style={[s.bestCard, { backgroundColor: basketSave > 0.5 ? c.primaryLight : c.card, borderColor: basketSave > 0.5 ? c.primary + '55' : c.border }]}>
              <View style={[s.bestIcon, { backgroundColor: c.primary }]}><Trophy size={16} color="#fff" /></View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 11.5, color: c.text2, fontWeight: '700', textAlign: 'right' }}>הסל הכי זול · {basket.branches.length} סניפים</Text>
                <Text numberOfLines={1} style={{ fontSize: 14.5, fontWeight: '800', color: c.text, textAlign: 'right', marginTop: 1 }}>
                  {bestB.key === store ? 'אתם כבר בסופר הכי זול 👌' : `${storeLabel(bestB.key, idx?.labels)} · ${formatAmount(bestB.total)}`}
                </Text>
                {basketSave > 0.5 ? <Text style={{ fontSize: 12, color: c.primary, fontWeight: '700', textAlign: 'right', marginTop: 1 }}>חוסכים {formatAmount(basketSave)} על הרשימה</Text> : null}
              </View>
              <ChevronLeft size={18} color={c.text3} />
            </Touchable>
          </FadeIn>
        )}

        {/* Add a product */}
        <FadeIn delay={50}>
          <View style={[s.addBox, { backgroundColor: c.card, borderColor: c.border }]}>
            <TextInput style={{ flex: 1, height: 52, color: c.text, fontSize: 16 }} placeholder="הוספת מוצר, למשל: חלב" placeholderTextColor={c.text3}
              ref={inputRef} onChangeText={onType} onSubmitEditing={addTyped} returnKeyType="done" blurOnSubmit={false} textAlign="right"
              onFocus={() => setFocused(true)} onBlur={() => setFocused(false)} />
            {hasText ? (
              <Touchable onPress={clearSearch} scale={0.85} style={s.clearBtn}>
                <View style={[s.clearDot, { backgroundColor: c.text3 }]}><X size={13} color="#fff" strokeWidth={3} /></View>
              </Touchable>
            ) : null}
            <Touchable onPress={() => setScanning(true)} scale={0.88} style={s.scanBtn}><ScanLine size={21} color={c.text2} /></Touchable>
            <Touchable onPress={addTyped} scale={0.88} style={[s.plus, { backgroundColor: c.primary, opacity: hasText ? 1 : 0.35 }]}><Plus size={20} color="#fff" strokeWidth={2.5} /></Touchable>
          </View>
          {hasHits && (
            <View ref={hitsWrap} onLayout={measureHits} style={[s.card, { backgroundColor: c.card, borderColor: c.border, marginTop: 8 }]}>
              <Text style={{ fontSize: 11.5, color: c.text2, fontWeight: '700', textAlign: 'right', paddingHorizontal: 14, paddingTop: 10, paddingBottom: 4 }}>
                {hits.length} מוצרים · המחיר ב{storeName} · גוללים כאן
              </Text>
              <ScrollView ref={hitsScroll} style={{ maxHeight: hitsMax }} nestedScrollEnabled persistentScrollbar indicatorStyle="black"
                keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" showsVerticalScrollIndicator>
              {hits.map((h, i) => (
                <Touchable key={h.code} onPress={() => addHit(h)} scale={0.98} style={[s.hit, i ? { borderTopColor: c.sep, borderTopWidth: StyleSheet.hairlineWidth } : null]}>
                  <Plus size={15} color={c.primary} strokeWidth={2.6} />
                  <View style={{ flex: 1 }}>
                    <Text numberOfLines={2} style={{ fontSize: 14.5, color: c.text, textAlign: 'right' }}>{h.name}</Text>
                    {h.bought || (i === 0 && h.basic) ? (
                      <Text style={{ fontSize: 11, fontWeight: '700', color: h.bought ? c.accent2Dark : c.primary, textAlign: 'right', marginTop: 2 }}>{h.bought ? 'קניתם בעבר' : 'הכי בסיסי'}</Text>
                    ) : null}
                    <Cheapest h={h} store={store} labels={idx?.labels} c={c} />
                  </View>
                  {h.price != null
                    ? <Text style={{ fontSize: 14.5, fontWeight: '800', color: c.text }}>{formatAmount(h.price)}</Text>
                    : <Text style={{ fontSize: 12, color: c.text3 }}>לא בסניף</Text>}
                </Touchable>
              ))}
              </ScrollView>
            </View>
          )}
          {showingHits && store && status === 'loading' ? <ActivityIndicator color={c.primary} style={{ marginTop: 10 }} /> : null}
        </FadeIn>

        {!showingHits && <>

        {/* How it works: shown until dismissed, reopened from the ? button */}
        {guide && (
          <FadeIn delay={130}>
            <View style={[s.card, { backgroundColor: c.card, borderColor: c.border, padding: 18, marginTop: 18 }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                <Touchable onPress={hideGuide} scale={0.9} style={[s.x, { backgroundColor: c.bg }]}><X size={16} color={c.text2} /></Touchable>
                <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 8 }}>
                  <View style={[s.emptyIcon, { backgroundColor: c.primaryLight }]}><ShoppingCart size={20} color={c.primary} /></View>
                  <Text style={{ fontSize: 17, fontWeight: '800', color: c.text }}>איך זה עובד?</Text>
                </View>
              </View>
              <Step c={c} n={1} title="מוסיפים מוצרים" sub="כותבים בשורה למעלה (למשל: חלב) ובוחרים מהרשימה. המחיר בסניף שלכם נכנס לבד." />
              <Step c={c} n={2} title="בסופר מסמנים ✓" sub="כל מוצר שנכנס לעגלה מסמנים בעיגול שלידו." />
              <Step c={c} n={3} title="לוחצים &quot;סיימתי קנייה&quot;" sub="הסכום נרשם אוטומטית בהוצאות, והרשימה נשמרת לפעם הבאה." />
              <Step c={c} n={4} title="רשימות שמורות ותזכורות" sub="שמרו רשימה קבועה וטענו אותה בלחיצה. דברים לא דחופים רשמו ב&quot;לקנות בהמשך&quot; וקבעו תזכורת." />
              <Touchable onPress={hideGuide} scale={0.97} style={[s.primaryBtn, { backgroundColor: c.primary }]}>
                <Text style={{ color: '#fff', fontWeight: '700', fontSize: 15 }}>הבנתי</Text>
              </Touchable>
              <Text style={{ fontSize: 12, color: c.text3, textAlign: 'center', marginTop: 8 }}>אפשר לחזור להסבר בכל רגע בסימן ? למעלה</Text>
            </View>
          </FadeIn>
        )}

        {empty && !guide && (
          <FadeIn delay={80}>
            <View style={[s.card, { backgroundColor: c.card, borderColor: c.border, padding: 22, marginTop: 18, alignItems: 'center' }]}>
              <View style={[s.bigIcon, { backgroundColor: c.primaryLight }]}><ShoppingCart size={28} color={c.primary} /></View>
              <Text style={{ fontSize: 16, fontWeight: '800', color: c.text, marginTop: 12 }}>מה קונים הפעם?</Text>
              <Text style={{ fontSize: 13, color: c.text2, textAlign: 'center', marginTop: 4 }}>כתבו מוצר למעלה, או התחילו מרשימה שמורה</Text>
              <Touchable onPress={() => setBasketsOpen(true)} scale={0.97} style={[s.primaryBtn, { backgroundColor: c.primary, paddingHorizontal: 22, alignSelf: 'stretch' }]}>
                <ListChecks size={18} color="#fff" /><Text style={{ color: '#fff', fontWeight: '700', fontSize: 15 }}>לרשימות השמורות</Text>
              </Touchable>
              <Touchable onPress={() => setPasteOpen(true)} scale={0.97} style={[s.primaryBtn, { backgroundColor: c.primaryLight, paddingHorizontal: 22, alignSelf: 'stretch', marginTop: 8 }]}>
                <ClipboardPaste size={18} color={c.primary} /><Text style={{ color: c.primary, fontWeight: '700', fontSize: 15 }}>הדבקת רשימה או קובץ</Text>
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
              <View style={[s.deptDot, { backgroundColor: cat.color + '22' }]}><Text style={{ fontSize: 14 }}>{cat.emoji}</Text></View>
              <Text style={{ fontSize: 14, fontWeight: '800', color: c.text }}>{cat.label}</Text>
              <Text style={{ fontSize: 12.5, fontWeight: '700', color: cat.color }}>{gi.length}</Text>
            </View>
            <View style={[s.card, { backgroundColor: c.card, borderColor: c.border }]}>
              {gi.map((it, i) => <ItemRow key={it.id} item={it} unit={unitPrice(it)} inCart={false} first={i === 0} c={c} onToggle={onToggle} onOpen={onOpen} />)}
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
              {inCart.map((it, i) => <ItemRow key={it.id} item={it} unit={unitPrice(it)} inCart first={i === 0} c={c} onToggle={onToggle} onOpen={onOpen} />)}
            </View>
          </View>
        )}

        {/* More options, spelled out */}
        <Text style={[s.label, { color: c.text2, marginTop: 26 }]}>עוד אפשרויות</Text>
        <View style={[s.card, { backgroundColor: c.card, borderColor: c.border }]}>
          <MenuRow first c={c} Icon={ClipboardPaste} title="הדבקת רשימה או קובץ" sub="כל הרשימה בבת אחת, עם מחירים והשוואה" onPress={() => setPasteOpen(true)} />
          {!empty && idx && idx.keys.length > 0 ? <MenuRow c={c} Icon={Trophy} title="איפה הסל הכי זול?" sub="כל הרשימה מול כל הסופרים שבחרתם" onPress={() => setCompareOpen(true)} /> : null}
          <MenuRow c={c} Icon={ListChecks} title="רשימות שמורות" sub="קנייה שבועית, שבת... טוענים בלחיצה" onPress={() => setBasketsOpen(true)} badge={d.savedBaskets.length || undefined} />
          {!empty && <MenuRow c={c} Icon={Save} title="לשמור את הרשימה הזאת" sub="כדי לטעון אותה שוב בקנייה הבאה" onPress={() => setBasketsOpen(true)} />}
          <MenuRow c={c} Icon={Clock} title="לקנות בהמשך" sub="דברים לא דחופים, כדי שלא תשכחו" onPress={() => setLaterOpen(true)} badge={d.laterItems.length || undefined} />
          {!empty && <MenuRow c={c} Icon={Trash2} title="מחיקת כל הרשימה" onPress={confirmClear} danger />}
        </View>
        </>}
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
      <ItemEditSheet item={editing} branchPrice={editing?.code && idx ? priceAt(idx, editing.code, store) : null} storeName={storeName} onClose={() => setEditing(null)} />
      <StorePicker visible={storeOpen} labels={idx?.labels} onClose={() => setStoreOpen(false)} />
      <PasteListSheet visible={pasteOpen} idx={idx} store={store} prefer={prefer} onClose={() => setPasteOpen(false)} onAdded={onPasted} />
      <BasketCompareSheet visible={compareOpen} result={basket} labels={idx?.labels} onClose={() => setCompareOpen(false)}
        onAddStores={() => { setCompareOpen(false); setTimeout(() => setStoreOpen(true), 350) }} />
      <LaterSheet visible={laterOpen} onClose={() => setLaterOpen(false)} />
      <BasketsSheet visible={basketsOpen} onClose={() => setBasketsOpen(false)} onLoaded={() => {}} />
      <CheckoutSheet visible={checkoutOpen} total={cartTotal} count={inCart.length} defaultStore={storeName} priceOf={unitPrice} onClose={() => setCheckoutOpen(false)} onDone={() => {}} />
    </View>
  )
}

const s = StyleSheet.create({
  deptDot: { width: 28, height: 28, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  hero: { borderRadius: radius.xl, padding: 16, marginTop: 4 },
  heroTop: { flexDirection: 'row-reverse', alignItems: 'center', gap: 10 },
  heroStore: { flexDirection: 'row-reverse', alignItems: 'center', gap: 10 },
  heroLine: { height: 1, marginVertical: 14 },
  pill: { backgroundColor: 'rgba(255,255,255,0.18)', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6 },
  help: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.12)' },
  x: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  bigIcon: { width: 58, height: 58, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  storeBar: { flexDirection: 'row-reverse', alignItems: 'center', gap: 10, borderWidth: 1, borderRadius: 16, padding: 12, marginTop: 14 },
  storeIcon: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  smallBtn: { borderRadius: 10, paddingHorizontal: 10, paddingVertical: 7, alignItems: 'center' },
  more: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center', gap: 4, paddingVertical: 12, borderTopWidth: StyleSheet.hairlineWidth },
  hit: { flexDirection: 'row-reverse', alignItems: 'center', gap: 10, paddingHorizontal: 14, paddingVertical: 12 },
  addBox: { flexDirection: 'row-reverse', alignItems: 'center', borderWidth: 1, borderRadius: 16, paddingRight: 14, paddingLeft: 6, gap: 4, marginTop: 14 },
  cheap: { fontSize: 11.5, fontWeight: '700', textAlign: 'right', marginTop: 3 },
  cheapBox: { alignSelf: 'flex-end', maxWidth: '100%', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3, marginTop: 4 },
  bestCard: { flexDirection: 'row-reverse', alignItems: 'center', gap: 10, borderWidth: 1, borderRadius: 16, padding: 12, marginTop: 12 },
  bestIcon: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  clearBtn: { width: 32, height: 40, alignItems: 'center', justifyContent: 'center' },
  clearDot: { width: 20, height: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  scanBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  plus: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  label: { fontSize: 12.5, fontWeight: '700', textAlign: 'right', marginTop: 16, marginBottom: 8, paddingHorizontal: 4 },
  suggWrap: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 8 },
  sugg: { flexDirection: 'row-reverse', alignItems: 'center', gap: 4, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999, borderWidth: 1 },
  emptyIcon: { width: 36, height: 36, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
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
