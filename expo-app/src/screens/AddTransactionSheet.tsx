import { useState, useEffect, useCallback, useRef, memo } from 'react'
import { View, Text, TextInput, ScrollView, StyleSheet, Animated, Keyboard, Pressable, Alert } from 'react-native'
import { X, Trash2, CalendarDays } from 'lucide-react-native'
import { useTheme, Theme } from '../theme'
import { CATEGORIES, Category } from '../categories'
import { useData } from '../context/DataContext'
import { displayCurrency } from '../lib/money'
import { todayISO, shiftMonthKey, monthLabel } from '../lib/month'
import useKeyboardHeight from '../lib/useKeyboardHeight'
import Touchable from '../components/Touchable'
import BottomSheet from '../components/BottomSheet'
import NumPad, { applyKey } from '../components/NumPad'
import AmountDisplay from '../components/AmountDisplay'
import type { TxType, Transaction } from '../types'

// A single category chip. Memoized so typing the amount doesn't re-render all chips.
const Chip = memo(function Chip({ cat, selected, onPick, c }: { cat: Category; selected: boolean; onPick: (id: string) => void; c: Theme }) {
  return (
    <Touchable scale={0.94} onPress={() => onPick(cat.id)} containerStyle={s.cell}
      style={[s.chip, { backgroundColor: selected ? cat.color + '22' : c.bg, borderColor: selected ? cat.color : 'transparent' }]}>
      <Text style={{ fontSize: 19 }}>{cat.emoji}</Text>
      <Text style={{ fontSize: 11, fontWeight: '600', color: c.text, marginTop: 2 }} numberOfLines={1}>{cat.label}</Text>
    </Touchable>
  )
})

const monthName = (key: string) => monthLabel(key).split(' ')[0]

