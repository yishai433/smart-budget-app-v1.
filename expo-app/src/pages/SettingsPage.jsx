import { Text } from 'react-native'
import Screen from '../components/Screen'
import Card from '../components/Card'
import { useTheme } from '../theme'

export default function SettingsPage() {
  const c = useTheme()
  return (
    <Screen title="הגדרות">
      <Card><Text style={{ color: c.text2, textAlign: 'right' }}>כאן יעברו ההגדרות (src/pages/SettingsPage.jsx באתר).</Text></Card>
    </Screen>
  )
}
