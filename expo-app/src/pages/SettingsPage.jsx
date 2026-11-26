import { useRef, useState } from 'react'
import { View, Text, ScrollView, Animated, StyleSheet } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Palette, Languages, Coins, Bell, Users, Store, Pencil } from 'lucide-react-native'
import { useTheme, radius } from '../theme'
import FadeIn from '../components/FadeIn'
import Header from '../components/Header'
import Touchable from '../components/Touchable'

function SectionTitle({ children }) {
  const c = useTheme()
  return <Text style={{ fontSize: 12, fontWeight: '700', color: c.text2, letterSpacing: 0.5, textAlign: 'right', marginBottom: 8, marginTop: 24 }}>{children}</Text>
}

function Card({ children }) {
  const c = useTheme()
  return <View style={{ borderWidth: 1, borderColor: c.border, borderRadius: radius.lg, backgroundColor: c.card, overflow: 'hidden' }}>{children}</View>
}

function SegRow({ Icon, label, options, value, onPick, first }) {
  const c = useTheme()
  return (
    <View style={{ padding: 14, borderTopWidth: first ? 0 : StyleSheet.hairlineWidth, borderTopColor: c.sep }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10, justifyContent: 'flex-end' }}>
        <Text style={{ fontSize: 14, fontWeight: '600', color: c.text }}>{label}</Text>
        <Icon size={16} color={c.text2} />
      </View>
      <View style={{ flexDirection: 'row', backgroundColor: c.bg, borderWidth: 1, borderColor: c.border, borderRadius: 999, padding: 3, gap: 2 }}>
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

function Switch({ on, onToggle }) {
  const c = useTheme()
  const a = useRef(new Animated.Value(on ? 1 : 0)).current
  const toggle = () => { Animated.spring(a, { toValue: on ? 0 : 1, useNativeDriver: false, speed: 16, bounciness: 4 }).start(); onToggle() }
  const bg = a.interpolate({ inputRange: [0, 1], outputRange: [c.border, c.accent2Dark] })
  const x = a.interpolate({ inputRange: [0, 1], outputRange: [2, 22] })
  return (
    <Touchable onPress={toggle} scale={1}>
      <Animated.View style={{ width: 46, height: 28, borderRadius: 999, backgroundColor: bg, justifyContent: 'center' }}>
        <Animated.View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: '#fff', transform: [{ translateX: x }], shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 2, shadowOffset: { width: 0, height: 1 }, elevation: 2 }} />
      </Animated.View>
    </Touchable>
  )
}

function ToggleRow({ Icon, title, sub, on, onToggle }) {
  const c = useTheme()
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', padding: 16, gap: 12 }}>
      <Switch on={on} onToggle={onToggle} />
      <View style={{ flex: 1, alignItems: 'flex-end' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7 }}>
          <Text style={{ fontSize: 15, fontWeight: '600', color: c.text }}>{title}</Text>
          <Icon size={16} color={c.text2} />
        </View>
        {sub ? <Text style={{ fontSize: 12, color: c.text2, marginTop: 2 }}>{sub}</Text> : null}
      </View>
    </View>
  )
}

