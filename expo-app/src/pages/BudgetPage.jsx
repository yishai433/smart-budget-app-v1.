import { View, Text, ScrollView, StyleSheet } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Wallet, ArrowUpRight, ArrowDownLeft } from 'lucide-react-native'
import { useTheme, radius } from '../theme'
import { formatAmount } from '../utils/format'
import { CURRENCY as CUR, MONTHLY_BUDGET, CATEGORIES, CATEGORY_BUDGETS, TRANSACTIONS, totals } from '../data/mock'
import Ring from '../components/Ring'
import Bar from '../components/Bar'
import FadeIn from '../components/FadeIn'

const money = (n) => `${n < 0 ? '−' : ''}${formatAmount(Math.abs(n), CUR)}`
const shortDate = (d) => { const x = new Date(d); return `${x.getDate()}.${x.getMonth() + 1}` }

function Hero() {
  const c = useTheme()
  const spent = totals.expenses
  const pct = Math.round((spent / MONTHLY_BUDGET) * 100)
  const over = spent > MONTHLY_BUDGET
  const forecast = Math.round((spent / new Date().getDate()) * new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate())
  return (
    <View style={[s.hero, { backgroundColor: c.ink, shadowColor: '#000' }]}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <View style={{ flex: 1 }}>
          <Text style={[s.overline, { color: c.inkText2 }]}>{over ? 'חרגנו מהתקציב ב' : 'הוצאנו החודש'}</Text>
          <Text style={[s.heroNum, { color: over ? c.danger : c.inkText }]}>
            <Text style={{ fontSize: 24 }}>{over ? '−' : ''}{CUR}</Text>{formatAmount(over ? spent - MONTHLY_BUDGET : spent, '')}
          </Text>
        </View>
        <Ring pct={pct} />
      </View>
      <View style={[s.heroLine, { borderTopColor: c.inkLine }]}>
        <Text style={{ fontSize: 13, color: c.inkText2 }}>
          מתוך תקציב של <Text style={{ color: c.inkText, fontWeight: '700' }}>{money(MONTHLY_BUDGET)}</Text>
        </Text>
      </View>
      <Text style={{ marginTop: 10, fontSize: 13, color: forecast > MONTHLY_BUDGET ? c.danger : c.inkText2, fontWeight: forecast > MONTHLY_BUDGET ? '600' : '500' }}>
        בקצב הנוכחי תסיימו את החודש על <Text style={{ color: forecast > MONTHLY_BUDGET ? c.danger : c.inkText, fontWeight: '700' }}>{money(forecast)}</Text>
      </Text>
    </View>
  )
}

function Kpi({ Icon, label, value, color, tint, iconColor }) {
  const c = useTheme()
  return (
    <View style={[s.kpi, { backgroundColor: c.card, borderColor: c.border }]}>
      <View style={[s.kpiChip, { backgroundColor: tint }]}><Icon size={15} color={iconColor} strokeWidth={2.2} /></View>
      <Text style={[s.kpiLabel, { color: c.text2 }]}>{label}</Text>
      <Text style={[s.kpiValue, { color }]}>{value}</Text>
    </View>
  )
}

function CategoryRow({ id, spent, first, index }) {
  const c = useTheme()
  const cat = CATEGORIES[id]
  const budget = CATEGORY_BUDGETS[id]
  const pct = budget ? Math.round((spent / budget) * 100) : 0
  const over = budget && spent > budget
  return (
    <View style={[s.catRow, first ? null : { borderTopColor: c.sep, borderTopWidth: StyleSheet.hairlineWidth }]}>
      <View style={[s.catIcon, { backgroundColor: cat.color + '22' }]}><Text style={{ fontSize: 17 }}>{cat.emoji}</Text></View>
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 7 }}>
          <Text style={{ fontSize: 14, fontWeight: '600', color: c.text }}>{cat.label}</Text>
          <Text style={{ fontSize: 13, color: over ? c.danger : c.text2 }}>
            {money(spent)}{budget ? <Text style={{ color: c.text3 }}>  /  {money(budget)}</Text> : null}
          </Text>
        </View>
        <Bar pct={pct} color={over ? c.danger : cat.color} track={c.bg} delay={200 + index * 60} />
      </View>
    </View>
  )
}

