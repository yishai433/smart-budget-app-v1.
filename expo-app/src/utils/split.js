// Splitting shared expenses between household members.
// A transaction takes part when it is an expense with `paidBy` set and it is
// not marked personal. It is divided equally between `splitAmong` (the members
// at the time it was added), falling back to the current members.
// Settlements ({ from, to, amount }) are payments made to even things out.

// net[uid] > 0: others owe this member; < 0: this member owes.
export function computeNet(transactions, memberUids, settlements = []) {
  const net = {}
  memberUids.forEach(u => { net[u] = 0 })
  const add = (u, v) => { net[u] = (net[u] || 0) + v }

  transactions.forEach(tx => {
    if (tx.type !== 'expense' || !tx.paidBy || tx.scope === 'personal') return
    const among = Array.isArray(tx.splitAmong) && tx.splitAmong.length ? tx.splitAmong : memberUids
    if (among.length < 2) return
    const amount = tx.amount || 0
    const share = amount / among.length
    add(tx.paidBy, amount)
    among.forEach(u => add(u, -share))
  })
  settlements.forEach(s => {
    add(s.from, s.amount || 0)
    add(s.to, -(s.amount || 0))
  })
  return net
}

// Fewest payments that settle everything: biggest debtor pays biggest creditor.
export function simplifyDebts(net) {
  const round = (v) => Math.round(v * 100) / 100
  const debtors = [], creditors = []
  Object.entries(net).forEach(([uid, v]) => {
    const r = round(v)
    if (r <= -0.5) debtors.push({ uid, v: -r })
    else if (r >= 0.5) creditors.push({ uid, v: r })
  })
  debtors.sort((a, b) => b.v - a.v)
  creditors.sort((a, b) => b.v - a.v)
  const out = []
  let i = 0, j = 0
  while (i < debtors.length && j < creditors.length) {
    const pay = Math.min(debtors[i].v, creditors[j].v)
    if (pay >= 0.5) out.push({ from: debtors[i].uid, to: creditors[j].uid, amount: round(pay) })
    debtors[i].v = round(debtors[i].v - pay)
    creditors[j].v = round(creditors[j].v - pay)
    if (debtors[i].v < 0.5) i++
    if (creditors[j].v < 0.5) j++
  }
  return out
}
