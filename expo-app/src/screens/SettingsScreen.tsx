import { View, Text, ScrollView, StyleSheet, Alert } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Users, LogOut } from 'lucide-react-native'
import { useTheme, radius } from '../theme'
import { useAuth } from '../context/AuthContext'
import { useData } from '../context/DataContext'
import FadeIn from '../components/FadeIn'
import Header from '../components/Header'
import Touchable from '../components/Touchable'

export default function SettingsScreen() {
  const c = useTheme()
  const insets = useSafeAreaInsets()
  const { user, logout } = useAuth()
  const d = useData()
  const me = user?.displayName || user?.email?.split('@')[0] || 'אני'
  const names = [me, d.partnerName || ''].filter(Boolean)
  const shared = (d.household?.members?.length || 1) > 1
  const confirmLogout = () => Alert.alert('יציאה', 'להתנתק מהחשבון?', [{ text: 'ביטול', style: 'cancel' }, { text: 'יציאה', style: 'destructive', onPress: () => logout() }])

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <ScrollView contentContainerStyle={{ padding: 16, paddingTop: insets.top + 12, paddingBottom: 120 }}>
        <FadeIn><Header title="הגדרות" names={names} /></FadeIn>

        <FadeIn delay={60}>
          <View style={[s.card, { backgroundColor: c.card, borderColor: c.border, alignItems: 'center', padding: 24 }]}>
            <View style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: c.accent2Light, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ fontSize: 34, fontWeight: '800', color: c.accent2Dark }}>{me.charAt(0).toUpperCase()}</Text>
            </View>
            <Text style={{ fontSize: 19, fontWeight: '700', color: c.text, marginTop: 12 }}>{me}</Text>
            <Text style={{ fontSize: 13, color: c.text2, marginTop: 2 }}>{user?.email}</Text>
          </View>
        </FadeIn>

        <FadeIn delay={120}>
          <Text style={s_title(c)}>חשבון משותף</Text>
          <View style={[s.card, { backgroundColor: c.card, borderColor: c.border, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 12 }]}>
            {shared ? <View style={{ backgroundColor: c.accent2Light, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 }}><Text style={{ fontSize: 11, fontWeight: '700', color: c.accent2Dark }}>פעיל</Text></View> : null}
            <View style={{ flex: 1, alignItems: 'flex-end' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7 }}>
                <Text style={{ fontSize: 15, fontWeight: '700', color: c.text }}>{shared ? `חשבון משותף (${d.household?.members?.length} חברים)` : 'חשבון פרטי'}</Text>
                <Users size={16} color={c.primary} />
              </View>
              <Text style={{ fontSize: 13, color: c.text2, marginTop: 2 }}>{names.join(' · ')}</Text>
            </View>
          </View>
        </FadeIn>

        <FadeIn delay={180}>
          <Touchable onPress={confirmLogout} style={[s.card, { backgroundColor: c.card, borderColor: c.border, padding: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 24 }]}>
            <LogOut size={17} color={c.danger} />
            <Text style={{ fontSize: 15, fontWeight: '600', color: c.danger }}>יציאה מהחשבון</Text>
          </Touchable>
        </FadeIn>

        <FadeIn delay={240}><Text style={{ color: c.text3, fontSize: 12, textAlign: 'center', marginTop: 20 }}>תקציב חכם · React Native · שלב 1</Text></FadeIn>
      </ScrollView>
    </View>
  )
}
import type { Theme } from '../theme'
const s_title = (c: Theme) => ({ fontSize: 12, fontWeight: '700' as const, color: c.text2, letterSpacing: 0.5, textAlign: 'right' as const, marginBottom: 8, marginTop: 24 })
const s = StyleSheet.create({ card: { borderWidth: 1, borderRadius: radius.lg, overflow: 'hidden' } })
