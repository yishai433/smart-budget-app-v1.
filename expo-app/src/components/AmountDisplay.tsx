import { View, Text } from 'react-native'
import Caret from './Caret'

// Amount with a blinking caret exactly where the next digit goes.
// Empty: the caret sits at the start of the grey "0" placeholder (like a text field).
// Typed: the caret sits right after the last digit. Layout is forced LTR so the order is stable.
export default function AmountDisplay({ value, currency, size, curSize, c, caretHeight }: {
  value: string; currency: string; size: number; curSize: number; c: any; caretHeight: number
}) {
  const empty = value === ''
  return (
    <View style={{ flexDirection: 'row', direction: 'ltr', alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ fontSize: curSize, fontWeight: '700', color: c.text3, marginRight: 6 }}>{currency}</Text>
      {empty && <Caret color={c.primary} height={caretHeight} />}
      <Text style={{ fontSize: size, fontWeight: '800', color: empty ? c.text3 : c.text }}>{empty ? '0' : value}</Text>
      {!empty && <Caret color={c.primary} height={caretHeight} />}
    </View>
  )
}
