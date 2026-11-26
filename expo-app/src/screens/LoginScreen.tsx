import { useState } from 'react'
import { View, Text, TextInput, ActivityIndicator, StyleSheet, KeyboardAvoidingView, Platform, ScrollView } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Wallet } from 'lucide-react-native'
import { useTheme } from '../theme'
import { useAuth } from '../context/AuthContext'
import Touchable from '../components/Touchable'
import FadeIn from '../components/FadeIn'

const ERRORS: Record<string, string> = {
  'auth/invalid-email': 'כתובת אימייל לא תקינה',
  'auth/invalid-credential': 'אימייל או סיסמה שגויים',
  'auth/wrong-password': 'סיסמה שגויה',
  'auth/user-not-found': 'המשתמש לא נמצא',
  'auth/email-already-in-use': 'האימייל הזה כבר רשום',
  'auth/weak-password': 'הסיסמה צריכה לפחות 6 תווים',
}

export default function LoginScreen() {
  const c = useTheme()
  const insets = useSafeAreaInsets()
  const { login, signup } = useAuth()
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const submit = async () => {
    if (!email || !password) { setError('נא למלא אימייל וסיסמה'); return }
    setBusy(true); setError('')
    try { mode === 'login' ? await login(email, password) : await signup(email, password) }
    catch (e) { setError(ERRORS[(e as { code?: string }).code || ''] || 'משהו השתבש, נסה שוב') }
    finally { setBusy(false) }
  }

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, backgroundColor: c.bg }}>
      <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 24, paddingTop: insets.top }} keyboardShouldPersistTaps="handled">
        <FadeIn>
          <View style={{ alignItems: 'center', marginBottom: 28 }}>
            <View style={{ width: 64, height: 64, borderRadius: 20, backgroundColor: c.primary, alignItems: 'center', justifyContent: 'center' }}>
              <Wallet size={30} color="#fff" strokeWidth={2.2} />
            </View>
            <Text style={{ fontSize: 26, fontWeight: '800', color: c.text, marginTop: 16 }}>תקציב חכם</Text>
            <Text style={{ fontSize: 14, color: c.text2, marginTop: 4 }}>{mode === 'login' ? 'כניסה לחשבון' : 'יצירת חשבון חדש'}</Text>
          </View>
          <View style={{ gap: 12 }}>
            <TextInput style={[s.input, { backgroundColor: c.card, borderColor: c.border, color: c.text }]} placeholder="אימייל" placeholderTextColor={c.text3}
              autoCapitalize="none" keyboardType="email-address" value={email} onChangeText={setEmail} textAlign="right" />
            <TextInput style={[s.input, { backgroundColor: c.card, borderColor: c.border, color: c.text }]} placeholder="סיסמה" placeholderTextColor={c.text3}
              secureTextEntry value={password} onChangeText={setPassword} textAlign="right" />
            {error ? <Text style={{ color: c.danger, fontSize: 13, textAlign: 'center' }}>{error}</Text> : null}
            <Touchable onPress={submit} disabled={busy} style={{ backgroundColor: c.primary, borderRadius: 14, paddingVertical: 15, alignItems: 'center', marginTop: 4 }}>
              {busy ? <ActivityIndicator color="#fff" /> : <Text style={{ color: '#fff', fontWeight: '700', fontSize: 16 }}>{mode === 'login' ? 'כניסה' : 'הרשמה'}</Text>}
            </Touchable>
            <Touchable onPress={() => { setMode(m => m === 'login' ? 'signup' : 'login'); setError('') }} scale={1} style={{ alignItems: 'center', paddingVertical: 8 }}>
              <Text style={{ color: c.text2, fontSize: 14 }}>{mode === 'login' ? 'אין לך חשבון? הרשמה' : 'כבר יש לך חשבון? כניסה'}</Text>
            </Touchable>
          </View>
        </FadeIn>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}
const s = StyleSheet.create({ input: { borderWidth: 1, borderRadius: 14, paddingHorizontal: 16, paddingVertical: 14, fontSize: 16 } })
