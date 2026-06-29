export function buildAvatarUrl(config) {
  if (!config) return null
  const p = new URLSearchParams()
  p.set('seed', config.seed || 'avatar')
  if (config.top)             p.set('top', config.top)
  if (config.skinColor)       p.set('skinColor', config.skinColor)
  if (config.hairColor)       p.set('hairColor', config.hairColor)
  p.set('clothingColor',      config.clothingColor || '3c4f5c')
  p.set('backgroundColor',    config.backgroundColor || 'b6e3f4')
  if (config.facialHair) {
    p.set('facialHair', config.facialHair)
    p.set('facialHairProbability', '100')
    if (config.facialHairColor) p.set('facialHairColor', config.facialHairColor)
  } else {
    p.set('facialHairProbability', '0')
  }
  return `https://api.dicebear.com/8.x/avataaars/svg?${p}`
}

export function randomAvatarSeed() {
  return Math.random().toString(36).slice(2, 10)
}
