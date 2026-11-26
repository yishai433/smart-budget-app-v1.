import { Platform } from 'react-native'
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

// Hebrew app: every screen aligns text/rows to the right directly in its own styles,
// instead of forcing system-wide RTL (I18nManager.forceRTL). Forcing it would reload the
// host app to apply the change — fine in a standalone build, but inside Expo Go that
// reload kicks you back to the Expo Go home screen, which looks like an instant crash.

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
