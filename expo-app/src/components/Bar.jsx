import { View } from 'react-native'

// Thin progress bar for a category (spent vs its budget).
export default function Bar({ pct, color, track }) {
  const w = Math.max(0, Math.min(100, pct))
  return (
    <View style={{ height: 6, borderRadius: 999, backgroundColor: track, overflow: 'hidden' }}>
      <View style={{ width: `${w}%`, height: '100%', borderRadius: 999, backgroundColor: color }} />
    </View>
  )
}
