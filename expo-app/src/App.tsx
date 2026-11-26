import { View, Text, ActivityIndicator, useColorScheme } from 'react-native'
import { StatusBar } from 'expo-status-bar'
import { NavigationContainer, DefaultTheme, DarkTheme } from '@react-navigation/native'
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { Wallet, BarChart3, ShoppingCart, Settings } from 'lucide-react-native'
import { useTheme } from './theme'
import { firebaseReady } from './firebase'
import { AuthProvider, useAuth } from './context/AuthContext'
import { DataProvider } from './context/DataContext'
import TabBar from './components/TabBar'
import LoginScreen from './screens/LoginScreen'
import BudgetScreen from './screens/BudgetScreen'
import ReportsScreen from './screens/ReportsScreen'
import ShoppingScreen from './screens/ShoppingScreen'
import SettingsScreen from './screens/SettingsScreen'

const Tab = createBottomTabNavigator()
// Left→right; RTL layout puts Budget rightmost, so it's last.
const TABS = [
  { name: 'Settings', title: 'הגדרות', Icon: Settings, Page: SettingsScreen },
  { name: 'Shopping', title: 'קניות', Icon: ShoppingCart, Page: ShoppingScreen },
  { name: 'Reports', title: 'דוחות', Icon: BarChart3, Page: ReportsScreen },
  { name: 'Budget', title: 'תקציב', Icon: Wallet, Page: BudgetScreen },
]

function Tabs() {
  return (
    <Tab.Navigator initialRouteName="Budget" tabBar={props => <TabBar {...props} />} screenOptions={{ headerShown: false, animation: 'fade' }}>
      {TABS.map(({ name, title, Icon, Page }) => (
        <Tab.Screen key={name} name={name} component={Page}
          options={{ title, tabBarIcon: ({ color, size }) => <Icon color={color} size={size} /> }} />
      ))}
    </Tab.Navigator>
  )
}

function Gate() {
  const c = useTheme()
  const { user, loading } = useAuth()
  if (loading) return <View style={{ flex: 1, backgroundColor: c.bg, alignItems: 'center', justifyContent: 'center' }}><ActivityIndicator color={c.primary} size="large" /></View>
  if (!user) return <LoginScreen />
  return <DataProvider><Tabs /></DataProvider>
}

function MissingConfig() {
  const c = useTheme()
  return (
    <View style={{ flex: 1, backgroundColor: c.bg, alignItems: 'center', justifyContent: 'center', padding: 28 }}>
      <Text style={{ fontSize: 18, fontWeight: '700', color: c.text, textAlign: 'center' }}>חסרות הגדרות Firebase</Text>
      <Text style={{ fontSize: 14, color: c.text2, textAlign: 'center', marginTop: 10, lineHeight: 21 }}>
        צריך למלא את מפתחות Firebase בקובץ expo-app/.env (לפי .env.example) ולהפעיל מחדש את השרת.
      </Text>
    </View>
  )
}

export default function App() {
  const scheme = useColorScheme()
  const c = useTheme()
  const navTheme = {
    ...(scheme === 'dark' ? DarkTheme : DefaultTheme),
    colors: { ...(scheme === 'dark' ? DarkTheme : DefaultTheme).colors, background: c.bg, card: c.bg, text: c.text, border: c.sep, primary: c.primary },
  }
  return (
    <SafeAreaProvider>
      <NavigationContainer theme={navTheme}>
        {firebaseReady ? <AuthProvider><Gate /></AuthProvider> : <MissingConfig />}
      </NavigationContainer>
      <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
    </SafeAreaProvider>
  )
}
