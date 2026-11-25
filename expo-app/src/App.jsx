import './i18n'
import { I18nManager } from 'react-native'
import { StatusBar } from 'expo-status-bar'
import { NavigationContainer } from '@react-navigation/native'
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { Wallet, BarChart3, ShoppingCart, Settings } from 'lucide-react-native'
import { useTheme } from './theme'
import BudgetPage from './pages/BudgetPage'
import ReportsPage from './pages/ReportsPage'
import ShoppingPage from './pages/ShoppingPage'
import SettingsPage from './pages/SettingsPage'

// Hebrew app: right-to-left. The first launch after enabling it needs one restart.
if (!I18nManager.isRTL) { I18nManager.allowRTL(true); I18nManager.forceRTL(true) }

const Tab = createBottomTabNavigator()
const TABS = [
  { name: 'Budget', title: 'תקציב', Icon: Wallet, Page: BudgetPage },
  { name: 'Reports', title: 'דוחות', Icon: BarChart3, Page: ReportsPage },
  { name: 'Shopping', title: 'קניות', Icon: ShoppingCart, Page: ShoppingPage },
  { name: 'Settings', title: 'הגדרות', Icon: Settings, Page: SettingsPage },
]

export default function App() {
  const c = useTheme()
  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <Tab.Navigator screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: c.primary, tabBarInactiveTintColor: c.text3,
          tabBarStyle: { backgroundColor: c.bg, borderTopColor: c.sep },
        }}>
          {TABS.map(({ name, title, Icon, Page }) => (
            <Tab.Screen key={name} name={name} component={Page}
              options={{ title, tabBarIcon: ({ color, size }) => <Icon color={color} size={size} /> }} />
          ))}
        </Tab.Navigator>
      </NavigationContainer>
      <StatusBar style="auto" />
    </SafeAreaProvider>
  )
}
