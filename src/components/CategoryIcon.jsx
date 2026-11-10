import { memo } from 'react'

// Small geometric drawings, one per category. Two tones of the same colour:
// a soft base shape (35% opacity) and a solid detail on top. The colour comes
// from `color` or, by default, from the parent's text colour (currentColor),
// so callers that tint the icon with the category colour keep working.
const L = { fillOpacity: 0.35 } // light base tone

const SHAPES = {
  // expense
  housing: <><path d="M12 3l9 7.5V21H3V10.5z" {...L} /><rect x="9.5" y="14" width="5" height="7" rx="1" /></>,
  food: <><circle cx="12" cy="13.5" r="7.5" {...L} /><rect x="11" y="2.5" width="2" height="6" rx="1" /><circle cx="15.5" cy="11" r="1.6" /></>,
  transport: <><rect x="2" y="7" width="20" height="9.5" rx="4.75" {...L} /><circle cx="7" cy="17.5" r="2.8" /><circle cx="17" cy="17.5" r="2.8" /></>,
  clothing: <><path d="M8 3l-6 4 2.5 4.5L7 10v11h10V10l2.5 1.5L22 7l-6-4c-.6 1.8-2.2 3-4 3s-3.4-1.2-4-3z" {...L} /><rect x="9" y="13" width="6" height="2.2" rx="1.1" /></>,
  health: <><circle cx="12" cy="12" r="9.5" {...L} /><rect x="10.3" y="6" width="3.4" height="12" rx="1.2" /><rect x="6" y="10.3" width="12" height="3.4" rx="1.2" /></>,
  education: <><path d="M3 5.5C5.5 4.5 8.5 4.5 11 6v14c-2.5-1.5-5.5-1.5-8-.5z" {...L} /><path d="M21 5.5c-2.5-1-5.5-1-8 .5v14c2.5-1.5 5.5-1.5 8-.5z" {...L} /><rect x="11" y="5.5" width="2" height="14.5" rx="1" /></>,
  entertainment: <><circle cx="12" cy="12" r="9.5" {...L} /><path d="M10 8l6 4-6 4z" /></>,
  subscriptions: <><rect x="2.5" y="4" width="19" height="13" rx="3" {...L} /><rect x="8" y="19" width="8" height="2" rx="1" /><circle cx="12" cy="10.5" r="2.4" /></>,
  outings: <><path d="M12 2.5l2.6 6.2 6.6.5-5 4.3 1.6 6.5L12 16.5 6.2 20l1.6-6.5-5-4.3 6.6-.5z" {...L} /><circle cx="12" cy="12" r="2.6" /></>,
  grooming: <><circle cx="12" cy="9" r="6.5" {...L} /><rect x="10.8" y="13" width="2.4" height="8.5" rx="1.2" /><circle cx="12" cy="9" r="2" /></>,
  tech: <><rect x="6" y="2" width="12" height="20" rx="3.5" {...L} /><rect x="9.5" y="17.5" width="5" height="1.8" rx=".9" /></>,
  other: <><rect x="3" y="3" width="18" height="18" rx="4.5" {...L} /><rect x="9" y="9" width="6" height="6" rx="1.2" transform="rotate(45 12 12)" /></>,
  // income
  salary: <><rect x="2.5" y="7" width="19" height="13" rx="3.5" {...L} /><path d="M9 7V5.5A1.5 1.5 0 0 1 10.5 4h3A1.5 1.5 0 0 1 15 5.5V7h-2V6h-2v1z" /><rect x="2.5" y="12" width="19" height="2" /></>,
  freelance: <><rect x="4" y="4" width="16" height="11" rx="2.5" {...L} /><rect x="1.5" y="17" width="21" height="2.6" rx="1.3" /></>,
  gift: <><rect x="3" y="8" width="18" height="13" rx="3" {...L} /><rect x="10.8" y="8" width="2.4" height="13" /><rect x="3" y="11" width="18" height="2.2" /><circle cx="9.5" cy="6" r="2.3" /><circle cx="14.5" cy="6" r="2.3" /></>,
  investment: <><rect x="3" y="13" width="4.5" height="8" rx="1.5" {...L} /><rect x="9.75" y="9" width="4.5" height="12" rx="1.5" {...L} /><rect x="16.5" y="4" width="4.5" height="17" rx="1.5" /></>,
  // shopping sub-categories
  produce: <><ellipse cx="12" cy="12" rx="5.5" ry="9.5" transform="rotate(35 12 12)" {...L} /><rect x="11" y="5" width="2" height="14" rx="1" transform="rotate(35 12 12)" /></>,
  dairy: <><path d="M12 2.5c3.5 4.5 6.5 8 6.5 11.5a6.5 6.5 0 0 1-13 0C5.5 10.5 8.5 7 12 2.5z" {...L} /><circle cx="12" cy="14.5" r="2.6" /></>,
  meat: <><circle cx="10.5" cy="10.5" r="7.5" {...L} /><rect x="13" y="13" width="9" height="2.6" rx="1.3" transform="rotate(45 13 13)" /><circle cx="10.5" cy="10.5" r="2.4" /></>,
  frozen: <><circle cx="12" cy="12" r="9.5" {...L} /><rect x="11" y="4.5" width="2" height="15" rx="1" /><rect x="11" y="4.5" width="2" height="15" rx="1" transform="rotate(60 12 12)" /><rect x="11" y="4.5" width="2" height="15" rx="1" transform="rotate(-60 12 12)" /></>,
  drinks: <><path d="M5 6h12l-1.5 14a2 2 0 0 1-2 1.8h-5a2 2 0 0 1-2-1.8z" {...L} /><path d="M17 9h1.5a3 3 0 0 1 0 6H16.6l.3-2h1.6a1 1 0 0 0 0-2H17z" /><rect x="5" y="9" width="12" height="2" /></>,
  cleaning: <><rect x="3" y="11" width="18" height="10" rx="3" {...L} /><rect x="10.8" y="2.5" width="2.4" height="9" rx="1.2" /><rect x="6" y="15" width="12" height="2" rx="1" /></>,
  personal: <><circle cx="12" cy="12" r="9.5" {...L} /><path d="M12 5.5l1.7 4.8 4.8 1.7-4.8 1.7L12 18.5l-1.7-4.8L5.5 12l4.8-1.7z" /></>,
}

function CategoryIcon({ id, size = 22, color = 'currentColor' }) {
  const shape = SHAPES[id] || SHAPES.other
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color} aria-hidden="true" focusable="false" style={{ display: 'block', flexShrink: 0 }}>
      {shape}
    </svg>
  )
}

export default memo(CategoryIcon)
