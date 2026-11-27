// Supermarket departments for the shopping list, plus a keyword guesser so a typed
// product lands in the right department without asking (shared ids with the website).
export interface ShopCat { id: string; label: string; emoji: string; color: string }

export const SHOP_CATS: ShopCat[] = [
  { id: 'produce', label: 'פירות וירקות', emoji: '🥬', color: '#5E9A4A' },
  { id: 'dairy', label: 'חלב וביצים', emoji: '🥛', color: '#3F86B5' },
  { id: 'bakery', label: 'לחם ומאפים', emoji: '🥖', color: '#C98A2E' },
  { id: 'meat', label: 'בשר, עוף ודגים', emoji: '🍗', color: '#C0524F' },
  { id: 'pantry', label: 'מזווה', emoji: '🥫', color: '#A0663A' },
  { id: 'frozen', label: 'קפואים', emoji: '🧊', color: '#3F8F99' },
  { id: 'drinks', label: 'משקאות', emoji: '🥤', color: '#7A62B8' },
  { id: 'snacks', label: 'חטיפים ומתוקים', emoji: '🍫', color: '#B5647A' },
  { id: 'cleaning', label: 'ניקיון', emoji: '🧽', color: '#4E8F6F' },
  { id: 'personal', label: 'טיפוח ופארם', emoji: '🧴', color: '#C27BA0' },
  { id: 'baby', label: 'תינוקות', emoji: '🍼', color: '#D19A55' },
  { id: 'other', label: 'שונות', emoji: '🛒', color: '#7F8C8A' },
]
const BY_ID: Record<string, ShopCat> = Object.fromEntries(SHOP_CATS.map(c => [c.id, c]))
export const shopCat = (id?: string) => BY_ID[id || 'other'] || BY_ID.other

const KEYWORDS: Record<string, string[]> = {
  produce: ['עגבני', 'מלפפון', 'בצל', 'תפוח', 'בננ', 'תפוז', 'גזר', 'פלפל', 'חסה', 'תות', 'ענב', 'אבוקדו', 'לימון', 'תפוא', 'תפו"א', 'שום', 'ירק', 'פרי', 'פירות', 'קישוא', 'כרוב', 'סלק', 'אבטיח', 'מלון', 'אננס', 'קיווי', 'אפרסק', 'שזיף', 'משמש', 'צנונית', 'כוסברה', 'פטרוזיליה', 'שמיר', 'נענע', 'בטטה', 'חציל', 'פטריות', 'ברוקולי', 'כרובית', 'אגס', 'מנגו', 'רימון', 'קלמנטינ'],
  dairy: ['חלב', 'גבינ', 'יוגורט', 'קוטג', 'שמנת', 'חמאה', 'לבן', 'ביצים', 'ביצה', 'מעדן', 'לבנה', 'צפתית', 'בולגרית', 'מוצרלה', 'פודינג', 'דנונה', 'מילקי'],
  bakery: ['לחם', 'פיתה', 'פיתות', 'בגט', 'עוגה', 'חלה', 'חלות', 'בורקס', 'לחמני', 'קרואסון', 'מאפה', 'טורטיה', 'לאפה'],
  meat: ['עוף', 'בשר', 'דג', 'סלמון', 'קציצ', 'נקניק', 'הודו', 'בקר', 'טחון', 'שניצל', 'סטייק', 'המבורגר', 'פרגית', 'כרעיים', 'חזה', 'כבד', 'אנטריקוט', 'אמנון', 'פילה'],
  pantry: ['אורז', 'פסטה', 'ספגטי', 'קמח', 'סוכר', 'מלח', 'שמן', 'טונה', 'תירס', 'שימורי', 'רסק', 'קטשופ', 'מיונז', 'חומוס', 'טחינה', 'עדשים', 'שעועית', 'פתיתים', 'קוסקוס', 'דבש', 'ריבה', 'ממרח', 'נוטלה', 'קורנפלקס', 'דגני', 'שיבולת', 'תבלין', 'פפריקה', 'פלפל שחור', 'חומץ', 'רוטב', 'מרק', 'אבקת מרק', 'בורגול', 'קינואה', 'שקדי מרק', 'פירורי לחם'],
  frozen: ['קפוא', 'גלידה', 'ארטיק', 'פיצה קפואה', 'אפונה', 'שעועית ירוקה', 'צ׳יפס', "צ'יפס"],
  drinks: ['מים', 'קולה', 'מיץ', 'בירה', 'יין', 'סודה', 'קפה', 'תה', 'משקה', 'ספרייט', 'פאנטה', 'פריגת', 'נביעות', 'שוקו', 'אנרגיה', 'נס קפה'],
  snacks: ['במבה', 'ביסלי', 'חטיף', 'שוקולד', 'עוגיות', 'עוגיה', 'וופל', 'ופל', 'סוכריות', 'צ׳יטוס', 'דוריטוס', 'פופקורן', 'בייגל', 'קרקר', 'פריכיות', 'אגוזים', 'גרעינים', 'מסטיק'],
  cleaning: ['סבון כלים', 'אקונומיקה', 'נוזל כלים', 'מרכך', 'אבקת כביסה', 'ג׳ל כביסה', 'כביסה', 'ניקוי', 'מגבונים', 'שקיות', 'ספריי', 'ספוג', 'סקוטש', 'נייר כסף', 'ניילון נצמד', 'אשפה', 'מטהר', 'טבליות למדיח', 'מדיח', 'סמרטוט', 'כפפות'],
  personal: ['שמפו', 'משחת שיניים', 'מברשת שיניים', 'דאודורנט', 'נייר טואלט', 'מגבות נייר', 'סבון', 'קרם', 'תחבושת', 'פד', 'גילוח', 'סכיני', 'מרכך שיער', 'קיסמי', 'צמר גפן', 'אקמול', 'פלסטר', 'טמפון'],
  baby: ['חיתול', 'מטרנה', 'סימילאק', 'תמ"ל', 'מוצץ', 'בקבוק תינוק', 'מגבוני תינוק', 'דייסה'],
}

