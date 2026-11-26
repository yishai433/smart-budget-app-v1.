import { View, Text } from 'react-native'
import { ChevronRight, ChevronLeft } from 'lucide-react-native'
import { useTheme } from '../theme'
import Touchable from './Touchable'
import { monthLabel } from '../lib/month'

interface Props { monthKey: string; isCurrentMonth: boolean; onPrev: () => void; onNext: () => void; onToday: () => void }
export default function MonthSwitcher({ monthKey, isCurrentMonth, onPrev, onNext, onToday }: Props) {
  const c = useTheme()
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
      <Touchable scale={0.9} onPress={onPrev} style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: c.card, alignItems: 'center', justifyContent: 'center' }}>
        <ChevronRight size={18} color={c.text} strokeWidth={2.2} />
      </Touchable>
      <Touchable scale={0.96} onPress={isCurrentMonth ? undefined : onToday} disabled={isCurrentMonth} style={{ alignItems: 'center' }}>
        <Text style={{ fontSize: 17, fontWeight: '600', color: c.text }}>{monthLabel(monthKey)}</Text>
        <Text style={{ fontSize: 11, fontWeight: '600', color: c.primary, marginTop: 1 }}>{isCurrentMonth ? 'החודש הנוכחי' : 'חזרה להיום'}</Text>
      </Touchable>
      <Touchable scale={0.9} onPress={onNext} disabled={isCurrentMonth} style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: c.card, alignItems: 'center', justifyContent: 'center' }}>
        <ChevronLeft size={18} color={c.text} strokeWidth={2.2} />
      </Touchable>
    </View>
  )
}
