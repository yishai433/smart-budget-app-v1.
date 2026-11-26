import { useState } from 'react'
import { View, Text, ScrollView, StyleSheet } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Palette, Languages, Coins } from 'lucide-react-native'
import { useTheme, radius } from '../theme'
import FadeIn from '../components/FadeIn'
import Touchable from '../components/Touchable'

function SegRow({ Icon, label, options, value, onPick, first }) {
  const c = useTheme()
  return (
    <View style={[st.row, first ? { borderTopWidth: 0 } : { borderTopColor: c.sep }]}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 }}>
        <Icon size={16} color={c.text2} />
        <Text style={{ fontSize: 14, fontWeight: '600', color: c.text }}>{label}</Text>
      </View>
      <View style={[st.seg, { backgroundColor: c.bg, borderColor: c.border }]}>
        {options.map(([v, lbl]) => {
          const on = v === value
          return (
            <Touchable key={v} onPress={() => onPick(v)} scale={0.96} containerStyle={{ flex: 1 }}
              style={[st.segBtn, on && { backgroundColor: c.card, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 4, shadowOffset: { width: 0, height: 1 }, elevation: 1 }]}>
              <Text style={{ fontSize: 13, fontWeight: '700', color: on ? c.text : c.text2 }}>{lbl}</Text>
            </Touchable>
          )
        })}
      </View>
    </View>
  )
}

export default function SettingsPage() {
  const c = useTheme()
  const insets = useSafeAreaInsets()
  const [appearance, setAppearance] = useState('auto')
  const [lang, setLang] = useState('he')
  const [cur, setCur] = useState('₪')
  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <ScrollView contentContainerStyle={{ padding: 16, paddingTop: insets.top + 12, paddingBottom: 120 }}>
        <FadeIn>
          <Text style={[st.title, { color: c.text }]}>הגדרות</Text>
          <Text style={[st.sub, { color: c.text2 }]}>העדפות</Text>
        </FadeIn>
        <FadeIn delay={80}>
          <View style={[st.card, { backgroundColor: c.card, borderColor: c.border }]}>
            <SegRow Icon={Languages} label="שפה" value={lang} onPick={setLang} first options={[['he', 'עברית'], ['en', 'English']]} />
            <SegRow Icon={Palette} label="מראה" value={appearance} onPick={setAppearance} options={[['light', 'בהיר'], ['dark', 'כהה'], ['auto', 'אוטומטי']]} />
            <SegRow Icon={Coins} label="מטבע" value={cur} onPick={setCur} options={[['₪', '₪'], ['$', '$'], ['€', '€'], ['£', '£']]} />
          </View>
        </FadeIn>
        <FadeIn delay={160}>
          <Text style={{ color: c.text3, fontSize: 12, textAlign: 'center', marginTop: 24 }}>דמו · תקציב חכם · React Native</Text>
        </FadeIn>
      </ScrollView>
    </View>
  )
}
const st = StyleSheet.create({
  title: { fontSize: 30, fontWeight: '800', textAlign: 'right' },
  sub: { fontSize: 13, textAlign: 'right', marginTop: 2, marginBottom: 16 },
  card: { borderWidth: 1, borderRadius: radius.lg, overflow: 'hidden' },
  row: { padding: 14, borderTopWidth: StyleSheet.hairlineWidth },
  seg: { flexDirection: 'row', borderWidth: 1, borderRadius: 999, padding: 3, gap: 2 },
  segBtn: { paddingVertical: 8, borderRadius: 999, alignItems: 'center' },
})
