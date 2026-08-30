// Lightweight keyword lookup that guesses a shopping category from a Hebrew
// product name, so items typed into the "later list" don't need a manual
// category picker. First matching category wins; falls back to 'other'.
const KEYWORDS = {
  produce: ['עגבני', 'מלפפון', 'בצל', 'תפוח', 'בננה', 'תפוז', 'גזר', 'פלפל', 'חסה', 'תות', 'ענבים', 'אבוקדו', 'לימון', 'תפוח אדמה', 'תפו"א', 'שום', 'ירק', 'פרי', 'פירות', 'קישוא', 'כרוב', 'סלק', 'אבטיח', 'מלון', 'אננס', 'קיווי', 'אפרסק', 'שזיף', 'משמש', 'צנונית', 'כוסברה', 'פטרוזיליה', 'בטטה'],
  dairy: ['חלב', 'גבינ', 'יוגורט', 'קוטג', 'שמנת', 'חמאה', 'לבן', 'ביצים', 'ביצה', 'מעדן'],
  meat: ['עוף', 'בשר', 'דג', 'סלמון', 'טונה', 'קציצ', 'נקניק', 'הודו', 'בקר', 'טחון', 'שניצל', 'סטייק', 'המבורגר', 'פרגית'],
  bakery: ['לחם', 'פיתה', 'בגט', 'עוגה', 'עוגי', 'חלה', 'בורקס', 'לחמני', 'קרואסון', 'מאפה'],
  frozen: ['קפוא', 'גלידה', 'ארטיק'],
  drinks: ['מים', 'קולה', 'מיץ', 'בירה', 'יין', 'סודה', 'קפה', 'תה', 'משקה', 'ספרייט', 'פאנטה'],
  cleaning: ['סבון כלים', 'אקונומיקה', 'נוזל כלים', 'מרכך', 'אבקת כביסה', 'כביסה', 'ניקוי', 'מגבונים', 'שקיות אשפה', 'ספריי'],
  personal: ['שמפו', 'משחת שיניים', 'דאודורנט', 'נייר טואלט', 'מגבות נייר', 'סבון גוף', 'קרם', 'תחבושת', 'פד'],
}

export function guessShoppingCategory(name) {
  const n = (name || '').trim()
  if (!n) return 'other'
  for (const [category, words] of Object.entries(KEYWORDS)) {
    if (words.some(w => n.includes(w))) return category
  }
  return 'other'
}
