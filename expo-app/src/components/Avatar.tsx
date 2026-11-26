import { View, Text } from 'react-native'

const COLORS: Record<string, string> = { '6': '#6C63FF', '5': '#D98888', '4': '#43B89C', '3': '#FF9F40', '2': '#4ECDC4', '1': '#8B85FF', '0': '#6C63FF' }
const colorFor = (s?: string) => COLORS[String((s?.charCodeAt(0) || 0) % 7)] || '#6C63FF'

// One or two overlapping gradient-ish circles with initials (household avatar).
export default function Avatar({ names }: { names: string[] }) {
  const two = names.slice(0, 2)
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
      {two.map((n, i) => (
        <View key={i} style={{
          width: 34, height: 34, borderRadius: 17, marginStart: i ? -12 : 0,
          backgroundColor: colorFor(n + i), alignItems: 'center', justifyContent: 'center',
          borderWidth: 2, borderColor: 'rgba(255,255,255,0.85)',
        }}>
          <Text style={{ color: '#fff', fontWeight: '700', fontSize: 14 }}>{(n || '?').trim().charAt(0).toUpperCase() || '?'}</Text>
        </View>
      ))}
    </View>
  )
}
