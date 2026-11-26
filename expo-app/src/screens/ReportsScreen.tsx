import { useMemo } from 'react'
import { View, Text, ScrollView, StyleSheet } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { TrendingUp, TrendingDown, PiggyBank, CalendarDays } from 'lucide-react-native'
import { useTheme, radius, Theme } from '../theme'
import { formatAmount, money } from '../lib/money'
import { categoryOf } from '../categories'
import { useData } from '../context/DataContext'
import { useAuth } from '../context/AuthContext'
import { shiftMonthKey } from '../lib/month'
import FadeIn from '../components/FadeIn'
import Header from '../components/Header'
import MonthSwitcher from '../components/MonthSwitcher'
import DonutChart from '../components/DonutChart'

const SHORT_MONTHS = ['ינו', 'פבר', 'מרץ', 'אפר', 'מאי', 'יונ', 'יול', 'אוג', 'ספט', 'אוק', 'נוב', 'דצמ']
const shortMonth = (key: string) => SHORT_MONTHS[Number(key.split('-')[1]) - 1]

export default function ReportsScreen() {
  const c = useTheme()
  const insets = useSafeAreaInsets()
  const { user } = useAuth()
  const d = useData()
  const names = [user?.displayName || user?.email?.split('@')[0] || 'אני', d.partnerName || ''].filter(Boolean)

  // Expenses by category for the selected month.
  const cats = useMemo(() => {
    const by: Record<string, number> = {}
    d.monthTransactions.filter(t => t.type === 'expense').forEach(t => { by[t.category] = (by[t.category] || 0) + t.amount })
    return Object.entries(by).map(([id, amt]) => ({ id, amt, cat: categoryOf(id) })).sort((a, b) => b.amt - a.amt)
  }, [d.monthTransactions])

  // Donut: top 6 categories, rest folded into "אחר".
  const TOP = 6
  const slices = cats.slice(0, TOP).map(r => ({ value: r.amt, color: r.cat.color, label: r.cat.label, emoji: r.cat.emoji }))
  const restSum = cats.slice(TOP).reduce((s, r) => s + r.amt, 0)
  if (restSum > 0) slices.push({ value: restSum, color: c.text3, label: 'אחר', emoji: '•' })

  // 6-month income/expense trend ending at the selected month.
  const trend = useMemo(() => {
    const keys = Array.from({ length: 6 }, (_, i) => shiftMonthKey(d.monthKey, i - 5))
    return keys.map(k => {
      let inc = 0, exp = 0
      d.transactions.forEach(t => {
        if (!t.date?.startsWith(k)) return
        if (t.type === 'income') inc += t.amount || 0; else exp += t.amount || 0
      })
      return { key: k, inc, exp }
    })
  }, [d.transactions, d.monthKey])
  const trendMax = Math.max(1, ...trend.flatMap(m => [m.inc, m.exp]))

  // Insights.
  const savingsRate = d.totalIncome > 0 ? Math.round((d.balance / d.totalIncome) * 100) : null
  const now = new Date()
  const daysInMonth = new Date(Number(d.monthKey.split('-')[0]), Number(d.monthKey.split('-')[1]), 0).getDate()
  const divisor = d.isCurrentMonth ? now.getDate() : daysInMonth
  const perDay = d.totalExpenses > 0 ? d.totalExpenses / divisor : 0
  const top = cats[0]
  const hasData = d.totalExpenses > 0 || d.totalIncome > 0

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <ScrollView contentContainerStyle={{ padding: 16, paddingTop: insets.top + 12, paddingBottom: 120 }} showsVerticalScrollIndicator={false}>
        <FadeIn>
          <Header title="דוחות" names={names} />
          <MonthSwitcher monthKey={d.monthKey} isCurrentMonth={d.isCurrentMonth} onPrev={() => d.shiftMonth(-1)} onNext={() => d.shiftMonth(1)} onToday={d.goToCurrentMonth} />
        </FadeIn>

        {!hasData ? (
          <FadeIn delay={60}>
            <View style={[s.card, { backgroundColor: c.card, borderColor: c.border, padding: 28, alignItems: 'center', marginTop: 8 }]}>
              <Text style={{ fontSize: 15, color: c.text2, textAlign: 'center' }}>אין עדיין נתונים לחודש הזה.{'\n'}הוסיפו תנועות כדי לראות דוחות.</Text>
            </View>
          </FadeIn>
        ) : (
          <>
            {/* Donut: where the money went */}
            <FadeIn delay={60}>
              <View style={[s.card, { backgroundColor: c.card, borderColor: c.border, padding: 20, marginTop: 8, alignItems: 'center' }]}>
                <Text style={[s.cardTitle, { color: c.text }]}>לאן הלך הכסף</Text>
                <View style={{ marginTop: 14, marginBottom: 6 }}>
                  <DonutChart slices={slices} track={c.bg}>
                    <Text style={{ fontSize: 12, color: c.text2 }}>הוצאות</Text>
                    <Text style={{ fontSize: 24, fontWeight: '800', color: c.text }}>{money(d.totalExpenses)}</Text>
                    <Text style={{ fontSize: 11, color: c.text3 }}>{cats.length} קטגוריות</Text>
                  </DonutChart>
                </View>
                <View style={{ width: '100%', marginTop: 10, gap: 10 }}>
                  {slices.map((sl, i) => {
                    const pct = d.totalExpenses > 0 ? Math.round((sl.value / d.totalExpenses) * 100) : 0
                    return (
                      <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                        <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: sl.color }} />
                        <Text style={{ fontSize: 14, color: c.text, flex: 1, textAlign: 'right' }}>{sl.emoji} {sl.label}</Text>
                        <Text style={{ fontSize: 13, color: c.text2 }}>{formatAmount(sl.value)}</Text>
                        <Text style={{ fontSize: 12, color: c.text3, width: 38, textAlign: 'left' }}>{pct}%</Text>
                      </View>
                    )
                  })}
                </View>
              </View>
            </FadeIn>

            {/* 6-month trend */}
            <FadeIn delay={120}>
              <View style={[s.card, { backgroundColor: c.card, borderColor: c.border, padding: 20, marginTop: 12 }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <View style={{ flexDirection: 'row', gap: 12 }}>
                    <Legend color={c.accent2Dark} label="הכנסות" c={c} />
                    <Legend color={c.primary} label="הוצאות" c={c} />
                  </View>
                  <Text style={[s.cardTitle, { color: c.text }]}>מגמה (6 חודשים)</Text>
                </View>
                <View style={{ flexDirection: 'row', height: 130, marginTop: 18, alignItems: 'flex-end' }}>
                  {trend.map(m => {
                    const sel = m.key === d.monthKey
                    return (
                      <View key={m.key} style={{ flex: 1, alignItems: 'center', justifyContent: 'flex-end' }}>
                        <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 3, height: 104 }}>
                          <View style={{ width: 9, height: Math.max(3, (m.inc / trendMax) * 104), borderRadius: 4, backgroundColor: sel ? c.accent2Dark : c.accent2Light }} />
                          <View style={{ width: 9, height: Math.max(3, (m.exp / trendMax) * 104), borderRadius: 4, backgroundColor: sel ? c.primary : c.primaryLight }} />
                        </View>
                        <Text style={{ fontSize: 11, marginTop: 8, color: sel ? c.text : c.text3, fontWeight: sel ? '700' : '500' }}>{shortMonth(m.key)}</Text>
                      </View>
                    )
                  })}
                </View>
              </View>
            </FadeIn>

            {/* Insights */}
            <FadeIn delay={180}>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 12 }}>
                <Insight c={c} Icon={savingsRate != null && savingsRate >= 0 ? TrendingUp : TrendingDown} tint={c.accent2Light} iconColor={c.accent2Dark}
                  label="שיעור חיסכון" value={savingsRate != null ? `${savingsRate}%` : '—'} sub={savingsRate != null ? (savingsRate >= 0 ? 'מההכנסות נשמר' : 'חריגה מההכנסות') : 'אין הכנסות'} />
                <Insight c={c} Icon={CalendarDays} tint={c.bg} iconColor={c.text2}
                  label="ממוצע ליום" value={money(Math.round(perDay))} sub={d.isCurrentMonth ? 'עד היום' : 'לאורך החודש'} />
                {top && (
                  <Insight c={c} Icon={PiggyBank} tint={top.cat.color + '22'} iconColor={top.cat.color} wide
                    label="הקטגוריה הגדולה" value={`${top.cat.emoji} ${top.cat.label}`} sub={`${formatAmount(top.amt)} · ${d.totalExpenses > 0 ? Math.round((top.amt / d.totalExpenses) * 100) : 0}% מההוצאות`} />
                )}
              </View>
            </FadeIn>
          </>
        )}
      </ScrollView>
    </View>
  )
}

