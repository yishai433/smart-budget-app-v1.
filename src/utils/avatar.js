import { createAvatar } from '@dicebear/core'
import { avataaars } from '@dicebear/collection'

export function buildAvatarUrl(config) {
  if (!config) return null
  try {
    const opts = { seed: config.seed || 'default' }
    if (config.top)             opts.top = [config.top]
    if (config.skinColor)       opts.skinColor = [config.skinColor]
    if (config.hairColor)       opts.hairColor = [config.hairColor]
    if (config.backgroundColor) opts.backgroundColor = [config.backgroundColor]
    if (config.facialHair) {
      opts.facialHair = [config.facialHair]
      opts.facialHairProbability = 100
    } else {
      opts.facialHairProbability = 0
    }
    const svg = createAvatar(avataaars, opts).toString()
    return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
  } catch (e) {
    console.error('buildAvatarUrl error', e)
    return null
  }
}

export function randomAvatarSeed() {
  return Math.random().toString(36).slice(2, 10)
}
