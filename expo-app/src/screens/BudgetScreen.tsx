import { useState } from 'react'
import { View, Text, ScrollView, StyleSheet } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Wallet, ArrowUpRight, ArrowDownLeft, Plus } from 'lucide-react-native'
import { useTheme, radius, Theme } from '../theme'
import { formatAmount, money, displayCurrency } from '../lib/money'
import { categoryOf } from '../categories'
import { useData } from '../context/DataContext'
import { useAuth } from '../context/AuthContext'
import Ring from '../components/Ring'
import Bar from '../components/Bar'
import FadeIn from '../components/FadeIn'
import Header from '../components/Header'
import MonthSwitcher from '../components/MonthSwitcher'
import Touchable from '../components/Touchable'
import AddTransactionSheet from './AddTransactionSheet'
import BudgetModal from '../components/BudgetModal'
import SavingsGoals from '../components/SavingsGoals'
import { monthLabel } from '../lib/month'
import type { Transaction } from '../types'

const shortDate = (d: string) => { const x = new Date(d); return `${x.getDate()}.${x.getMonth() + 1}` }

export default function BudgetScreen() {
  const c = useTheme()
  const insets = useSafeAreaInsets()
  const { user } = useAuth()
  const d = useData()
  const [adding, setAdding] = useState(false)
  const [editTx, setEditTx] = useState<Transaction | null>(null)
  const [budgetOpen, setBudgetOpen] = useState(false)

  const names = [user?.displayName || user?.email?.split('@')[0] || 'אני', d.partnerName || ''].filter(Boolean)
  const spent = d.totalExpenses
  const budget = d.monthlyBudget
  const pct = budget && budget > 0 ? Math.round((spent / budget) * 100) : (spent > 0 ? 100 : 0)
  const over = budget != null && spent > budget
  const dayOfMonth = new Date().getDate()
  const daysInMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate()
  const forecast = d.isCurrentMonth && spent > 0 && dayOfMonth >= 4 ? Math.round((spent / dayOfMonth) * daysInMonth) : null

  // Categories: everything with spending this month, plus every category that has a budget.
  const byCat: Record<string, number> = {}
  d.monthTransactions.filter(t => t.type === 'expense').forEach(t => { byCat[t.category] = (byCat[t.category] || 0) + t.amount })
  const catIds = Array.from(new Set([...Object.keys(byCat), ...Object.keys(d.effectiveCategoryBudgets)]))
  const cats = catIds.map(id => ({ id, spent: byCat[id] || 0 })).sort((a, b) => b.spent - a.spent)

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <ScrollView contentContainerStyle={{ padding: 16, paddingTop: insets.top + 12, paddingBottom: 140 }} showsVerticalScrollIndicator={false}>
        <FadeIn>
          <Header title="תקציב" names={names} />
          <MonthSwitcher monthKey={d.monthKey} isCurrentMonth={d.isCurrentMonth} onPrev={() => d.shiftMonth(-1)} onNext={() => d.shiftMonth(1)} onToday={d.goToCurrentMonth} />
        </FadeIn>

        <FadeIn delay={60}>
          <Touchable onPress={() => setBudgetOpen(true)} scale={0.99}>
          <View style={[s.hero, { backgroundColor: c.ink }]}>
            <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' }}>
              <View style={{ flex: 1 }}>
                <Text style={[s.overline, { color: c.inkText2 }]}>{over ? 'חרגנו מהתקציב ב' : 'הוצאנו החודש'}</Text>
                <Text style={[s.heroNum, { color: over ? c.danger : c.inkText }]}>
                  <Text style={{ fontSize: 24 }}>{over ? '−' : ''}{displayCurrency()}</Text>{formatAmount(over && budget != null ? spent - budget : spent, '')}
                </Text>
              </View>
              <Ring pct={pct} />
            </View>
            <View style={{ marginTop: 16, paddingTop: 14, borderTopWidth: 1, borderTopColor: c.inkLine }}>
              <Text style={{ fontSize: 13, color: c.inkText2 }}>
                {budget != null ? <>מתוך תקציב של <Text style={{ color: c.inkText, fontWeight: '700' }}>{money(budget)}</Text></> : 'לא הוגדר תקציב לחודש'}
              </Text>
            </View>
            {forecast != null && (
              <Text style={{ marginTop: 10, fontSize: 13, color: budget != null && forecast > budget ? c.danger : c.inkText2, fontWeight: budget != null && forecast > budget ? '600' : '500' }}>
                בקצב הנוכחי תסיימו את החודש על <Text style={{ fontWeight: '700', color: budget != null && forecast > budget ? c.danger : c.inkText }}>{money(forecast)}</Text>
              </Text>
            )}
          </View>
          </Touchable>
        </FadeIn>

        <FadeIn delay={140}>
          <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
            <Kpi c={c} Icon={Wallet} label="חיסכון" value={money(d.balance)} color={d.balance >= 0 ? c.accent2Dark : c.danger} tint={c.accent2Light} iconColor={c.accent2Dark} />
            <Kpi c={c} Icon={ArrowUpRight} label="הוצאות" value={money(d.totalExpenses)} color={c.danger} tint={c.bg} iconColor={c.text2} />
            <Kpi c={c} Icon={ArrowDownLeft} label="הכנסות" value={money(d.totalIncome)} color={c.accent2Dark} tint={c.accent2Light} iconColor={c.accent2Dark} />
          </View>
        </FadeIn>

        {cats.length > 0 && (
          <FadeIn delay={220}>
            <Text style={[s.section, { color: c.text }]}>קטגוריות</Text>
            <View style={[s.card, { backgroundColor: c.card, borderColor: c.border }]}>
              {cats.map((r, i) => {
                const cat = categoryOf(r.id)
                const b = d.effectiveCategoryBudgets[r.id]
                const p = b ? Math.round((r.spent / b) * 100) : 0
                const ov = b && r.spent > b
                return (
                  <View key={r.id} style={[st_row(c), i === 0 ? null : { borderTopColor: c.sep, borderTopWidth: StyleSheet.hairlineWidth }]}>
                    <View style={[s.icon, { backgroundColor: cat.color + '22' }]}><Text style={{ fontSize: 17 }}>{cat.emoji}</Text></View>
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 7 }}>
                        <Text style={{ fontSize: 14, fontWeight: '600', color: c.text }}>{cat.label}</Text>
                        <Text style={{ fontSize: 13, color: ov ? c.danger : c.text2 }}>{money(r.spent)}{b ? <Text style={{ color: c.text3 }}>  /  {money(b)}</Text> : null}</Text>
                      </View>
                      <Bar pct={p} color={ov ? c.danger : cat.color} track={c.bg} delay={200 + i * 60} />
                    </View>
                  </View>
                )
              })}
            </View>
          </FadeIn>
        )}

        <SavingsGoals />

        <FadeIn delay={300}>
          <Text style={[s.section, { color: c.text }]}>תנועות</Text>
          {d.monthTransactions.length === 0 ? (
            <View style={[s.card, { backgroundColor: c.card, borderColor: c.border, padding: 24, alignItems: 'center' }]}>
              <Text style={{ color: c.text2, fontSize: 14 }}>אין עדיין תנועות החודש. הוסף אחת עם הכפתור למטה.</Text>
            </View>
          ) : (
            <View style={[s.card, { backgroundColor: c.card, borderColor: c.border }]}>
              {d.monthTransactions.map((tx, i) => {
                const cat = categoryOf(tx.category)
                return (
                  <Touchable key={tx.id} scale={0.98} onPress={() => setEditTx(tx)}
                    style={[st_row(c), i ? { borderTopColor: c.sep, borderTopWidth: StyleSheet.hairlineWidth } : null]}>
                    <View style={[s.icon, { backgroundColor: cat.color + '22' }]}><Text style={{ fontSize: 17 }}>{cat.emoji}</Text></View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 14.5, fontWeight: '500', color: c.text }}>{tx.description || cat.label}</Text>
                      <Text style={{ fontSize: 12, color: c.text2, marginTop: 2 }}>{cat.label} · {shortDate(tx.date)}</Text>
                    </View>
                    <Text style={{ fontSize: 15, fontWeight: '700', color: tx.type === 'income' ? c.success : c.text }}>
                      {tx.type === 'income' ? '+' : '−'}{formatAmount(tx.amount)}
                    </Text>
                  </Touchable>
                )
              })}
            </View>
          )}
        </FadeIn>
      </ScrollView>

      <Touchable onPress={() => setAdding(true)} scale={0.92}
        style={{ position: 'absolute', bottom: insets.bottom + 16, left: 20, width: 56, height: 56, borderRadius: 28, backgroundColor: c.primary, alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 6 }}>
        <Plus size={26} color="#fff" strokeWidth={2.4} />
      </Touchable>

      <AddTransactionSheet visible={adding} onClose={() => setAdding(false)} />
      <AddTransactionSheet visible={!!editTx} editTx={editTx} onClose={() => setEditTx(null)} />
      <BudgetModal visible={budgetOpen} current={budget} monthLabel={monthLabel(d.monthKey)} onClose={() => setBudgetOpen(false)} onSave={(nn) => d.setMonthlyBudget(nn)} />
    </View>
  )
}

