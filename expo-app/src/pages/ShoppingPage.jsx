import { Text } from 'react-native'
import Screen from '../components/Screen'
import Card from '../components/Card'
import { useTheme } from '../theme'

export default function ShoppingPage() {
  const c = useTheme()
  return (
    <Screen title="קניות">
      <Card>
        <Text style={{ color: c.text2, textAlign: 'right' }}>
          כאן תעבור רשימת הקניות, סריקת ברקוד (expo-camera) והשוואת הסל. הלוגיקה של החיפוש והמחירים תעבור כמו שהיא מ-src/utils/priceIndex.js באתר.
        </Text>
      </Card>
    </Screen>
  )
}
