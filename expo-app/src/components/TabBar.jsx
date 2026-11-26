import { useRef, useEffect } from 'react'
import { View, Text, Pressable, Animated } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useTheme } from '../theme'

// Custom bottom nav matching the web app: the active tab sits inside a rounded
// pill (accent-green tint) that springs into place when you switch tabs.
export default function TabBar({ state, descriptors, navigation }) {
  const c = useTheme()
  const insets = useSafeAreaInsets()
  return (
    <View style={{
      flexDirection: 'row', backgroundColor: c.card, borderTopWidth: 1, borderTopColor: c.border,
      paddingBottom: insets.bottom, paddingHorizontal: 8, paddingTop: 6,
    }}>
      {state.routes.map((route, i) => {
        const { options } = descriptors[route.key]
        const focused = state.index === i
        const onPress = () => {
          const e = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true })
          if (!focused && !e.defaultPrevented) navigation.navigate(route.name)
        }
        return <Item key={route.key} focused={focused} onPress={onPress}
          Icon={options.tabBarIcon} label={options.title} c={c} />
      })}
    </View>
  )
}

function Item({ focused, onPress, Icon, label, c }) {
  const a = useRef(new Animated.Value(focused ? 1 : 0)).current
  useEffect(() => {
    Animated.spring(a, { toValue: focused ? 1 : 0, useNativeDriver: true, speed: 20, bounciness: 6 }).start()
  }, [focused])
  const color = focused ? c.accent2Dark : c.text3
  return (
    <Pressable onPress={onPress} style={{ flex: 1, alignItems: 'center', justifyContent: 'center', height: 54 }}>
      <Animated.View style={{
        position: 'absolute', top: 4, bottom: 4, left: 6, right: 6, borderRadius: 999,
        backgroundColor: c.accent2Light, opacity: a, transform: [{ scale: a.interpolate({ inputRange: [0, 1], outputRange: [0.8, 1] }) }],
      }} />
      <View style={{ alignItems: 'center', gap: 3 }}>
        {Icon({ color, size: 23 })}
        <Text style={{ fontSize: 11, fontWeight: '600', color }}>{label}</Text>
      </View>
    </Pressable>
  )
}