function Kpi({ c, Icon, label, value, color, tint, iconColor }: { c: Theme; Icon: typeof Wallet; label: string; value: string; color: string; tint: string; iconColor: string }) {
  return (
    <View style={{ flex: 1, borderWidth: 1, borderColor: c.border, backgroundColor: c.card, borderRadius: radius.lg, padding: 12, alignItems: 'flex-end' }}>
      <View style={{ width: 28, height: 28, borderRadius: 8, backgroundColor: tint, alignItems: 'center', justifyContent: 'center', marginBottom: 8 }}><Icon size={15} color={iconColor} strokeWidth={2.2} /></View>
      <Text style={{ fontSize: 11, fontWeight: '600', color: c.text2 }}>{label}</Text>
      <Text style={{ fontSize: 14, fontWeight: '700', color, marginTop: 2 }}>{value}</Text>
    </View>
  )
}

const st_row = (c: Theme) => ({ flexDirection: 'row' as const, alignItems: 'center' as const, gap: 12, padding: 14 })
const s = StyleSheet.create({
  hero: { borderRadius: radius.xl, padding: 20, shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 16, shadowOffset: { width: 0, height: 8 }, elevation: 4 },
  overline: { fontSize: 11, fontWeight: '700', letterSpacing: 0.5, textAlign: 'right' },
  heroNum: { fontSize: 40, fontWeight: '800', textAlign: 'right', marginTop: 6 },
  section: { fontSize: 17, fontWeight: '700', textAlign: 'right', marginTop: 26, marginBottom: 12 },
  card: { borderWidth: 1, borderRadius: radius.lg, overflow: 'hidden' },
  icon: { width: 38, height: 38, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
})
