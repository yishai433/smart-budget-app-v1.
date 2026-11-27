import { useMemo } from 'react'
import { View, Text, ScrollView, StyleSheet } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { ArrowDown, ArrowUp, CalendarDays, PiggyBank } from 'lucide-react-native'
import { useTheme, radius, Theme } from '../theme'
import { formatAmount, money } from '../lib/money'
import { categoryOf } from '../categories'
import { useData } from '../context/DataContext'
import { useAuth } from '../context/AuthContext'
import { shiftMonthKey, txMonth } from '../lib/month'
import FadeIn from '../components/FadeIn'
import Header from '../components/Header'
import MonthSwitcher from '../components/MonthSwitcher'
import Bar from '../components/Bar'
import DonutChart from '../components/DonutChart'
import TrendBars from '../components/TrendBars'

const SHORT_MONTHS = ['ינו', 'פבר', 'מרץ', 'אפר', 'מאי', 'יונ', 'יול', 'אוג', 'ספט', 'אוק', 'נוב', 'דצמ']
const FULL_MONTHS = ['ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני', 'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר']
const monthIdx = (key: string) => Number(key.split('-')[1]) - 1
const monthsBetween = (from: string, to: string) => {
  const [ay, am] = from.split('-').map(Number)
  const [by, bm] = to.split('-').map(Number)
  return (by - ay) * 12 + (bm - am)
}

