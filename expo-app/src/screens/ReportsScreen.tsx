import { View, Text, ScrollView, StyleSheet } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { ArrowUpRight, ArrowDownLeft, Wallet } from 'lucide-react-native'
import { useTheme, radius, Theme } from '../theme'
import { formatAmount, money } from '../lib/money'
import { categoryOf } from '../categories'
import { useData } from '../context/DataContext'
import { useAuth } from '../context/AuthContext'
import FadeIn from '../components/FadeIn'
import Header from '../components/Header'
import Bar from '../components/Bar'
import MonthSwitcher from '../components/MonthSwitcher'

export default function ReportsScreen() {
  const c = useTheme()
  const insets = useSafeAreaInsets()
  const { user } = useAuth()
  const d = useData()
  const names = [user?.displayName || user?.email?.split('@')[0] || 'אני', d.partnerName || ''].filter(Boolean)

  const byCat: Record<string, number> = {}
  d.monthTransactions.filter(t => t.type === 'expense').forEach(t => { byCat[t.category] = (byCat[t.category] || 0) + t.amount })
  const rows = Object.entries(byCat).sort((a, b) => b[1] - a[1])
  const max = Math.max(1, ...rows.map(r => r[1]))
  const top = rows[0] ? categoryOf(rows[0][0]) : null

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <ScrollView contentContainerStyle={{ padding: 16, paddingTop: insets.top + 12, paddingBottom: 120 }} showsVerticalScrollIndicator={false}>
        <FadeIn>
          <Header title="דוחות" names={names} />
          <MonthSwitcher monthKey={d.monthKey} isCurrentMonth={d.isCurrentMonth} onPrev={() => d.shiftMonth(-1)} onNext={() => d.shiftMonth(1)} onToday={d.goToCurrentMonth} />
        </FadeIn>

        <FadeIn delay={60}>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <Stat c={c} Icon={ArrowDownLeft} label="הכנסות" value={money(d.totalIncome)} color={c.accent2Dark} tint={c.accent2Light} />
            <Stat c={c} Icon={ArrowUpRight} label="הוצאות" value={money(d.totalExpenses)} color={c.danger} tint={c.dangerLight} />
            <Stat c={c} Icon={Wallet} label="נשאר" value={money(d.balance)} color={d.balance >= 0 ? c.accent2Dark : c.danger} tint={c.bg} />
          </View>
        </FadeIn>

        {top && (
          <FadeIn delay={120}>
            <View style={{ marginTop: 12, borderWidth: 1, borderColor: c.border, borderRadius: radius.lg, backgroundColor: c.card, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <View style={{ width: 42, height: 42, borderRadius: 12, backgroundColor: top.color + '22', alignItems: 'center', justifyContent: 'center' }}><Text style={{ fontSize: 20 }}>{top.emoji}</Text></View>
              <View style={{ flex: 1, alignItems: 'flex-end' }}>
                <Text style={{ fontSize: 13, color: c.text2 }}>הקטגוריה הגדולה החודש</Text>
                <Text style={{ fontSize: 15, fontWeight: '700', color: c.text, marginTop: 2 }}>{top.label} · {formatAmount(rows[0][1])}</Text>
              </View>
            </View>
          </FadeIn>
        )}

        <FadeIn delay={160}>
          <Text style={{ fontSize: 17, fontWeight: '700', color: c.text, textAlign: 'right', marginTop: 26, marginBottom: 12 }}>לפי קטגוריה</Text>
          {rows.length === 0 ? (
            <View style={{ borderWidth: 1, borderColor: c.border, borderRadius: radius.lg, backgroundColor: c.card, padding: 24, alignItems: 'center' }}>
              <Text style={{ color: c.text2 }}>אין הוצאות בחודש הזה.</Text>
            </View>
          ) : (
            <View style={{ borderWidth: 1, borderColor: c.border, borderRadius: radius.lg, backgroundColor: c.card, padding: 16 }}>
              {rows.map(([id, amt], i) => {
                const cat = categoryOf(id)
                const pctOfTotal = d.totalExpenses > 0 ? Math.round((amt / d.totalExpenses) * 100) : 0
                return (
                  <View key={id} style={{ marginBottom: i < rows.length - 1 ? 16 : 0 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
                      <Text style={{ color: c.text, fontWeight: '600' }}>{cat.emoji}  {cat.label}</Text>
                      <Text style={{ color: c.text2 }}>{formatAmount(amt)} <Text style={{ color: c.text3 }}>· {pctOfTotal}%</Text></Text>
                    </View>
                    <Bar pct={(amt / max) * 100} color={cat.color} track={c.bg} delay={150 + i * 70} height={10} />
                  </View>
                )
              })}
            </View>
          )}
        </FadeIn>
      </ScrollView>
    </View>
  )
}

function Stat({ c, Icon, label, value, color, tint }: { c: Theme; Icon: typeof Wallet; label: string; value: string; color: string; tint: string }) {
  return (
    <View style={{ flex: 1, borderWidth: 1, borderColor: c.border, backgroundColor: c.card, borderRadius: radius.lg, padding: 12, alignItems: 'flex-end' }}>
      <View style={{ width: 28, height: 28, borderRadius: 8, backgroundColor: tint, alignItems: 'center', justifyContent: 'center', marginBottom: 8 }}><Icon size={15} color={color} strokeWidth={2.2} /></View>
      <Text style={{ fontSize: 11, fontWeight: '600', color: c.text2 }}>{label}</Text>
      <Text style={{ fontSize: 13.5, fontWeight: '700', color, marginTop: 2 }}>{value}</Text>
    </View>
  )
}