export default function BudgetPage() {
  const c = useTheme()
  const insets = useSafeAreaInsets()
  const cats = Object.keys({ ...CATEGORY_BUDGETS, ...totals.byCat })
    .map(id => ({ id, spent: totals.byCat[id] || 0 }))
    .sort((a, b) => b.spent - a.spent)
  const txs = [...TRANSACTIONS].sort((a, b) => new Date(b.date) - new Date(a.date))

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <ScrollView contentContainerStyle={{ padding: 16, paddingTop: insets.top + 12, paddingBottom: 120 }} showsVerticalScrollIndicator={false}>
        <FadeIn>
          <Text style={[s.title, { color: c.text }]}>תקציב</Text>
          <Text style={[s.sub, { color: c.text2 }]}>נובמבר 2026 · ישי & טליה</Text>
        </FadeIn>

        <FadeIn delay={60}><Hero /></FadeIn>

        <FadeIn delay={140}>
          <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
            <Kpi Icon={Wallet} label="חיסכון" value={money(totals.saved)} color={c.accent2Dark} tint={c.accent2Light} iconColor={c.accent2Dark} />
            <Kpi Icon={ArrowUpRight} label="הוצאות" value={money(totals.expenses)} color={c.danger} tint={c.bg} iconColor={c.text2} />
            <Kpi Icon={ArrowDownLeft} label="הכנסות" value={money(totals.income)} color={c.accent2Dark} tint={c.accent2Light} iconColor={c.accent2Dark} />
          </View>
        </FadeIn>

        <FadeIn delay={220}>
          <Text style={[s.section, { color: c.text }]}>קטגוריות</Text>
          <View style={[s.card, { backgroundColor: c.card, borderColor: c.border }]}>
            {cats.map((r, i) => <CategoryRow key={r.id} id={r.id} spent={r.spent} first={i === 0} index={i} />)}
          </View>
        </FadeIn>

        <FadeIn delay={300}>
          <Text style={[s.section, { color: c.text }]}>תנועות</Text>
          <View style={[s.card, { backgroundColor: c.card, borderColor: c.border }]}>
            {txs.map((tx, i) => {
              const cat = CATEGORIES[tx.category]
              return (
                <View key={tx.id} style={[s.txRow, i ? { borderTopColor: c.sep, borderTopWidth: StyleSheet.hairlineWidth } : null]}>
                  <View style={[s.catIcon, { backgroundColor: cat.color + '22' }]}><Text style={{ fontSize: 17 }}>{cat.emoji}</Text></View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 14.5, fontWeight: '500', color: c.text }}>{tx.desc}</Text>
                    <Text style={{ fontSize: 12, color: c.text2, marginTop: 2 }}>{cat.label} · {shortDate(tx.date)}</Text>
                  </View>
                  <Text style={{ fontSize: 15, fontWeight: '700', color: tx.type === 'income' ? c.success : c.text }}>
                    {tx.type === 'income' ? '+' : '−'}{formatAmount(tx.amount, CUR)}
                  </Text>
                </View>
              )
            })}
          </View>
        </FadeIn>
      </ScrollView>
    </View>
  )
}

const s = StyleSheet.create({
  title: { fontSize: 30, fontWeight: '800', textAlign: 'right' },
  sub: { fontSize: 13, textAlign: 'right', marginTop: 2, marginBottom: 16 },
  hero: { borderRadius: radius.xl, padding: 20, shadowOpacity: 0.12, shadowRadius: 16, shadowOffset: { width: 0, height: 8 }, elevation: 4 },
  overline: { fontSize: 11, fontWeight: '700', letterSpacing: 0.5, textAlign: 'right' },
  heroNum: { fontSize: 40, fontWeight: '800', textAlign: 'right', marginTop: 6 },
  heroLine: { marginTop: 16, paddingTop: 14, borderTopWidth: 1 },
  kpi: { flex: 1, borderWidth: 1, borderRadius: radius.lg, padding: 12, alignItems: 'flex-end' },
  kpiChip: { width: 28, height: 28, borderRadius: 8, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  kpiLabel: { fontSize: 11, fontWeight: '600' },
  kpiValue: { fontSize: 14, fontWeight: '700', marginTop: 2 },
  section: { fontSize: 17, fontWeight: '700', textAlign: 'right', marginTop: 26, marginBottom: 12 },
  card: { borderWidth: 1, borderRadius: radius.lg, overflow: 'hidden' },
  catRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 },
  catIcon: { width: 38, height: 38, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  txRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 },
})