export default function ReportsScreen() {
  const c = useTheme()
  const insets = useSafeAreaInsets()
  const { user } = useAuth()
  const d = useData()
  const names = [user?.displayName || user?.email?.split('@')[0] || 'אני', d.partnerName || ''].filter(Boolean)

  const cats = useMemo(() => {
    const by: Record<string, number> = {}
    d.monthTransactions.filter(t => t.type === 'expense').forEach(t => { by[t.category] = (by[t.category] || 0) + t.amount })
    return Object.entries(by).map(([id, amt]) => ({ id, amt, cat: categoryOf(id) })).sort((a, b) => b.amt - a.amt)
  }, [d.monthTransactions])

  const TOP = 5
  const slices = cats.slice(0, TOP).map(r => ({ value: r.amt, color: r.cat.color, label: r.cat.label, emoji: r.cat.emoji }))
  const restSum = cats.slice(TOP).reduce((s, r) => s + r.amt, 0)
  if (restSum > 0) slices.push({ value: restSum, color: c.text3, label: 'שאר הקטגוריות', emoji: '•' })

  // Six months of totals, ending at the selected month.
  const trend = useMemo(() => {
    const keys = Array.from({ length: 6 }, (_, i) => shiftMonthKey(d.monthKey, i - 5))
    return keys.map(k => {
      let inc = 0, exp = 0
      d.transactions.forEach(t => {
        if (txMonth(t) !== k) return
        if (t.type === 'income') inc += t.amount || 0; else exp += t.amount || 0
      })
      return { key: k, inc, exp }
    })
  }, [d.transactions, d.monthKey])

  const months = trend.filter(m => m.exp > 0)
  const avgExp = months.length ? months.reduce((s, m) => s + m.exp, 0) / months.length : 0
  const prev = trend[trend.length - 2]
  const deltaPct = prev && prev.exp > 0 ? Math.round(((d.totalExpenses - prev.exp) / prev.exp) * 100) : null
  const prevName = prev ? FULL_MONTHS[monthIdx(prev.key)] : ''

  const flowMax = Math.max(1, d.totalIncome, d.totalExpenses)
  const savingsRate = d.totalIncome > 0 ? Math.round((d.balance / d.totalIncome) * 100) : null
  const now = new Date()
  const daysInMonth = new Date(Number(d.monthKey.split('-')[0]), Number(d.monthKey.split('-')[1]), 0).getDate()
  const perDay = d.totalExpenses > 0 ? d.totalExpenses / (d.isCurrentMonth ? now.getDate() : daysInMonth) : 0
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
            {/* Hero: how much went out, and how the month sits against the others */}
            <FadeIn delay={60}>
              <View style={[s.card, { backgroundColor: c.card, borderColor: c.border, padding: 20, marginTop: 8 }]}>
                <Text style={{ fontSize: 13, color: c.text2, textAlign: 'right' }}>הוצאות ב{FULL_MONTHS[monthIdx(d.monthKey)]}</Text>
                <View style={{ flexDirection: 'row-reverse', alignItems: 'flex-end', gap: 10, marginTop: 4 }}>
                  <Text style={{ fontSize: 34, fontWeight: '800', color: c.text }}>{money(d.totalExpenses)}</Text>
                  {deltaPct != null && (
                    <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 3, marginBottom: 7,
                      backgroundColor: deltaPct > 0 ? c.dangerLight : c.accent2Light, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 }}>
                      {deltaPct > 0 ? <ArrowUp size={12} color={c.danger} strokeWidth={2.6} /> : <ArrowDown size={12} color={c.accent2Dark} strokeWidth={2.6} />}
                      <Text style={{ fontSize: 11.5, fontWeight: '700', color: deltaPct > 0 ? c.danger : c.accent2Dark }}>{Math.abs(deltaPct)}%</Text>
                    </View>
                  )}
                </View>
                {deltaPct != null && (
                  <Text style={{ fontSize: 12.5, color: c.text2, textAlign: 'right', marginTop: 2 }}>
                    {deltaPct > 0 ? 'יותר' : deltaPct < 0 ? 'פחות' : 'כמו'} מ{prevName}
                  </Text>
                )}

                <View style={{ marginTop: 18 }}>
                  <TrendBars
                    data={trend.map(m => ({ key: m.key, value: m.exp, label: SHORT_MONTHS[monthIdx(m.key)] }))}
                    selectedKey={d.monthKey}
                    onSelect={k => d.shiftMonth(monthsBetween(d.monthKey, k))}
                    color={c.primary}
                    c={c}
                    averageLabel={avgExp > 0 ? `ממוצע של ${money(Math.round(avgExp))} לחודש · הקישו על חודש כדי לעבור אליו` : undefined}
                  />
                </View>
              </View>
            </FadeIn>

            {/* Cash flow */}
            <FadeIn delay={120}>
              <View style={[s.card, { backgroundColor: c.card, borderColor: c.border, padding: 20, marginTop: 12 }]}>
                <Text style={[s.cardTitle, { color: c.text }]}>תזרים החודש</Text>
                <View style={{ marginTop: 16, gap: 14 }}>
                  <FlowRow c={c} label="הכנסות" amount={d.totalIncome} pct={(d.totalIncome / flowMax) * 100} color={c.accent2Dark} delay={200} />
                  <FlowRow c={c} label="הוצאות" amount={d.totalExpenses} pct={(d.totalExpenses / flowMax) * 100} color={c.danger} delay={280} />
                </View>
                <View style={{ flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', marginTop: 18, paddingTop: 14, borderTopWidth: 1, borderTopColor: c.sep }}>
                  <Text style={{ fontSize: 14, color: c.text2 }}>נשאר בסוף החודש</Text>
                  <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 8 }}>
                    <Text style={{ fontSize: 19, fontWeight: '800', color: d.balance >= 0 ? c.accent2Dark : c.danger }}>{money(d.balance)}</Text>
                    <View style={{ backgroundColor: d.balance >= 0 ? c.accent2Light : c.dangerLight, paddingHorizontal: 9, paddingVertical: 3, borderRadius: 999 }}>
                      <Text style={{ fontSize: 11, fontWeight: '700', color: d.balance >= 0 ? c.accent2Dark : c.danger }}>{d.balance >= 0 ? 'חיובי' : 'שלילי'}</Text>
                    </View>
                  </View>
                </View>
              </View>
            </FadeIn>

            {/* Where it went */}
            {cats.length > 0 && (
              <FadeIn delay={180}>
                <View style={[s.card, { backgroundColor: c.card, borderColor: c.border, padding: 20, marginTop: 12, alignItems: 'center' }]}>
                  <Text style={[s.cardTitle, { color: c.text, alignSelf: 'stretch' }]}>לאן הלך הכסף</Text>
                  <View style={{ marginTop: 18, marginBottom: 4 }}>
                    <DonutChart slices={slices} track={c.bg} size={172} thickness={22}>
                      <Text style={{ fontSize: 26 }}>{cats[0].cat.emoji}</Text>
                      <Text style={{ fontSize: 13, fontWeight: '700', color: c.text, marginTop: 2 }}>{cats[0].cat.label}</Text>
                      <Text style={{ fontSize: 11, color: c.text3 }}>הכי גדולה</Text>
                    </DonutChart>
                  </View>
                  <View style={{ width: '100%', marginTop: 14, gap: 12 }}>
                    {slices.map((sl, i) => {
                      const pct = d.totalExpenses > 0 ? Math.round((sl.value / d.totalExpenses) * 100) : 0
                      return (
                        <View key={i} style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 10 }}>
                          <View style={{ width: 9, height: 9, borderRadius: 999, backgroundColor: sl.color }} />
                          <Text style={{ fontSize: 14, color: c.text, flex: 1, textAlign: 'right' }}>{sl.label}</Text>
                          <Text style={{ fontSize: 13.5, fontWeight: '600', color: c.text2 }}>{formatAmount(sl.value)}</Text>
                          <Text style={{ fontSize: 12, color: c.text3, width: 36, textAlign: 'left' }}>{pct}%</Text>
                        </View>
                      )
                    })}
                  </View>
                </View>
              </FadeIn>
            )}

            <FadeIn delay={240}>
              <View style={{ flexDirection: 'row-reverse', gap: 10, marginTop: 12 }}>
                <Insight c={c} Icon={CalendarDays} tint={c.bg} iconColor={c.text2}
                  label="ממוצע ליום" value={money(Math.round(perDay))} sub={d.isCurrentMonth ? 'עד היום' : 'לאורך החודש'} />
                <Insight c={c} Icon={PiggyBank} tint={c.accent2Light} iconColor={c.accent2Dark}
                  label="שיעור חיסכון" value={savingsRate != null ? `${savingsRate}%` : '—'}
                  sub={savingsRate != null ? (savingsRate >= 0 ? 'מההכנסות נשמר' : 'חריגה מההכנסות') : 'אין הכנסות'} />
              </View>
            </FadeIn>
          </>
        )}
      </ScrollView>
    </View>
  )
}

