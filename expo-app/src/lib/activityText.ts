import { ArrowDownLeft, ArrowUpRight, Trash2, Pencil, Wallet, Target, ShoppingCart, PiggyBank } from 'lucide-react-native'
import type { Activity, TxSnap } from '../types'
import { categoryOf } from '../categories'
import { formatAmount } from './money'
import { monthLabel } from './month'

export type Tone = 'income' | 'expense' | 'danger' | 'neutral' | 'saving'
export interface Described {
  Icon: typeof Wallet; tone: Tone
  title: string            // what happened, short
  detail?: string          // the change itself (before → after), when there is one
  amount?: number          // signed: + money in / saved, − money out
}

const lbl = (t?: TxSnap | number | null) => (t && typeof t === 'object' ? (t.description || categoryOf(t.category).label) : '')
const isTx = (t: unknown): t is TxSnap => !!t && typeof t === 'object'

// Plain-language line for one change.
export function describe(a: Activity): Described {
  switch (a.kind) {
    case 'add': {
      const t = a.after as TxSnap
      if (!isTx(t)) break
      if (a.trip) return { Icon: ShoppingCart, tone: 'expense', title: `קנייה בסופר · ${lbl(t)}`, amount: -t.amount }
      return t.type === 'income'
        ? { Icon: ArrowDownLeft, tone: 'income', title: `הכנסה: ${lbl(t)}`, amount: t.amount }
        : { Icon: ArrowUpRight, tone: 'expense', title: `הוצאה: ${lbl(t)}`, detail: categoryOf(t.category).label, amount: -t.amount }
    }
    case 'delete': {
      const t = a.before as TxSnap
      if (!isTx(t)) break
      return { Icon: Trash2, tone: 'danger', title: `נמחקה ${t.type === 'income' ? 'הכנסה' : 'הוצאה'}: ${lbl(t)}`, detail: formatAmount(t.amount) }
    }
    case 'edit': {
      const b = a.before as TxSnap, n = a.after as TxSnap
      if (!isTx(b) || !isTx(n)) break
      const parts: string[] = []
      if (b.amount !== n.amount) parts.push(`${formatAmount(b.amount)} ← ${formatAmount(n.amount)}`)
      if (b.category !== n.category) parts.push(`${categoryOf(b.category).label} ← ${categoryOf(n.category).label}`)
      if (b.type !== n.type) parts.push(n.type === 'income' ? 'הוצאה ← הכנסה' : 'הכנסה ← הוצאה')
      return { Icon: Pencil, tone: 'neutral', title: `עודכנה ${n.type === 'income' ? 'הכנסה' : 'הוצאה'}: ${lbl(n)}`, detail: parts.join(' · ') }
    }
    case 'budget': return {
      Icon: Wallet, tone: 'neutral', title: `תקציב ${a.month ? monthLabel(a.month) : 'חודשי'}`,
      detail: `${a.before == null ? 'בלי תקציב' : formatAmount(a.before as number)} ← ${formatAmount(a.after as number)}`,
    }
    case 'catBudget': return {
      Icon: Wallet, tone: 'neutral', title: `תקציב ל${categoryOf(a.cat || 'other').label}`,
      detail: `${a.before ? formatAmount(a.before as number) : 'בלי'} ← ${a.after ? formatAmount(a.after as number) : 'בלי'}`,
    }
    case 'goalAdd': return { Icon: Target, tone: 'saving', title: `יעד חיסכון חדש: ${a.goal?.name || ''}`, detail: a.goal?.target ? `יעד ${formatAmount(a.goal.target)}` : undefined }
    case 'goalDeposit': return (a.delta || 0) >= 0
      ? { Icon: PiggyBank, tone: 'saving', title: `הפקדה לחיסכון: ${a.goal?.name || ''}`, amount: a.delta }
      : { Icon: PiggyBank, tone: 'neutral', title: `משיכה מהחיסכון: ${a.goal?.name || ''}`, amount: a.delta }
    case 'goalDelete': return { Icon: Trash2, tone: 'danger', title: `נמחק יעד חיסכון: ${a.goal?.name || ''}` }
    case 'settle': return { Icon: Wallet, tone: 'neutral', title: 'החזר בין בני הבית', detail: formatAmount(Number((a as unknown as { amount?: number }).amount) || 0) }
  }
  return { Icon: Pencil, tone: 'neutral', title: 'שינוי' }
}

export const firstName = (n?: string) => (n || '').trim().split(/\s+/)[0] || 'בן בית'

// "What's new" in one or two short lines per person: "3 הוצאות · ₪420", "הכנסה ₪5,000", …
export function summarize(list: Activity[]): { name: string; by: string; lines: string[] }[] {
  const by = new Map<string, Activity[]>()
  list.forEach(a => by.set(a.by, [...(by.get(a.by) || []), a]))
  return [...by.entries()].map(([uid, xs]) => {
    let exN = 0, exSum = 0, inN = 0, inSum = 0, del = 0, edit = 0, budget = 0, saved = 0, trips = 0
    for (const a of xs) {
      const t = a.after as TxSnap
      if (a.kind === 'add' && isTx(t)) {
        if (a.trip) trips++
        if (t.type === 'income') { inN++; inSum += t.amount } else { exN++; exSum += t.amount }
      } else if (a.kind === 'delete') del++
      else if (a.kind === 'edit') edit++
      else if (a.kind === 'budget' || a.kind === 'catBudget') budget++
      else if (a.kind === 'goalDeposit') saved += a.delta || 0
    }
    const lines: string[] = []
    if (exN) lines.push(`${exN === 1 ? 'הוצאה אחת' : `${exN} הוצאות`} · ${formatAmount(exSum)}${trips ? ` (כולל ${trips === 1 ? 'קנייה בסופר' : `${trips} קניות בסופר`})` : ''}`)
    if (inN) lines.push(`${inN === 1 ? 'הכנסה' : `${inN} הכנסות`} · ${formatAmount(inSum)}`)
    if (saved) lines.push(`${saved > 0 ? 'הפקדה לחיסכון' : 'משיכה מחיסכון'} · ${formatAmount(Math.abs(saved))}`)
    if (budget) lines.push(budget === 1 ? 'שינוי בתקציב' : `${budget} שינויים בתקציב`)
    if (edit) lines.push(edit === 1 ? 'עדכון של תנועה' : `${edit} עדכונים של תנועות`)
    if (del) lines.push(del === 1 ? 'מחיקה של תנועה' : `${del} מחיקות`)
    return { name: firstName(xs[0].name), by: uid, lines }
  })
}

export function dayLabel(at: number) {
  const d = new Date(at); const t = new Date()
  const diff = Math.round((new Date(t).setHours(0, 0, 0, 0) - new Date(d).setHours(0, 0, 0, 0)) / 86400000)
  if (diff === 0) return 'היום'
  if (diff === 1) return 'אתמול'
  if (diff < 7) return ['יום ראשון', 'יום שני', 'יום שלישי', 'יום רביעי', 'יום חמישי', 'יום שישי', 'שבת'][d.getDay()]
  return `${d.getDate()}.${d.getMonth() + 1}`
}
export const timeOf = (at: number) => { const d = new Date(at); return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}` }
