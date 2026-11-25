// Suggests a category from what the person typed as the description.
// 1) the same description used before -> the category it had last time
// 2) otherwise common Hebrew / English keywords.
const KEYWORDS = {
  expense: {
    housing: ['שכירות', 'ארנונה', 'חשמל', 'מים', 'גז', 'ועד בית', 'משכנתא', 'ביטוח דירה', 'rent', 'electric', 'mortgage'],
    transport: ['דלק', 'בנזין', 'סונול', 'דור אלון', 'פנגו', 'חניה', 'רב קו', 'רב-קו', 'אוטובוס', 'רכבת', 'מונית', 'גט', 'uber', 'gett', 'כביש 6', 'טסט', 'ביטוח רכב', 'fuel', 'parking', 'taxi', 'train', 'bus'],
    health: ['רופא', 'מרפאה', 'תרופ', 'בית מרקחת', 'קופת חולים', 'שיניים', 'משקפיים', 'אופטיקה', 'pharmacy', 'doctor', 'dentist'],
    education: ['לימודים', 'שכר לימוד', 'קורס', 'ספרים', 'ספר ', 'צהרון', 'גן ', 'חוג', 'אוניברסיטה', 'tuition', 'course', 'school'],
    subscriptions: ['נטפליקס', 'netflix', 'ספוטיפיי', 'spotify', 'יוטיוב', 'youtube', 'מנוי', 'סלולר', 'פלאפון', 'סלקום', 'פרטנר', 'הוט', 'אינטרנט', 'prime', 'disney', 'icloud'],
    entertainment: ['קולנוע', 'סרט', 'משחק', 'פלייסטיישן', 'playstation', 'steam', 'תיאטרון', 'הופעה', 'cinema', 'movie', 'game'],
    outings: ['מסעדה', 'בר ', 'פאב', 'בית קפה', 'ארוחת', 'יציאה', 'restaurant', 'pub', 'cafe'],
    grooming: ['מספרה', 'תספורת', 'ספא', 'קוסמטיקה', 'מניקור', 'פדיקור', 'איפור', 'haircut', 'spa', 'salon'],
    clothing: ['בגדים', 'נעליים', 'חולצה', 'מכנסיים', 'זארה', 'קסטרו', 'פוקס', 'h&m', 'shoes', 'clothes'],
    tech: ['טלפון', 'מחשב', 'אוזניות', 'מטען', 'אייפון', 'iphone', 'laptop', 'כבל', 'מסך', 'אלקטרוניקה'],
    food: ['סופר', 'שופרסל', 'רמי לוי', 'מגה', 'יוחננוף', 'ויקטורי', 'מכולת', 'ירקות', 'פירות', 'לחם', 'חלב', 'בשר', 'פיצה', 'קפה', 'מאפה', 'אוכל', 'וולט', 'תן ביס', 'wolt', 'grocery', 'pizza', 'coffee', 'food'],
  },
  income: {
    salary: ['משכורת', 'שכר', 'salary'],
    freelance: ['פרילנס', 'פרויקט', 'freelance'],
    gift: ['מתנה', 'gift'],
    investment: ['דיבידנד', 'ריבית', 'השקעה', 'מניות', 'dividend'],
  },
}

export function suggestCategory(description, transactions, type = 'expense') {
  const d = (description || '').trim().toLowerCase()
  if (d.length < 2) return null

  // learn from history: newest transaction with the same description
  let best = null
  for (const tx of transactions) {
    if (tx.type !== type || !tx.description) continue
    const td = tx.description.trim().toLowerCase()
    if (td === d || (d.length >= 3 && td.startsWith(d))) {
      if (!best || (tx.date || '') > (best.date || '')) best = tx
    }
  }
  if (best?.category) return best.category

  const padded = ` ${d} `
  const table = KEYWORDS[type] || {}
  for (const [cat, words] of Object.entries(table)) {
    if (words.some(w => padded.includes(w.toLowerCase()))) return cat
  }
  return null
}
