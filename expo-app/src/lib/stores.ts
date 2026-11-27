import { doc, getDoc } from 'firebase/firestore'
import { db } from '../firebase'

// Supermarket branch catalog (published by the home server, same as the website uses).
export interface StoreInfo { k: string; n: string; c: string; city?: string; a?: string }

export const CHAIN: Record<string, string> = { shufersal: 'שופרסל', sapir: 'ספיר', osherad: 'אושר עד', ramilevi: 'רמי לוי', yohananof: 'יוחננוף', tivtaam: 'טיב טעם', freshmarket: 'פרשמרקט', stopmarket: 'סטופ מרקט', keshet: 'קשת טעמים', mshuk: 'מחסני השוק' }
// Shufersal gives the city as a national city code. Major cities:
const CITY_BY_CODE: Record<number, string> = {
  3000: 'ירושלים', 5000: 'תל אביב-יפו', 4000: 'חיפה', 70: 'אשדוד', 7100: 'אשקלון', 9000: 'באר שבע', 6100: 'בני ברק',
  6600: 'חולון', 6200: 'בת ים', 8600: 'רמת גן', 6400: 'הרצליה', 6900: 'כפר סבא', 8700: 'רעננה', 7900: 'פתח תקווה',
  8300: 'ראשון לציון', 8400: 'רחובות', 7400: 'נתניה', 6500: 'חדרה', 1200: 'מודיעין-מכבים-רעות', 7000: 'לוד', 8500: 'רמלה',
  2610: 'בית שמש', 2630: 'קרית גת', 1139: 'כרמיאל', 9700: 'הוד השרון', 2620: 'קרית אונו', 2660: 'יבנה', 7600: 'עכו',
  9100: 'נהריה', 6700: 'טבריה', 7700: 'עפולה', 2500: 'נס ציונה', 2600: 'אילת', 2640: 'ראש העין', 2200: 'דימונה',
  2800: 'קרית שמונה', 8000: 'צפת', 7800: 'פרדס חנה-כרכור', 2530: 'באר יעקב', 1304: 'שוהם',
}
export const cityName = (c?: string) => /^\d+$/.test(c || '') ? (CITY_BY_CODE[Number(c)] || '') : (c || '')
const KNOWN: Record<string, string> = { 'shufersal-190': 'שופרסל דיל חצור הגלילית', 'sapir-21': 'סופר ספיר חצור' }

let catalog: StoreInfo[] | null = null
let pending: Promise<StoreInfo[]> | null = null
export function loadCatalog(): Promise<StoreInfo[]> {
  if (catalog) return Promise.resolve(catalog)
  if (!pending) pending = getDoc(doc(db, 'priceCatalog', 'stores'))
    .then(s => (catalog = s.exists() ? ((s.data() as { stores?: StoreInfo[] }).stores || []) : []))
    .catch(() => [])
    .finally(() => { pending = null })
  return pending
}

export function storeLabel(key: string, labels?: Record<string, string>): string {
  if (!key) return ''
  return labels?.[key] || catalog?.find(s => s.k === key)?.n || KNOWN[key] || key
}