function Legend({ color, label, c }: { color: string; label: string; c: Theme }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
      <View style={{ width: 9, height: 9, borderRadius: 3, backgroundColor: color }} />
      <Text style={{ fontSize: 12, color: c.text2 }}>{label}</Text>
    </View>
  )
}

function Insight({ c, Icon, label, value, sub, tint, iconColor, wide }: { c: Theme; Icon: typeof PiggyBank; label: string; value: string; sub: string; tint: string; iconColor: string; wide?: boolean }) {
  return (
    <View style={{ width: wide ? '100%' : undefined, flex: wide ? undefined : 1, borderWidth: 1, borderColor: c.border, backgroundColor: c.card, borderRadius: radius.lg, padding: 14 }}>
      <View style={{ width: 30, height: 30, borderRadius: 9, backgroundColor: tint, alignItems: 'center', justifyContent: 'center', marginBottom: 10 }}>
        <Icon size={16} color={iconColor} strokeWidth={2.2} />
      </View>
      <Text style={{ fontSize: 12, color: c.text2, textAlign: 'right' }}>{label}</Text>
      <Text style={{ fontSize: 17, fontWeight: '800', color: c.text, textAlign: 'right', marginTop: 3 }}>{value}</Text>
      <Text style={{ fontSize: 11, color: c.text3, textAlign: 'right', marginTop: 2 }}>{sub}</Text>
    </View>
  )
}

const s = StyleSheet.create({
  card: { borderWidth: 1, borderRadius: radius.lg },
  cardTitle: { fontSize: 16, fontWeight: '700', textAlign: 'right' },
})
