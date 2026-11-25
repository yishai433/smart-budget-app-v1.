import { Text } from 'react-native'
import Screen from '../components/Screen'
import Card from '../components/Card'
import { useTheme } from '../theme'

export default function ReportsPage() {
  const c = useTheme()
  return (
    <Screen title="דוחות">
      <Card><Text style={{ color: c.text2, textAlign: 'right' }}>כאן יעברו הדוחות (src/pages/ReportsPage.jsx באתר).</Text></Card>
    </Screen>
  )
}
