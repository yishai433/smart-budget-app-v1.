import { View, Text, ScrollView, Modal, StyleSheet } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { X, Lightbulb, ArrowUp, ArrowDown } from 'lucide-react-native'
import { useTheme, radius } from '../theme'
import { useData } from '../context/DataContext'
import { categoryOf } from '../categories'
import { money, formatAmount } from '../lib/money'
import { monthLabel, shiftMonthKey, txMonth } from '../lib/month'
import Touchable from './Touchable'
import Bar from './Bar'
import type { Transaction } from '../types'

export type DetailKind = 'expense' | 'income' | 'savings'

const shortDate = (d: string) => { const x = new Date(d); return `${x.getDate()}.${x.getMonth() + 1}` }

function sum(txs: Transaction[], type: 'income' | 'expense') {
  return txs.filter(t => t.type === type).reduce((a, t) => a + (t.amount || 0), 0)
}

// Full-screen drill-down opened from the Income / Expenses / Savings cards.
export default function SummaryDetail({ kind, onClose, onEdit }: { kind: DetailKind | null; onClose: () => void; onEdit: (tx: Transaction) => void }) {
  const c = useTheme()
  const insets = useSafeAreaInsets()
  const d = useData()
  const k = kind || 'expense'
  const month = monthLabel(d.monthKey)

  const income = d.totalIncome
  const expenses = d.totalExpenses
  const balance = d.balance

  const prevKey = shiftMonthKey(d.monthKey, -1)
  const prevTxs = d.transactions.filter(t => txMonth(t) === prevKey)
  const prevBalance = sum(prevTxs, 'income') - sum(prevTxs, 'expense')
  const hasPrev = prevTxs.length > 0

  const isTx = k !== 'savings'
  const txs = isTx
    ? d.monthTransactions.filter(t => t.type === k).slice().sort((a, b) => (b.date || '').localeCompare(a.date || ''))
    : []
  const total = k === 'income' ? income : expenses

  // Category breakdown for the type being viewed.
  const byCat: Record<string, number> = {}
  txs.forEach(t => { byCat[t.category] = (byCat[t.category] || 0) + t.amount })
  const cats = Object.entries(byCat).map(([id, v]) => ({ id, v })).sort((a, b) => b.v - a.v)

  // Savings tip.
  const rate = income > 0 ? Math.round((balance / income) * 100) : 0
  const expByCat: Record<string, number> = {}
  d.monthTransactions.filter(t => t.type === 'expense').forEach(t => { expByCat[t.category] = (expByCat[t.category] || 0) + t.amount })
  const topExp = Object.entries(expByCat).sort((a, b) => b[1] - a[1])[0]
  const topCat = topExp ? categoryOf(topExp[0]) : null
  let tip = ''
  if (income <= 0) tip = 'עדיין לא נרשמו הכנסות החודש. הוסיפו הכנסה כדי לראות כמה הצלחתם לחסוך.'
  else if (balance < 0) tip = `הוצאתם ${money(-balance)} יותר ממה שהכנסתם.${topCat ? ` הקטגוריה הגדולה ביותר היא ${topCat.label} (${money(topExp[1])}), שם הכי קל לצמצם.` : ''}`
  else if (rate >= 20) tip = `מעולה! חסכתם ${rate}% מההכנסות. כדאי להעביר את הסכום לחיסכון קבוע כדי שלא יתמוסס עד סוף החודש.`
  else {
    const need = Math.max(0, Math.round(income * 0.2 - balance))
    tip = `חסכתם ${rate}% מההכנסות. כלל אצבע טוב הוא 20%.${need > 0 ? ` צמצום של ${money(need)}${topCat ? ` ב${topCat.label}` : ''} יביא אתכם לשם.` : ''}`
  }

  const heroColor = k === 'savings' ? (balance >= 0 ? c.accent2Dark : c.danger) : k === 'income' ? c.accent2Dark : c.danger
  const title = k === 'expense' ? 'הוצאות' : k === 'income' ? 'הכנסות' : 'חיסכון'

  return (
    <Modal visible={!!kind} animationType="slide" presentationStyle="fullScreen" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: c.bg }}>
        <View style={{ paddingTop: insets.top + 10, paddingHorizontal: 16, paddingBottom: 6, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View>
            <Text style={{ fontSize: 26, fontWeight: '800', color: c.text, textAlign: 'right' }}>{title}</Text>
            <Text style={{ fontSize: 13, color: c.text2, textAlign: 'right', marginTop: 2 }}>{month}</Text>
          </View>
          <Touchable onPress={onClose} scale={0.9} style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: c.card, borderWidth: 1, borderColor: c.border, alignItems: 'center', justifyContent: 'center' }}>
            <X size={18} color={c.text2} />
          </Touchable>
        </View>

        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 30 }} showsVerticalScrollIndicator={false}>
          {/* Hero */}
          <View style={[s.card, { backgroundColor: c.card, borderColor: c.border, padding: 20 }]}>
            <Text style={{ fontSize: 12, fontWeight: '700', color: c.text2, textAlign: 'right' }}>
              {k === 'savings' ? 'נשאר לכם החודש' : k === 'income' ? 'סך כל ההכנסות' : 'סך כל ההוצאות'}
            </Text>
            <Text style={{ fontSize: 40, fontWeight: '800', color: heroColor, textAlign: 'right', marginTop: 6 }}>{money(k === 'savings' ? balance : total)}</Text>
            {k === 'savings' ? (
              <View style={{ flexDirection: 'row', gap: 10, marginTop: 14 }}>
                <MiniStat label="הכנסות" value={money(income)} color={c.accent2Dark} c={c} />
                <MiniStat label="הוצאות" value={money(expenses)} color={c.danger} c={c} />
                <MiniStat label="שיעור חיסכון" value={income > 0 ? `${rate}%` : '—'} color={c.text} c={c} />
              </View>
            ) : (
              <Text style={{ fontSize: 13, color: c.text2, textAlign: 'right', marginTop: 6 }}>{txs.length} תנועות החודש</Text>
            )}
            {k === 'savings' && hasPrev && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 14, justifyContent: 'flex-end' }}>
                <Text style={{ fontSize: 13, color: c.text2 }}>
                  {balance >= prevBalance ? 'יותר' : 'פחות'} ב-{money(Math.abs(balance - prevBalance))} מ{monthLabel(prevKey).split(' ')[0]}
                </Text>
                {balance >= prevBalance ? <ArrowUp size={14} color={c.accent2Dark} /> : <ArrowDown size={14} color={c.danger} />}
              </View>
            )}
          </View>

          {k === 'savings' ? (
            <View style={[s.card, { backgroundColor: c.primaryLight, borderColor: c.primaryLight, padding: 16, marginTop: 14, flexDirection: 'row', gap: 12, alignItems: 'flex-start' }]}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 13, fontWeight: '700', color: c.primary, textAlign: 'right' }}>טיפ</Text>
                <Text style={{ fontSize: 14, lineHeight: 21, color: c.text, textAlign: 'right', marginTop: 4 }}>{tip}</Text>
              </View>
              <View style={{ width: 36, height: 36, borderRadius: 12, backgroundColor: c.card, alignItems: 'center', justifyContent: 'center' }}>
                <Lightbulb size={19} color={c.primary} />
              </View>
            </View>
          ) : txs.length === 0 ? (
            <View style={[s.card, { backgroundColor: c.card, borderColor: c.border, padding: 28, alignItems: 'center', marginTop: 14 }]}>
              <Text style={{ color: c.text2, fontSize: 14 }}>אין {k === 'income' ? 'הכנסות' : 'הוצאות'} ב{month}.</Text>
            </View>
          ) : (
            <>
              <Text style={[s.section, { color: c.text }]}>לפי קטגוריה</Text>
              <View style={[s.card, { backgroundColor: c.card, borderColor: c.border }]}>
                {cats.map((r, i) => {
                  const cat = categoryOf(r.id)
                  const p = total > 0 ? Math.round((r.v / total) * 100) : 0
                  return (
                    <View key={r.id} style={[row, i ? { borderTopColor: c.sep, borderTopWidth: StyleSheet.hairlineWidth } : null]}>
                      <View style={[s.icon, { backgroundColor: cat.color + '22' }]}><Text style={{ fontSize: 17 }}>{cat.emoji}</Text></View>
                      <View style={{ flex: 1 }}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 7 }}>
                          <Text style={{ fontSize: 14, fontWeight: '600', color: c.text }}>{cat.label}</Text>
                          <Text style={{ fontSize: 13, color: c.text2 }}>{money(r.v)}  ·  {p}%</Text>
                        </View>
                        <Bar pct={p} color={cat.color} track={c.bg} delay={120 + i * 50} />
                      </View>
                    </View>
                  )
                })}
              </View>

              <Text style={[s.section, { color: c.text }]}>כל התנועות</Text>
              <View style={[s.card, { backgroundColor: c.card, borderColor: c.border }]}>
                {txs.map((tx, i) => {
                  const cat = categoryOf(tx.category)
                  return (
                    <Touchable key={tx.id} scale={0.98} onPress={() => onEdit(tx)} style={[row, i ? { borderTopColor: c.sep, borderTopWidth: StyleSheet.hairlineWidth } : null]}>
                      <View style={[s.icon, { backgroundColor: cat.color + '22' }]}><Text style={{ fontSize: 17 }}>{cat.emoji}</Text></View>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 14.5, fontWeight: '500', color: c.text }}>{tx.description || cat.label}</Text>
                        <Text style={{ fontSize: 12, color: c.text2, marginTop: 2 }}>{cat.label} · {shortDate(tx.date)}</Text>
                      </View>
                      <Text style={{ fontSize: 15, fontWeight: '700', color: k === 'income' ? c.success : c.text }}>
                        {k === 'income' ? '+' : '−'}{formatAmount(tx.amount)}
                      </Text>
                    </Touchable>
                  )
                })}
              </View>
            </>
          )}
        </ScrollView>
      </View>
    </Modal>
  )
}

function MiniStat({ label, value, color, c }: { label: string; value: string; color: string; c: any }) {
  return (
    <View style={{ flex: 1, backgroundColor: c.bg, borderRadius: 14, padding: 10, alignItems: 'flex-end' }}>
      <Text style={{ fontSize: 11, color: c.text2, fontWeight: '600' }}>{label}</Text>
      <Text style={{ fontSize: 14, fontWeight: '700', color, marginTop: 3 }}>{value}</Text>
    </View>
  )
}

const row = { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 12, padding: 14 }
const s = StyleSheet.create({
  card: { borderWidth: 1, borderRadius: radius.lg, overflow: 'hidden' },
  section: { fontSize: 17, fontWeight: '700', textAlign: 'right', marginTop: 24, marginBottom: 12 },
  icon: { width: 38, height: 38, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
})
