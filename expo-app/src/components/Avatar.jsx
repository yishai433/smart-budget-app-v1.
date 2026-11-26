import { View, Text } from 'react-native'

// Two overlapping gradient circles, like the household avatar in the web header.
function Circle({ letter, colors, offset }) {
  return (
    <View style={{
      width: 34, height: 34, borderRadius: 17, marginStart: offset,
      backgroundColor: colors, alignItems: 'center', justifyContent: 'center',
      borderWidth: 2, borderColor: 'rgba(255,255,255,0.85)',
    }}>
      <Text style={{ color: '#fff', fontWeight: '700', fontSize: 14 }}>{letter}</Text>
    </View>
  )
}

export default function Avatar() {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
      <Circle letter="ט" colors="#D98888" offset={0} />
      <Circle letter="י" colors="#6C63FF" offset={-12} />
    </View>
  )
}
