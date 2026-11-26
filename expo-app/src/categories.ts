// Category definitions, mirroring the website. Hebrew labels + emoji + color.
export interface Category { id: string; label: string; emoji: string; color: string }

export const CATEGORIES: Record<'income' | 'expense', Category[]> = {
  income: [
    { id: 'salary',     label: 'משכורת',  emoji: '💼', color: '#56633F' },
    { id: 'freelance',  label: 'פרילנס',  emoji: '💻', color: '#7A8A5E' },
    { id: 'gift',       label: 'מתנה',    emoji: '🎁', color: '#D08A2E' },
    { id: 'investment', label: 'השקעות',  emoji: '📈', color: '#4F7A8A' },
    { id: 'other',      label: 'אחר',     emoji: '💰', color: '#8A8272' },
  ],
  expense: [
    { id: 'housing',       label: 'דיור',     emoji: '🏠', color: '#A8553A' },
    { id: 'food',          label: 'מזון',     emoji: '🍔', color: '#D08A2E' },
    { id: 'transport',     label: 'תחבורה',   emoji: '🚗', color: '#56633F' },
    { id: 'clothing',      label: 'ביגוד',    emoji: '👕', color: '#9A6B8E' },
    { id: 'health',        label: 'בריאות',   emoji: '❤️', color: '#C0524F' },
    { id: 'education',     label: 'חינוך',    emoji: '📚', color: '#4F7A8A' },
    { id: 'entertainment', label: 'בילויים',  emoji: '🎬', color: '#C77B5C' },
    { id: 'subscriptions', label: 'מנויים',   emoji: '📡', color: '#6B5FA0' },
    { id: 'outings',       label: 'יציאות',   emoji: '🎉', color: '#7E9A5C' },
    { id: 'grooming',      label: 'טיפוח',    emoji: '💆', color: '#D98FA0' },
    { id: 'tech',          label: 'טכנולוגיה',emoji: '📱', color: '#3F6F73' },
    { id: 'other',         label: 'שונות',    emoji: '📦', color: '#8A8272' },
  ],
}

const BY_ID: Record<string, Category> = {}
for (const list of Object.values(CATEGORIES)) for (const c of list) BY_ID[c.id] = c

export function categoryOf(id: string): Category {
  return BY_ID[id] || { id, label: id, emoji: '📦', color: '#8A8272' }
}
