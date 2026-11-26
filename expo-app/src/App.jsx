import { I18nManager, Platform } from 'react-native'
import { StatusBar } from 'expo-status-bar'
import { NavigationContainer, DefaultTheme, DarkTheme } from '@react-navigation/native'
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { useColorScheme } from 'react-native'
import { Wallet, BarChart3, ShoppingCart, Settings } from 'lucide-react-native'
import { useTheme } from './theme'
import BudgetPage from './pages/BudgetPage'
import ReportsPage from './pages/ReportsPage'
import ShoppingPage from './pages/ShoppingPage'
import SettingsPage from './pages/SettingsPage'

// Hebrew app → right-to-left. In Expo Go the first launch may need one manual reload
// for RTL to fully apply (a native build does it automatically).
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
  const scheme = useColorScheme()
  const navTheme = {
    ...(scheme === 'dark' ? DarkTheme : DefaultTheme),
    colors: { ...(scheme === 'dark' ? DarkTheme : DefaultTheme).colors, background: c.bg, card: c.bg, text: c.text, border: c.sep, primary: c.primary },
  }
  return (
    <SafeAreaProvider>
      <NavigationContainer theme={navTheme}>
        <Tab.Navigator screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: c.primary,
          tabBarInactiveTintColor: c.text3,
          tabBarStyle: { backgroundColor: c.bg, borderTopColor: c.sep, height: 58 + (Platform.OS === 'ios' ? 20 : 0), paddingTop: 6 },
          tabBarLabelStyle: { fontSize: 11 },
        }}>
          {TABS.map(({ name, title, Icon, Page }) => (
            <Tab.Screen key={name} name={name} component={Page}
              options={{ title, tabBarIcon: ({ color, size }) => <Icon color={color} size={size} /> }} />
          ))}
        </Tab.Navigator>
      </NavigationContainer>
      <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
    </SafeAreaProvider>
  )
}
