export const HE_MONTHS = ['ינואר','פברואר','מרץ','אפריל','מאי','יוני',
                          'יולי','אוגוסט','ספטמבר','אוקטובר','נובמבר','דצמבר']
export const EN_MONTHS = ['January','February','March','April','May','June',
                          'July','August','September','October','November','December']

// "2026-11" → { year: 2026, monthIdx: 10 }
export function parseMonthKey(key) {
  const [year, month] = key.split('-').map(Number)
  return { year, monthIdx: month - 1 }
}

// "2026-11" → "נובמבר 2026" / "November 2026"
export function monthLabel(key, lang = 'he') {
  const { year, monthIdx } = parseMonthKey(key)
  const name = (lang === 'he' ? HE_MONTHS : EN_MONTHS)[monthIdx]
  return `${name} ${year}`
}

// "2026-11" → "נובמבר" / "November" (name only, no year)
export function monthName(key, lang = 'he') {
  const { monthIdx } = parseMonthKey(key)
  return (lang === 'he' ? HE_MONTHS : EN_MONTHS)[monthIdx]
}
