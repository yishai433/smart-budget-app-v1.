import { useRef, useEffect } from 'react'
import { View, Text, Pressable, Animated } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs'
import { useTheme, Theme } from '../theme'

export default function TabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const c = useTheme()
  const insets = useSafeAreaInsets()
  return (
    <View style={{ flexDirection: 'row', backgroundColor: c.card, borderTopWidth: 1, borderTopColor: c.border, paddingBottom: insets.bottom, paddingHorizontal: 8, paddingTop: 6 }}>
      {state.routes.map((route, i) => {
        const { options } = descriptors[route.key]
        const focused = state.index === i
        const onPress = () => {
          const e = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true })
          if (!focused && !e.defaultPrevented) navigation.navigate(route.name)
        }
        const Icon = options.tabBarIcon
        return <Item key={route.key} focused={focused} onPress={onPress} label={String(options.title ?? route.name)} c={c}
          icon={Icon ? Icon({ focused, color: focused ? c.accent2Dark : c.text3, size: 23 }) : null} />
      })}
    </View>
  )
}

function Item({ focused, onPress, icon, label, c }: { focused: boolean; onPress: () => void; icon: React.ReactNode; label: string; c: Theme }) {
  const a = useRef(new Animated.Value(focused ? 1 : 0)).current
  useEffect(() => { Animated.spring(a, { toValue: focused ? 1 : 0, useNativeDriver: true, speed: 20, bounciness: 6 }).start() }, [focused])
  const color = focused ? c.accent2Dark : c.text3
  return (
    <Pressable onPress={onPress} style={{ flex: 1, alignItems: 'center', justifyContent: 'center', height: 54 }}>
      <Animated.View style={{ position: 'absolute', top: 4, bottom: 4, left: 6, right: 6, borderRadius: 999, backgroundColor: c.primaryLight, opacity: a, transform: [{ scale: a.interpolate({ inputRange: [0, 1], outputRange: [0.8, 1] }) }] }} />
      <View style={{ alignItems: 'center', gap: 3 }}>
        {icon}
        <Text style={{ fontSize: 11, fontWeight: '600', color }}>{label}</Text>
      </View>
    </Pressable>
  )
}
