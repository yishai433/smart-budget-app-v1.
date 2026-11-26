import { StatusBar } from 'expo-status-bar'
import { NavigationContainer, DefaultTheme, DarkTheme } from '@react-navigation/native'
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { useColorScheme } from 'react-native'
import TabBar from './components/TabBar'
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
// Order left→right. RTL web layout puts Budget rightmost, so it's last here.
const TABS = [
  { name: 'Settings', title: 'הגדרות', Icon: Settings, Page: SettingsPage },
  { name: 'Shopping', title: 'קניות', Icon: ShoppingCart, Page: ShoppingPage },
  { name: 'Reports', title: 'דוחות', Icon: BarChart3, Page: ReportsPage },
  { name: 'Budget', title: 'תקציב', Icon: Wallet, Page: BudgetPage },
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
        <Tab.Navigator
          initialRouteName="Budget"
          tabBar={props => <TabBar {...props} />}
          screenOptions={{ headerShown: false, animation: 'fade' }}>
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
