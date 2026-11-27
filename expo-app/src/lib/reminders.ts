import * as Notifications from 'expo-notifications'

// Local reminders for "buy later" items. The time is stored on the item in Firestore (so both
// partners see it); each phone schedules its own notification for it.
Notifications.setNotificationHandler({
  handleNotification: async () => ({ shouldShowAlert: true, shouldShowBanner: true, shouldShowList: true, shouldPlaySound: true, shouldSetBadge: false }) as Notifications.NotificationBehavior,
})

const idOf = (itemId: string) => `later-${itemId}`

export async function ensurePermission(): Promise<boolean> {
  try {
    const cur = await Notifications.getPermissionsAsync()
    if (cur.granted) return true
    if (!cur.canAskAgain) return false
    return (await Notifications.requestPermissionsAsync()).granted
  } catch { return false }
}

export async function scheduleReminder(itemId: string, name: string, at: number) {
  await cancelReminder(itemId)
  if (at <= Date.now() + 5000) return
  await Notifications.scheduleNotificationAsync({
    identifier: idOf(itemId),
    content: { title: 'תזכורת קנייה 🛒', body: `לא לשכוח: ${name}`, sound: true },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: new Date(at) },
  })
}

export async function cancelReminder(itemId: string) {
  try { await Notifications.cancelScheduledNotificationAsync(idOf(itemId)) } catch { /* nothing scheduled */ }
}

// Make this phone's scheduled reminders match the list (e.g. one the partner set on their phone).
export async function syncReminders(items: { id: string; name: string; remindAt?: number | null }[]) {
  try {
    const perm = await Notifications.getPermissionsAsync()
    if (!perm.granted) return
    const scheduled = await Notifications.getAllScheduledNotificationsAsync()
    const have = new Set(scheduled.map(n => n.identifier).filter(i => i.startsWith('later-')))
    const want = new Set<string>()
    for (const it of items) {
      if (!it.remindAt || it.remindAt <= Date.now()) continue
      want.add(idOf(it.id))
      if (!have.has(idOf(it.id))) await scheduleReminder(it.id, it.name, it.remindAt)
    }
    for (const id of have) if (!want.has(id)) await Notifications.cancelScheduledNotificationAsync(id).catch(() => {})
  } catch { /* notifications unavailable */ }
}

const DAYS = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת']
export function reminderLabel(at: number): string {
  const d = new Date(at), now = new Date()
  const day0 = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime()
  const diff = Math.round((day0(d) - day0(now)) / 86400000)
  const hm = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
  const when = diff === 0 ? 'היום' : diff === 1 ? 'מחר' : diff > 1 && diff < 7 ? `יום ${DAYS[d.getDay()]}` : `${d.getDate()}.${d.getMonth() + 1}`
  return `${when} ב-${hm}`
}