export default function AddTransactionSheet({ visible, onClose, editTx }: { visible: boolean; onClose: () => void; editTx?: Transaction | null }) {
  const c = useTheme()
  const { addTransaction, updateTransaction, deleteTransaction, incomeMonthMode, setIncomeMonthMode } = useData()
  const [type, setType] = useState<TxType>('expense')
  const [category, setCategory] = useState('food')
  const [amount, setAmount] = useState('')
  // Description is uncontrolled: typing doesn't re-render the sheet on every letter.
  const [descInit, setDescInit] = useState('')
  const descRef = useRef('')
  const [forMonth, setForMonth] = useState('')
  const [contentH, setContentH] = useState(0)
  const scrollY = useRef(new Animated.Value(0)).current
  // While typing a description the system keyboard takes the keypad's place.
  const typing = useKeyboardHeight(visible) > 0

  // Income that lands early in a month (e.g. salary on the 10th) can belong to the previous month.
  const baseDate = editTx?.date || todayISO()
  const recvKey = baseDate.slice(0, 7)
  const prevKey = shiftMonthKey(recvKey, -1)
  const early = Number(baseDate.slice(8, 10)) <= 15
  const showMonth = type === 'income' && (early || (!!editTx?.forMonth && editTx.forMonth !== recvKey))

  useEffect(() => {
    if (!visible) return
    if (editTx) {
      setType(editTx.type); setCategory(editTx.category); setAmount(String(editTx.amount))
      setDescInit(editTx.description || ''); descRef.current = editTx.description || ''
      setForMonth(editTx.forMonth || recvKey)
    } else {
      setType('expense'); setCategory('food'); setAmount('')
      setDescInit(''); descRef.current = ''
      setForMonth(incomeMonthMode === 'previous' ? prevKey : recvKey)
    }
  }, [visible, editTx])

  const pick = useCallback((id: string) => setCategory(id), [])
  const onKey = useCallback((k: string) => setAmount(prev => applyKey(prev, k)), [])
  const n = parseFloat(amount) || 0
  const canSave = n > 0

  // Saves are optimistic: the sheet closes at once and the list updates from the local
  // write; the server confirms in the background.
  const fail = () => Alert.alert('השמירה נכשלה', 'בדקו את החיבור לאינטרנט ונסו שוב.')
  const save = () => {
    if (!canSave) return
    Keyboard.dismiss()
    const description = descRef.current.trim()
    // Not a split-month income (any more): make sure no stale forMonth is left on the record.
    const month = showMonth ? { forMonth } : editTx?.forMonth ? { forMonth: recvKey } : {}
    if (editTx) updateTransaction(editTx.id, { type, category, amount: n, description, ...month }).catch(fail)
    else addTransaction({ type, category, amount: n, description, date: todayISO(), ...month }).catch(fail)
    // First time: remember the choice so future salaries are placed automatically.
    if (showMonth && !editTx && !incomeMonthMode) setIncomeMonthMode(forMonth === prevKey ? 'previous' : 'received').catch(() => {})
    onClose()
  }
  const remove = () => { if (!editTx) return; deleteTransaction(editTx.id).catch(fail); onClose() }
  const cats = CATEGORIES[type]
  const fillers = (3 - (cats.length % 3)) % 3

  // Two full rows while the keyboard is up (still scrollable), three otherwise.
  const GRID_H = typing ? 116 : 168
  const TRACK_H = GRID_H - 8
  const canScroll = contentH > GRID_H + 2
  const thumbH = canScroll ? Math.max(30, (GRID_H / contentH) * TRACK_H) : 0
  const thumbY = scrollY.interpolate({ inputRange: [0, Math.max(1, contentH - GRID_H)], outputRange: [0, TRACK_H - thumbH], extrapolate: 'clamp' })
  const isPrev = forMonth === prevKey

  return (
    <BottomSheet visible={visible} onClose={onClose} avoidKeyboard>
      <View style={s.header}>
        <Text style={[s.title, { color: c.text }]}>{editTx ? 'עריכת תנועה' : 'הוספת תנועה'}</Text>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {editTx ? <Touchable onPress={remove} scale={0.9} style={[s.x, { backgroundColor: c.dangerLight }]}><Trash2 size={17} color={c.danger} /></Touchable> : null}
          <Touchable onPress={onClose} scale={0.9} style={[s.x, { backgroundColor: c.bg }]}><X size={18} color={c.text2} /></Touchable>
        </View>
      </View>

      <View style={[s.seg, { backgroundColor: c.bg }]}>
        {(['expense', 'income'] as TxType[]).map(t => {
          const on = type === t
          return (
            <Touchable key={t} containerStyle={{ flex: 1 }} scale={0.97} onPress={() => { setType(t); setCategory(CATEGORIES[t][0].id) }}
              style={[s.segBtn, on && { backgroundColor: t === 'income' ? c.accent2Dark : c.primary }]}>
              <Text style={{ fontWeight: '700', fontSize: 15, color: on ? '#fff' : c.text2 }}>{t === 'expense' ? 'הוצאה' : 'הכנסה'}</Text>
            </Touchable>
          )
        })}
      </View>

      <View style={s.amountRow}>
        <Pressable style={s.amountWrap} onPress={Keyboard.dismiss}>
          <AmountDisplay value={amount} currency={displayCurrency()} size={32} curSize={18} c={c} caretHeight={30} />
        </Pressable>
        {showMonth && (
          // Tap to switch which month this income counts for. Highlighted until the
          // household has made its first choice (then it's remembered).
          <Touchable onPress={() => setForMonth(isPrev ? recvKey : prevKey)} scale={0.94} containerStyle={s.monthPos}
            style={[s.monthPill, { backgroundColor: incomeMonthMode ? c.bg : c.primaryLight, borderColor: incomeMonthMode ? 'transparent' : c.primary }]}>
            <CalendarDays size={13} color={c.primary} />
            <View>
              <Text style={{ fontSize: 10, color: c.text2, fontWeight: '600', textAlign: 'right' }}>{isPrev ? 'משכורת על' : 'שייך ל'}</Text>
              <Text style={{ fontSize: 13, color: c.text, fontWeight: '800', textAlign: 'right' }}>{monthName(forMonth)}</Text>
            </View>
          </Touchable>
        )}
      </View>

      <View style={{ position: 'relative' }}>
        <ScrollView style={{ height: GRID_H }} contentContainerStyle={[s.grid, { paddingRight: 10 }]} keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false} scrollEventThrottle={16}
          onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: false })}
          onContentSizeChange={(_w, h) => setContentH(h)}>
          {cats.map(cat => <Chip key={cat.id} cat={cat} selected={cat.id === category} onPick={pick} c={c} />)}
          {Array.from({ length: fillers }).map((_, i) => <View key={`f${i}`} style={s.cell} />)}
        </ScrollView>
        {canScroll && (
          <View pointerEvents="none" style={{ position: 'absolute', right: 1, top: 4, width: 3.5, height: TRACK_H, borderRadius: 999, backgroundColor: c.sep }}>
            <Animated.View style={{ position: 'absolute', right: 0, top: 0, width: 3.5, height: thumbH, borderRadius: 999, backgroundColor: c.primary, transform: [{ translateY: thumbY }] }} />
          </View>
        )}
      </View>

      <TextInput key={(editTx?.id || 'new') + '|' + descInit} style={[s.desc, { backgroundColor: c.bg, color: c.text }]} defaultValue={descInit}
        onChangeText={v => { descRef.current = v }} placeholder="תיאור (לא חובה)" placeholderTextColor={c.text3}
        textAlign="right" returnKeyType="done" blurOnSubmit onSubmitEditing={Keyboard.dismiss} autoCorrect={false} />

      {/* Kept mounted (just collapsed) while typing, so it never has to rebuild mid-animation. */}
      <View style={typing ? s.collapsed : null} pointerEvents={typing ? 'none' : 'auto'}>
        <NumPad onKey={onKey} />
      </View>

      <Touchable onPress={save} disabled={!canSave} scale={0.98} style={[s.save, { backgroundColor: c.primary, opacity: canSave ? 1 : 0.4 }]}>
        <Text style={{ color: '#fff', fontWeight: '700', fontSize: 16 }}>{editTx ? 'עדכון' : 'שמירה'}</Text>
      </Touchable>
    </BottomSheet>
  )
}

const s = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  title: { fontSize: 18, fontWeight: '700' },
  x: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  seg: { flexDirection: 'row', borderRadius: 999, padding: 4, gap: 4, marginBottom: 2 },
  segBtn: { paddingVertical: 10, borderRadius: 999, alignItems: 'center' },
  amountRow: { position: 'relative', justifyContent: 'center' },
  amountWrap: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 6 },
  monthPos: { position: 'absolute', left: 0, top: 0, bottom: 0, justifyContent: 'center' },
  monthPill: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12, borderWidth: 1.2 },
  grid: { flexDirection: 'row-reverse', flexWrap: 'wrap', justifyContent: 'space-between', alignContent: 'center', flexGrow: 1 },
  cell: { width: '31%' },
  chip: { height: 54, borderRadius: 14, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  desc: { borderRadius: 12, paddingHorizontal: 16, paddingVertical: 10, fontSize: 14, marginTop: 2, marginBottom: 8 },
  collapsed: { height: 0, opacity: 0, overflow: 'hidden' },
  save: { borderRadius: 16, paddingVertical: 14, alignItems: 'center', marginTop: 10 },
})
