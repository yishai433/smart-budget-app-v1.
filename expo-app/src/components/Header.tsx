import { View, Text } from 'react-native'
import { useTheme } from '../theme'
import Avatar from './Avatar'

export default function Header({ title, names }: { title: string; names: string[] }) {
  const c = useTheme()
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
      <Text style={{ fontSize: 26, fontWeight: '800', color: c.text, letterSpacing: -0.3 }}>{title}</Text>
      <Avatar names={names} />
    </View>
  )
}