export function guessShoppingCategory(name: string): string {
  const n = (name || '').trim()
  if (!n) return 'other'
  for (const [cat, words] of Object.entries(KEYWORDS)) if (words.some(w => n.includes(w))) return cat
  return 'other'
}

// A ready-made basic basket for a first shop (used when the household has none yet).
export const STARTER_BASKET: { name: string; category: string; quantity: number; estimatedPrice: number }[] = [
  { name: 'חלב', category: 'dairy', quantity: 2, estimatedPrice: 6.5 },
  { name: 'ביצים (12)', category: 'dairy', quantity: 1, estimatedPrice: 14 },
  { name: 'גבינה לבנה', category: 'dairy', quantity: 1, estimatedPrice: 6 },
  { name: 'קוטג׳', category: 'dairy', quantity: 2, estimatedPrice: 6 },
  { name: 'לחם', category: 'bakery', quantity: 2, estimatedPrice: 9 },
  { name: 'עגבניות', category: 'produce', quantity: 1, estimatedPrice: 8 },
  { name: 'מלפפונים', category: 'produce', quantity: 1, estimatedPrice: 7 },
  { name: 'בננות', category: 'produce', quantity: 1, estimatedPrice: 9 },
  { name: 'תפוחי אדמה', category: 'produce', quantity: 1, estimatedPrice: 7 },
  { name: 'בצל', category: 'produce', quantity: 1, estimatedPrice: 5 },
  { name: 'חזה עוף', category: 'meat', quantity: 1, estimatedPrice: 40 },
  { name: 'אורז', category: 'pantry', quantity: 1, estimatedPrice: 9 },
  { name: 'פסטה', category: 'pantry', quantity: 2, estimatedPrice: 5 },
  { name: 'שמן', category: 'pantry', quantity: 1, estimatedPrice: 12 },
  { name: 'נייר טואלט', category: 'personal', quantity: 1, estimatedPrice: 30 },
  { name: 'נוזל כלים', category: 'cleaning', quantity: 1, estimatedPrice: 10 },
]
