import { View, Text, ScrollView, StyleSheet, Alert } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Users, LogOut, Palette, Languages, Coins } from 'lucide-react-native'
import { useTheme, radius, Theme } from '../theme'
import { useAuth } from '../context/AuthContext'
import { useData } from '../context/DataContext'
import { useAppearance, AppearancePref } from '../context/AppearanceContext'
import FadeIn from '../components/FadeIn'
import Header from '../components/Header'
import Touchable from '../components/Touchable'

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

export default function SettingsScreen() {
  const c = useTheme()
  const insets = useSafeAreaInsets()
  const { user, logout } = useAuth()
  const d = useData()
  const { pref, setPref } = useAppearance()
  const me = user?.displayName || user?.email?.split('@')[0] || 'אני'
  const names = [me, d.partnerName || ''].filter(Boolean)
  const shared = (d.household?.members?.length || 1) > 1
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
            {!shared && d.household?.inviteCode ? (
              <View style={{ padding: 16, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: c.sep, alignItems: 'flex-end' }}>
                <Text style={{ fontSize: 13, color: c.text2, marginBottom: 6 }}>קוד הזמנה לבן/בת זוג (מצטרפים דרך האתר):</Text>
                <Text style={{ fontSize: 22, fontWeight: '800', letterSpacing: 4, color: c.primary }}>{d.household.inviteCode}</Text>
              </View>
            ) : null}
          </Card>
        </FadeIn>

        <FadeIn delay={240}>
          <Touchable onPress={confirmLogout} style={{ marginTop: 24, borderWidth: 1, borderColor: c.border, borderRadius: radius.lg, backgroundColor: c.card, padding: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            <LogOut size={17} color={c.danger} />
            <Text style={{ fontSize: 15, fontWeight: '600', color: c.danger }}>יציאה מהחשבון</Text>
          </Touchable>
        </FadeIn>

        <FadeIn delay={300}><Text style={{ color: c.text3, fontSize: 12, textAlign: 'center', marginTop: 20 }}>תקציב חכם · React Native</Text></FadeIn>
      </ScrollView>
    </View>
  )
}
const s = StyleSheet.create({ segBtn: { paddingVertical: 8, borderRadius: 999, alignItems: 'center' } })
