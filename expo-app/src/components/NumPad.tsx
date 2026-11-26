import { memo } from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { Delete } from 'lucide-react-native'
import { useTheme, Theme } from '../theme'
import Touchable from './Touchable'

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0', 'back']

// Pure helper so every amount field applies the same input rules.
export function applyKey(prev: string, k: string): string {
  if (k === 'back') return prev.slice(0, -1)
  if (k === '.') { if (prev.includes('.')) return prev; return prev === '' ? '0.' : prev + '.' }
  const next = prev === '0' ? k : prev + k
  if (next.includes('.')) { const dec = next.split('.')[1]; if (dec && dec.length > 2) return prev }
  if (next.replace('.', '').length > 9) return prev
  return next
}

const Key = memo(function Key({ label, onPress, c }: { label: string; onPress: (k: string) => void; c: Theme }) {
  return (
    <Touchable scale={0.9} onPress={() => onPress(label)} containerStyle={s.cell} style={[s.key, { backgroundColor: c.bg }]}>
      {label === 'back' ? <Delete size={24} color={c.text2} /> : <Text style={{ fontSize: 26, fontWeight: '600', color: c.text }}>{label}</Text>}
    </Touchable>
  )
})

// Our own themed number pad — no OS keyboard, so amount entry stays inside the design.
export default function NumPad({ onKey }: { onKey: (k: string) => void }) {
  const c = useTheme()
  return <View style={s.pad}>{KEYS.map(k => <Key key={k} label={k} onPress={onKey} c={c} />)}</View>
}

const s = StyleSheet.create({
  pad: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 7 },
  cell: { width: '31.5%' },
  key: { height: 46, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
})