function FlowRow({ c, label, amount, pct, color, delay }: { c: Theme; label: string; amount: number; pct: number; color: string; delay: number }) {
  return (
    <View>
      <View style={{ flexDirection: 'row-reverse', justifyContent: 'space-between', marginBottom: 7 }}>
        <Text style={{ fontSize: 13.5, color: c.text2 }}>{label}</Text>
        <Text style={{ fontSize: 14.5, fontWeight: '700', color: c.text }}>{formatAmount(amount)}</Text>
      </View>
      <Bar pct={pct} color={color} track={c.bg} height={10} delay={delay} />
    </View>
  )
}

function Insight({ c, Icon, label, value, sub, tint, iconColor }: { c: Theme; Icon: typeof CalendarDays; label: string; value: string; sub: string; tint: string; iconColor: string }) {
  return (
    <View style={{ flex: 1, borderWidth: 1, borderColor: c.border, backgroundColor: c.card, borderRadius: radius.lg, padding: 14 }}>
      <View style={{ width: 30, height: 30, borderRadius: 9, backgroundColor: tint, alignItems: 'center', justifyContent: 'center', marginBottom: 10 }}>
        <Icon size={16} color={iconColor} strokeWidth={2.2} />
      </View>
      <Text style={{ fontSize: 12, color: c.text2, textAlign: 'right' }}>{label}</Text>
      <Text style={{ fontSize: 18, fontWeight: '800', color: c.text, textAlign: 'right', marginTop: 3 }}>{value}</Text>
      <Text style={{ fontSize: 11, color: c.text3, textAlign: 'right', marginTop: 2 }}>{sub}</Text>
    </View>
  )
}

const s = StyleSheet.create({
  card: { borderWidth: 1, borderRadius: radius.lg },
  cardTitle: { fontSize: 16, fontWeight: '700', textAlign: 'right' },
})
