import {
  Home, Car, Utensils, Shirt, Heart, BookOpen, Film, Tv,
  Scissors, Smartphone, Package, Briefcase, Laptop, Gift,
  TrendingUp, Wallet, ShoppingCart, Leaf, Sparkles, PartyPopper,
  Snowflake, Coffee, Wind, Droplets, Beef,
} from 'lucide-react'

const ICONS = {
  // expense
  housing:       Home,
  food:          Utensils,
  transport:     Car,
  clothing:      Shirt,
  health:        Heart,
  education:     BookOpen,
  entertainment: Film,
  subscriptions: Tv,
  outings:       PartyPopper,
  grooming:      Scissors,
  tech:          Smartphone,
  other:         Package,
  // income
  salary:        Briefcase,
  freelance:     Laptop,
  gift:          Gift,
  investment:    TrendingUp,
  // shopping sub-cats
  produce:       Leaf,
  dairy:         Droplets,
  meat:          Beef,
  frozen:        Snowflake,
  drinks:        Coffee,
  cleaning:      Wind,
  personal:      Sparkles,
}

export default function CategoryIcon({ id, size = 22, color = 'currentColor', strokeWidth = 1.8 }) {
  const Icon = ICONS[id] || Package
  return <Icon size={size} color={color} strokeWidth={strokeWidth} />
}
