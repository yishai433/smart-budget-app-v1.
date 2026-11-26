import { useMemo, useRef, useEffect } from 'react'
import { View, Text, ScrollView, StyleSheet, Animated } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { TrendingUp, TrendingDown, CalendarDays } from 'lucide-react-native'
import { useTheme, radius, Theme } from '../theme'
import { formatAmount, money } from '../lib/money'
import { categoryOf } from '../categories'
import { useData } from '../context/DataContext'
import { useAuth } from '../context/AuthContext'
import { shiftMonthKey } from '../lib/month'
import FadeIn from '../components/FadeIn'
import Header from '../components/Header'
import MonthSwitcher from '../components/MonthSwitcher'
import Bar from '../components/Bar'
import DonutChart from '../components/DonutChart'

const SHORT_MONTHS = ['ינו', 'פבר', 'מרץ', 'אפר', 'מאי', 'יונ', 'יול', 'אוג', 'ספט', 'אוק', 'נוב', 'דצמ']
const shortMonth = (key: string) => SHORT_MONTHS[Number(key.split('-')[1]) - 1]

// Animated vertical bar — grows into place so the chart feels alive.
function VBar({ target, color, delay, width = 11 }: { target: number; color: string; delay: number; width?: number }) {
  const h = useRef(new Animated.Value(0)).current
  useEffect(() => { Animated.timing(h, { toValue: target, duration: 650, delay, useNativeDriver: false }).start() }, [target])
  return <Animated.View style={{ width, height: h, borderTopLeftRadius: 5, borderTopRightRadius: 5, backgroundColor: color }} />
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

  const TOP = 6
  const slices = cats.slice(0, TOP).map(r => ({ value: r.amt, color: r.cat.color, label: r.cat.label, emoji: r.cat.emoji }))
  const restSum = cats.slice(TOP).reduce((s, r) => s + r.amt, 0)
  if (restSum > 0) slices.push({ value: restSum, color: c.text3, label: 'אחר', emoji: '•' })

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
  const CHART_H = 110

  const savingsRate = d.totalIncome > 0 ? Math.round((d.balance / d.totalIncome) * 100) : null
  const now = new Date()
  const daysInMonth = new Date(Number(d.monthKey.split('-')[0]), Number(d.monthKey.split('-')[1]), 0).getDate()
  const divisor = d.isCurrentMonth ? now.getDate() : daysInMonth
  const perDay = d.totalExpenses > 0 ? d.totalExpenses / divisor : 0
  const top = cats[0]
  const topPct = top && d.totalExpenses > 0 ? Math.round((top.amt / d.totalExpenses) * 100) : 0
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

            {/* 6-month trend — solid, animated bars on a baseline */}
            <FadeIn delay={120}>
              <View style={[s.card, { backgroundColor: c.card, borderColor: c.border, padding: 20, marginTop: 12 }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <View style={{ flexDirection: 'row', gap: 12 }}>
                    <Legend color={c.accent2Dark} label="הכנסות" c={c} />
                    <Legend color={c.primary} label="הוצאות" c={c} />
                  </View>
                  <Text style={[s.cardTitle, { color: c.text }]}>מגמה (6 חודשים)</Text>
                </View>

                <View style={{ flexDirection: 'row', height: CHART_H, marginTop: 20 }}>
                  {trend.map((m, i) => {
                    const sel = m.key === d.monthKey
                    return (
                      <View key={m.key} style={{ flex: 1, alignItems: 'center', justifyContent: 'flex-end' }}>
                        {sel && <View style={{ position: 'absolute', top: -6, bottom: 22, left: 6, right: 6, backgroundColor: c.bg, borderRadius: 12 }} />}
                        <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 4, height: CHART_H - 22 }}>
                          <VBar target={m.inc > 0 ? Math.max(4, (m.inc / trendMax) * (CHART_H - 22)) : 0} color={c.accent2Dark} delay={150 + i * 70} />
                          <VBar target={m.exp > 0 ? Math.max(4, (m.exp / trendMax) * (CHART_H - 22)) : 0} color={c.primary} delay={190 + i * 70} />
                        </View>
                        <Text style={{ fontSize: 11, marginTop: 8, color: sel ? c.text : c.text3, fontWeight: sel ? '800' : '500' }}>{shortMonth(m.key)}</Text>
                      </View>
                    )
                  })}
                </View>
              </View>
            </FadeIn>

            {/* Insights */}
            <FadeIn delay={180}>
              <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
                <Insight c={c} Icon={savingsRate != null && savingsRate >= 0 ? TrendingUp : TrendingDown} tint={c.accent2Light} iconColor={c.accent2Dark}
                  label="שיעור חיסכון" value={savingsRate != null ? `${savingsRate}%` : '—'} sub={savingsRate != null ? (savingsRate >= 0 ? 'מההכנסות נשמר' : 'חריגה מההכנסות') : 'אין הכנסות'} />
                <Insight c={c} Icon={CalendarDays} tint={c.bg} iconColor={c.text2}
                  label="ממוצע ליום" value={money(Math.round(perDay))} sub={d.isCurrentMonth ? 'עד היום' : 'לאורך החודש'} />
              </View>
            </FadeIn>

            {top && (
              <FadeIn delay={240}>
                <View style={[s.card, { backgroundColor: c.card, borderColor: c.border, padding: 16, marginTop: 10 }]}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                    <View style={{ width: 44, height: 44, borderRadius: 13, backgroundColor: top.cat.color + '22', alignItems: 'center', justifyContent: 'center' }}>
                      <Text style={{ fontSize: 22 }}>{top.cat.emoji}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Text style={{ fontSize: 15, fontWeight: '700', color: c.text }}>{formatAmount(top.amt)}</Text>
                        <Text style={{ fontSize: 13, color: c.text2 }}>הקטגוריה הגדולה · {top.cat.label}</Text>
                      </View>
                      <View style={{ marginTop: 10 }}>
                        <Bar pct={topPct} color={top.cat.color} track={c.bg} height={9} delay={300} />
                      </View>
                      <Text style={{ fontSize: 12, color: c.text3, textAlign: 'right', marginTop: 6 }}>{topPct}% מכלל ההוצאות החודש</Text>
                    </View>
                  </View>
                </View>
              </FadeIn>
            )}
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

function Insight({ c, Icon, label, value, sub, tint, iconColor }: { c: Theme; Icon: typeof CalendarDays; label: string; value: string; sub: string; tint: string; iconColor: string }) {
  return (
    <View style={{ flex: 1, borderWidth: 1, borderColor: c.border, backgroundColor: c.card, borderRadius: radius.lg, padding: 14 }}>
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
