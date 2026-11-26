import { View, Text, ScrollView, StyleSheet } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { ScanLine } from 'lucide-react-native'
import { useTheme, radius } from '../theme'
import { useData } from '../context/DataContext'
import { useAuth } from '../context/AuthContext'
import FadeIn from '../components/FadeIn'
import Header from '../components/Header'

export default function ShoppingScreen() {
  const c = useTheme()
  const insets = useSafeAreaInsets()
  const { user } = useAuth()
  const d = useData()
  const names = [user?.displayName || user?.email?.split('@')[0] || 'אני', d.partnerName || ''].filter(Boolean)
  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <ScrollView contentContainerStyle={{ padding: 16, paddingTop: insets.top + 12, paddingBottom: 120 }}>
        <FadeIn><Header title="קניות" names={names} /></FadeIn>
        <FadeIn delay={80}>
          <View style={[s.card, { backgroundColor: c.card, borderColor: c.border }]}>
            <View style={{ width: 54, height: 54, borderRadius: 16, backgroundColor: c.accent2Light, alignItems: 'center', justifyContent: 'center', marginBottom: 14 }}>
              <ScanLine size={26} color={c.accent2Dark} />
            </View>
            <Text style={{ fontSize: 16, fontWeight: '700', color: c.text, textAlign: 'center' }}>רשימת קניות וסריקת ברקוד</Text>
            <Text style={{ fontSize: 14, color: c.text2, textAlign: 'center', marginTop: 8, lineHeight: 21 }}>
              רשימת הקניות המשותפת, סריקת ברקוד והשוואת מחירים בין סניפים יגיעו בשלב הבא, מחוברים לשרת הביתי שלך.
            </Text>
          </View>
        </FadeIn>
      </ScrollView>
    </View>
  )
}
const s = StyleSheet.create({ card: { borderWidth: 1, borderRadius: radius.lg, padding: 24, alignItems: 'center' } })
