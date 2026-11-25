import { View, Text, ScrollView, StyleSheet } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useTheme } from '../theme'

// Common page frame: background, safe area, big title (like the page headers of the web app).
export default function Screen({ title, children }) {
  const c = useTheme()
  const insets = useSafeAreaInsets()
  return (
    <View style={[s.root, { backgroundColor: c.bg, paddingTop: insets.top + 12 }]}>
      <Text style={[s.title, { color: c.text }]}>{title}</Text>
      <ScrollView contentContainerStyle={s.body} keyboardShouldPersistTaps="handled">{children}</ScrollView>
    </View>
  )
}
const s = StyleSheet.create({
  root: { flex: 1, paddingHorizontal: 20 },
  title: { fontSize: 30, fontWeight: '700', textAlign: 'right', marginBottom: 14 },
  body: { paddingBottom: 120, gap: 14 },
})
