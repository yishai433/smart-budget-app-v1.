import { View, Text } from 'react-native'
import { ChevronRight, ChevronLeft } from 'lucide-react-native'
import { useTheme } from '../theme'
import Touchable from './Touchable'

// RTL: right arrow = previous month, left = next (disabled on the current month).
export default function MonthSwitcher() {
  const c = useTheme()
  const arrow = (Icon, disabled) => (
    <Touchable scale={0.9} disabled={disabled}
      style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: c.card, alignItems: 'center', justifyContent: 'center' }}>
      <Icon size={18} color={c.text} strokeWidth={2.2} />
    </Touchable>
  )
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
      {arrow(ChevronRight, false)}
      <View style={{ alignItems: 'center' }}>
        <Text style={{ fontSize: 17, fontWeight: '600', color: c.text }}>נובמבר 2026</Text>
        <Text style={{ fontSize: 11, fontWeight: '600', color: c.primary, marginTop: 1 }}>החודש הנוכחי</Text>
      </View>
      {arrow(ChevronLeft, true)}
    </View>
  )
}
