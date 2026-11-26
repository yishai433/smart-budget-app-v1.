import { useRef, ReactNode } from 'react'
import { Animated, Pressable, ViewStyle, StyleProp } from 'react-native'

interface Props { children: ReactNode; onPress?: () => void; style?: StyleProp<ViewStyle>; containerStyle?: StyleProp<ViewStyle>; scale?: number; disabled?: boolean }
export default function Touchable({ children, onPress, style, containerStyle, scale = 0.97, disabled }: Props) {
  const s = useRef(new Animated.Value(1)).current
  const to = (v: number) => Animated.spring(s, { toValue: v, useNativeDriver: true, speed: 40, bounciness: 0 }).start()
  return (
    <Pressable onPress={onPress} disabled={disabled} style={containerStyle} onPressIn={() => to(scale)} onPressOut={() => to(1)}>
      <Animated.View style={[style, { opacity: disabled ? 0.5 : 1, transform: [{ scale: s }] }]}>{children}</Animated.View>
    </Pressable>
  )
}
