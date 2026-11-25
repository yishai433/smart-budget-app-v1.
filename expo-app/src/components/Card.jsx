import { View, StyleSheet } from 'react-native'
import { useTheme, radius } from '../theme'

export default function Card({ children, style }) {
  const c = useTheme()
  return <View style={[s.card, { backgroundColor: c.card, borderColor: c.border }, style]}>{children}</View>
}
const s = StyleSheet.create({ card: { borderWidth: 1, borderRadius: radius.lg, padding: 16 } })
