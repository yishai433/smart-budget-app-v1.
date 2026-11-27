import { useState } from 'react'
import { View, Text, ScrollView, StyleSheet, Alert, TextInput, ActivityIndicator } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Users, LogOut, Palette, Languages, Coins, UserPlus, LogIn, CalendarDays, History, ChevronLeft, PiggyBank } from 'lucide-react-native'
import { useTheme, radius, Theme } from '../theme'
import { useAuth } from '../context/AuthContext'
import { useData, IncomeMonthMode } from '../context/DataContext'
import { useAppearance, AppearancePref } from '../context/AppearanceContext'
import FadeIn from '../components/FadeIn'
import Header from '../components/Header'
import Touchable from '../components/Touchable'
import ActivitySheet from '../components/ActivitySheet'

function SectionTitle({ children }: { children: string }) {
  const c = useTheme()
  return <Text style={{ fontSize: 12, fontWeight: '700', color: c.text2, letterSpacing: 0.5, textAlign: 'right', marginBottom: 8, marginTop: 24 }}>{children}</Text>
}
function Card({ children }: { children: React.ReactNode }) {
  const c = useTheme()
  return <View style={{ borderWidth: 1, borderColor: c.border, borderRadius: radius.lg, backgroundColor: c.card, overflow: 'hidden' }}>{children}</View>
}

function SegRow<T extends string>({ Icon, label, options, value, onPick, first }: { Icon: typeof Palette; label: string; options: [T, string][]; value: T; onPick: (v: T) => void; first?: boolean }) {
  const c = useTheme()
  return (
    <View style={{ padding: 14, borderTopWidth: first ? 0 : StyleSheet.hairlineWidth, borderTopColor: c.sep }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10, justifyContent: 'flex-end' }}>
        <Text style={{ fontSize: 14, fontWeight: '600', color: c.text }}>{label}</Text>
        <Icon size={16} color={c.text2} />
      </View>
      <View style={{ flexDirection: 'row-reverse', backgroundColor: c.bg, borderWidth: 1, borderColor: c.border, borderRadius: 999, padding: 3, gap: 2 }}>
        {options.map(([v, lbl]) => {
          const on = v === value
          return (
            <Touchable key={v} onPress={() => onPick(v)} scale={0.96} containerStyle={{ flex: 1 }}
              style={[s.segBtn, on && { backgroundColor: c.card, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 4, shadowOffset: { width: 0, height: 1 }, elevation: 1 }]}>
              <Text style={{ fontSize: 13, fontWeight: '700', color: on ? c.text : c.text2 }}>{lbl}</Text>
            </Touchable>
          )
        })}
      </View>
    </View>
  )
}

