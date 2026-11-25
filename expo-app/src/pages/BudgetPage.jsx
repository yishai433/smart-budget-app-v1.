import { Text } from 'react-native'
import Screen from '../components/Screen'
import Card from '../components/Card'
import { useTheme } from '../theme'

export default function BudgetPage() {
  const c = useTheme()
  return (
    <Screen title="תקציב">
      <Card><Text style={{ color: c.text2, textAlign: 'right' }}>כאן יעבור מסך התקציב (src/pages/BudgetPage.jsx באתר).</Text></Card>
    </Screen>
  )
}