export default function SettingsPage() {
  const c = useTheme()
  const insets = useSafeAreaInsets()
  const [appearance, setAppearance] = useState('light')
  const [lang, setLang] = useState('he')
  const [cur, setCur] = useState('₪')
  const [notif, setNotif] = useState(true)

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <ScrollView contentContainerStyle={{ padding: 16, paddingTop: insets.top + 12, paddingBottom: 120 }} showsVerticalScrollIndicator={false}>
        <FadeIn><Header title="הגדרות" /></FadeIn>

        {/* Profile card */}
        <FadeIn delay={60}>
          <Card>
            <View style={{ alignItems: 'center', padding: 24 }}>
              <View style={{ width: 90, height: 90, borderRadius: 45, backgroundColor: c.accent2Light, alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ fontSize: 40 }}>🧑🏽</Text>
                <View style={{ position: 'absolute', bottom: 2, right: 2, width: 30, height: 30, borderRadius: 15, backgroundColor: c.primary, alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: c.card }}>
                  <Pencil size={13} color="#fff" strokeWidth={2.5} />
                </View>
              </View>
              <Text style={{ fontSize: 19, fontWeight: '700', color: c.text, marginTop: 12 }}>ישי אביטל</Text>
              <Text style={{ fontSize: 13, color: c.text2, marginTop: 2 }}>yishai560@gmail.com</Text>
            </View>
          </Card>
        </FadeIn>

        {/* Preferences */}
        <FadeIn delay={120}>
          <SectionTitle>העדפות</SectionTitle>
          <Card>
            <SegRow Icon={Languages} label="שפה" value={lang} onPick={setLang} first options={[['he', 'עברית'], ['en', 'English']]} />
            <SegRow Icon={Palette} label="מראה" value={appearance} onPick={setAppearance} options={[['light', 'בהיר'], ['dark', 'כהה'], ['auto', 'אוטומטי']]} />
            <SegRow Icon={Coins} label="מטבע" value={cur} onPick={setCur} options={[['₪', '₪'], ['$', '$'], ['€', '€'], ['£', '£']]} />
          </Card>
        </FadeIn>

        {/* Notifications */}
        <FadeIn delay={180}>
          <SectionTitle>התראות</SectionTitle>
          <Card>
            <ToggleRow Icon={Bell} title="קבלת התראות" sub="במכשיר הזה, גם כשהאפליקציה סגורה" on={notif} onToggle={() => setNotif(v => !v)} />
          </Card>
        </FadeIn>

        {/* Shared household */}
        <FadeIn delay={240}>
          <SectionTitle>חשבון משותף</SectionTitle>
          <Card>
            <View style={{ flexDirection: 'row', alignItems: 'center', padding: 16, gap: 12 }}>
              <View style={{ backgroundColor: c.accent2Light, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 }}>
                <Text style={{ fontSize: 11, fontWeight: '700', color: c.accent2Dark }}>פעיל</Text>
              </View>
              <View style={{ flex: 1, alignItems: 'flex-end' }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7 }}>
                  <Text style={{ fontSize: 15, fontWeight: '700', color: c.text }}>חשבון משותף (2 חברים)</Text>
                  <Users size={16} color={c.primary} />
                </View>
                <Text style={{ fontSize: 13, color: c.text2, marginTop: 2 }}>ישי אביטל · טליה אביטל</Text>
              </View>
            </View>
          </Card>
        </FadeIn>

        {/* Price branches */}
        <FadeIn delay={300}>
          <SectionTitle>סניפים להשוואת מחירים</SectionTitle>
          <Card>
            <View style={{ padding: 16, gap: 10 }}>
              {['שופרסל דיל חצור הגלילית', 'רמי לוי ראש העין'].map(name => (
                <View key={name} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 10 }}>
                  <Text style={{ fontSize: 14, color: c.text }}>{name}</Text>
                  <Store size={16} color={c.primary} />
                </View>
              ))}
              <Touchable style={{ backgroundColor: c.bg, borderWidth: 1, borderColor: c.border, borderRadius: radius.md, paddingVertical: 12, alignItems: 'center', marginTop: 4 }}>
                <Text style={{ fontSize: 14, fontWeight: '600', color: c.text }}>בחירת סניפים לפי עיר</Text>
              </Touchable>
            </View>
          </Card>
        </FadeIn>

        <FadeIn delay={360}>
          <Text style={{ color: c.text3, fontSize: 12, textAlign: 'center', marginTop: 24 }}>דמו · תקציב חכם · React Native</Text>
        </FadeIn>
      </ScrollView>
    </View>
  )
}
const s = StyleSheet.create({
  segBtn: { paddingVertical: 8, borderRadius: 999, alignItems: 'center' },
})