function ShareJoin() {
  const c = useTheme()
  const d = useData()
  const [code, setCode] = useState<string | null>(null)
  const [busyInvite, setBusyInvite] = useState(false)
  const [join, setJoin] = useState('')
  const [joinMsg, setJoinMsg] = useState('')
  const [busyJoin, setBusyJoin] = useState(false)

  const makeCode = async () => { setBusyInvite(true); try { const r = await d.createInvite(); setCode(r.code) } catch { setJoinMsg('יצירת הקוד נכשלה') } finally { setBusyInvite(false) } }
  const doJoin = async () => {
    if (join.trim().length < 4) return
    setBusyJoin(true); setJoinMsg('')
    const res = await d.joinByCode(join.trim())
    setBusyJoin(false)
    if (res === 'ok') { setJoinMsg('הצטרפת בהצלחה! הנתונים משותפים כעת.'); setJoin('') }
    else setJoinMsg(res === 'used' ? 'הקוד כבר נוצל' : res === 'expired' ? 'הקוד פג תוקף' : res === 'self' ? 'זה הקוד שלך' : 'קוד לא נמצא')
  }

  return (
    <View style={{ marginTop: 10, gap: 10 }}>
      <View style={{ borderWidth: 1, borderColor: c.border, borderRadius: radius.lg, backgroundColor: c.card, padding: 16 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, justifyContent: 'flex-end', marginBottom: 10 }}>
          <Text style={{ fontSize: 15, fontWeight: '700', color: c.text }}>הזמן בן/בת זוג</Text>
          <UserPlus size={16} color={c.primary} />
        </View>
        {code ? (
          <View style={{ alignItems: 'center', paddingVertical: 6 }}>
            <Text style={{ fontSize: 30, fontWeight: '800', letterSpacing: 6, color: c.primary }}>{code}</Text>
            <Text style={{ fontSize: 12, color: c.text2, marginTop: 6 }}>תקף 24 שעות · הזן אותו במכשיר של בן/בת הזוג</Text>
          </View>
        ) : (
          <Touchable onPress={makeCode} disabled={busyInvite} style={{ backgroundColor: c.bg, borderWidth: 1, borderColor: c.border, borderRadius: radius.md, paddingVertical: 12, alignItems: 'center' }}>
            {busyInvite ? <ActivityIndicator color={c.primary} /> : <Text style={{ color: c.text, fontWeight: '600' }}>צור קוד הזמנה</Text>}
          </Touchable>
        )}
      </View>

      <View style={{ borderWidth: 1, borderColor: c.border, borderRadius: radius.lg, backgroundColor: c.card, padding: 16 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, justifyContent: 'flex-end', marginBottom: 10 }}>
          <Text style={{ fontSize: 15, fontWeight: '700', color: c.text }}>הצטרף לחשבון</Text>
          <LogIn size={16} color={c.text2} />
        </View>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <TextInput style={{ flex: 1, backgroundColor: c.bg, borderWidth: 1, borderColor: c.border, borderRadius: radius.md, height: 46, textAlign: 'center', fontSize: 18, fontWeight: '800', letterSpacing: 3, color: c.text }}
            placeholder="ABCD2345" placeholderTextColor={c.text3} autoCapitalize="characters" value={join} onChangeText={t => { setJoin(t.toUpperCase()); setJoinMsg('') }} maxLength={8} />
          <Touchable onPress={doJoin} disabled={join.trim().length < 4 || busyJoin} style={{ paddingHorizontal: 20, borderRadius: radius.md, backgroundColor: c.primary, alignItems: 'center', justifyContent: 'center', opacity: join.trim().length < 4 ? 0.4 : 1 }}>
            {busyJoin ? <ActivityIndicator color="#fff" /> : <Text style={{ color: '#fff', fontWeight: '700' }}>הצטרף</Text>}
          </Touchable>
        </View>
        {joinMsg ? <Text style={{ fontSize: 13, color: joinMsg.includes('בהצלחה') ? c.success : c.danger, marginTop: 10, textAlign: 'center' }}>{joinMsg}</Text> : null}
      </View>
    </View>
  )
}

export default function SettingsScreen() {
  const c = useTheme()
  const insets = useSafeAreaInsets()
  const { user, logout } = useAuth()
  const d = useData()
  const { pref, setPref, showSavings, setShowSavings } = useAppearance()
  const me = user?.displayName || user?.email?.split('@')[0] || 'אני'
  const names = [me, d.partnerName || ''].filter(Boolean)
  const shared = (d.household?.members?.length || 1) > 1
  const [historyOpen, setHistoryOpen] = useState(false)
  const confirmLogout = () => Alert.alert('יציאה', 'להתנתק מהחשבון?', [{ text: 'ביטול', style: 'cancel' }, { text: 'יציאה', style: 'destructive', onPress: () => logout() }])

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <ScrollView contentContainerStyle={{ padding: 16, paddingTop: insets.top + 12, paddingBottom: 120 }} showsVerticalScrollIndicator={false}>
        <FadeIn><Header title="הגדרות" names={names} /></FadeIn>

        <FadeIn delay={60}>
          <Card>
            <View style={{ alignItems: 'center', padding: 24 }}>
              <View style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: c.accent2Light, alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ fontSize: 34, fontWeight: '800', color: c.accent2Dark }}>{me.charAt(0).toUpperCase()}</Text>
              </View>
              <Text style={{ fontSize: 19, fontWeight: '700', color: c.text, marginTop: 12 }}>{me}</Text>
              <Text style={{ fontSize: 13, color: c.text2, marginTop: 2 }}>{user?.email}</Text>
            </View>
          </Card>
        </FadeIn>

        <FadeIn delay={120}>
          <SectionTitle>העדפות</SectionTitle>
          <Card>
            <SegRow<string> first Icon={Coins} label="מטבע" value={d.currency} onPick={(v) => d.setCurrency(v)} options={[['₪', '₪'], ['$', '$'], ['€', '€'], ['£', '£']]} />
            <SegRow<AppearancePref> Icon={Palette} label="מראה" value={pref} onPick={setPref} options={[['light', 'בהיר'], ['dark', 'כהה'], ['auto', 'אוטומטי']]} />
            <SegRow<string> Icon={Languages} label="שפה" value="he" onPick={() => {}} options={[['he', 'עברית']]} />
            <SegRow<string> Icon={PiggyBank} label="יעדי חיסכון בעמוד התקציב" value={showSavings ? 'on' : 'off'} onPick={(v) => setShowSavings(v === 'on')} options={[['off', 'מוסתר'], ['on', 'מוצג']]} />
          </Card>

          <SectionTitle>משכורת</SectionTitle>
          <Card>
            <SegRow<string> first Icon={CalendarDays} label="הכנסה שנכנסת ב-1 עד 15 לחודש שייכת ל" value={d.incomeMonthMode || ''}
              onPick={(v) => d.setIncomeMonthMode(v as IncomeMonthMode)} options={[['previous', 'החודש הקודם'], ['received', 'החודש שבו נכנסה']]} />
            <Text style={{ fontSize: 12, color: c.text2, textAlign: 'right', paddingHorizontal: 14, paddingBottom: 14, lineHeight: 18 }}>
              למשל משכורת של אוקטובר שנכנסת ב-10 בנובמבר. אפשר תמיד לשנות לתנועה מסוימת בלחיצה על החודש בחלון ההוספה.
            </Text>
          </Card>
        </FadeIn>

        <FadeIn delay={180}>
          <SectionTitle>חשבון משותף</SectionTitle>
          <Card>
            <View style={{ padding: 16, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              {shared ? <View style={{ backgroundColor: c.accent2Light, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 }}><Text style={{ fontSize: 11, fontWeight: '700', color: c.accent2Dark }}>פעיל</Text></View> : null}
              <View style={{ flex: 1, alignItems: 'flex-end' }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7 }}>
                  <Text style={{ fontSize: 15, fontWeight: '700', color: c.text }}>{shared ? `חשבון משותף (${d.household?.members?.length} חברים)` : 'חשבון פרטי'}</Text>
                  <Users size={16} color={c.primary} />
                </View>
                <Text style={{ fontSize: 13, color: c.text2, marginTop: 2 }}>{names.join(' · ')}</Text>
              </View>
            </View>
          </Card>
          {!shared ? <ShareJoin /> : null}
          <View style={{ marginTop: 10 }}><Card>
            <Touchable onPress={() => setHistoryOpen(true)} scale={0.98} style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 12, padding: 16 }}>
              <View style={{ width: 34, height: 34, borderRadius: 10, backgroundColor: c.primaryLight, alignItems: 'center', justifyContent: 'center' }}><History size={17} color={c.primary} /></View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 15, fontWeight: '700', color: c.text, textAlign: 'right' }}>מה השתנה בבית</Text>
                <Text style={{ fontSize: 12.5, color: c.text2, textAlign: 'right', marginTop: 2 }}>
                  {d.activity.length ? `${d.activity.length} שינויים ב-30 הימים האחרונים` : 'הוצאות, הכנסות, תקציב וחיסכון: מי שינה מה'}
                </Text>
              </View>
              {d.unseenActivity.length ? <View style={{ minWidth: 22, height: 22, borderRadius: 11, backgroundColor: c.primary, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6 }}><Text style={{ color: '#fff', fontSize: 12, fontWeight: '800' }}>{d.unseenActivity.length}</Text></View> : null}
              <ChevronLeft size={18} color={c.text3} />
            </Touchable>
          </Card></View>
        </FadeIn>

        <FadeIn delay={240}>
          <Touchable onPress={confirmLogout} style={{ marginTop: 24, borderWidth: 1, borderColor: c.border, borderRadius: radius.lg, backgroundColor: c.card, padding: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            <LogOut size={17} color={c.danger} />
            <Text style={{ fontSize: 15, fontWeight: '600', color: c.danger }}>יציאה מהחשבון</Text>
          </Touchable>
        </FadeIn>

        <FadeIn delay={300}><Text style={{ color: c.text3, fontSize: 12, textAlign: 'center', marginTop: 20 }}>תקציב חכם · React Native</Text></FadeIn>
      </ScrollView>
      <ActivitySheet visible={historyOpen} onClose={() => setHistoryOpen(false)} />
    </View>
  )
}
const s = StyleSheet.create({ segBtn: { paddingVertical: 8, borderRadius: 999, alignItems: 'center' } })
