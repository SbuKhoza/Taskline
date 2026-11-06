import { Platform, Linking } from "react-native"
import * as Notifications from "expo-notifications"
import AsyncStorage from "@react-native-async-storage/async-storage"

export const CHANNEL_ID = "task-reminders"
export const CATEGORY_ID = "task-reminder"
export const ACTION_DONE = "DONE"
export const ACTION_SNOOZE = "SNOOZE"
export const SNOOZE_MINUTES = 10
const MAX_SCHEDULED = 60 // iOS only keeps the 64 soonest local notifications

// Show reminders as a banner (with sound) even while the app is open
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
})

const LEAD_MINUTES = {
  "1 hour before": 60,
  "30 minutes before": 30,
  "15 minutes before": 15,
  "5 minutes before": 5,
  "1 minute before": 1,
}

let lastTasks = []
let plan = [] // what is currently scheduled (used by the in-app Reminders sheet)
let chain = Promise.resolve()

const pad = (n) => String(n).padStart(2, "0")
const fmtTime = (d) =>
  new Date(d).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true }).toLowerCase()

// ---------------------------------------------------------------- permissions
// Buttons shown on the notification (long-press on iOS, expanded on Android).
// They open the app briefly so the action can be saved to Firestore.
async function ensureCategory() {
  try {
    await Notifications.setNotificationCategoryAsync(CATEGORY_ID, [
      { identifier: ACTION_DONE, buttonTitle: "Mark done", options: { opensAppToForeground: true } },
      { identifier: ACTION_SNOOZE, buttonTitle: `Snooze ${SNOOZE_MINUTES} min`, options: { opensAppToForeground: true } },
    ])
  } catch (e) {
    console.warn("Could not register notification actions:", e?.message)
  }
}

// Id of the Android channel if it could be created. In Expo Go (or if the system rejects it) this
// stays null and notifications simply use Expo's default channel instead of failing.
let activeChannelId = null
let channelAttempted = false
const channelProps = () => (activeChannelId ? { channelId: activeChannelId } : {})

export async function ensureChannel() {
  await ensureCategory()
  if (Platform.OS !== "android" || channelAttempted) return
  channelAttempted = true
  const attempts = [
    {
      name: "Task reminders",
      description: "Reminders for your upcoming tasks",
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 200, 250],
      lightColor: "#0B6CF0",
      sound: "default",
    },
    { name: "Task reminders", importance: Notifications.AndroidImportance.HIGH }, // minimal fallback
  ]
  for (const cfg of attempts) {
    try {
      await Notifications.setNotificationChannelAsync(CHANNEL_ID, cfg)
      activeChannelId = CHANNEL_ID
      return
    } catch (e) {
      console.warn("Could not create notification channel:", e?.message?.split("\n")[0])
    }
  }
}

export async function getPermissionStatus() {
  const p = await Notifications.getPermissionsAsync()
  return { granted: !!p.granted, canAskAgain: p.canAskAgain !== false, status: p.status }
}

// Asks for permission (only prompts if the system still allows it)
export async function requestPermission() {
  await ensureChannel() // the channel must exist before Android 13+ shows the prompt
  const current = await getPermissionStatus()
  if (current.granted) return true
  if (!current.canAskAgain) return false
  const res = await Notifications.requestPermissionsAsync({
    ios: { allowAlert: true, allowSound: true, allowBadge: false },
  })
  return !!res.granted
}

export const openSystemSettings = () => Linking.openSettings()

// Android 12+: exact alarms make reminders fire on the minute instead of "around" it
export async function hasExactAlarmPermission() {
  if (Platform.OS !== "android" || Platform.Version < 31) return true
  try {
    if (!Notifications.getExactAlarmPermissionsAsync) return true
    const r = await Notifications.getExactAlarmPermissionsAsync()
    return !!r.granted
  } catch {
    return true
  }
}

export async function requestExactAlarmPermission() {
  try {
    const r = await Notifications.requestExactAlarmPermissionsAsync()
    return !!r.granted
  } catch {
    Linking.openSettings() // e.g. permission not declared in this build (Expo Go)
    return false
  }
}

// ------------------------------------------------------------------- settings
export async function getReminderSettings() {
  const [enabled, option, custom] = await Promise.all([
    AsyncStorage.getItem("remindersEnabled"),
    AsyncStorage.getItem("reminderTime"),
    AsyncStorage.getItem("customReminderTime"),
  ])
  return {
    enabled: enabled === null ? true : JSON.parse(enabled),
    option: option || "Whole day",
    customTime: custom || "09:00",
  }
}

export async function saveCustomReminderTime(date) {
  await AsyncStorage.setItem("customReminderTime", `${pad(date.getHours())}:${pad(date.getMinutes())}`)
}

// ----------------------------------------------------------------- scheduling
function buildReminders(task, settings, now) {
  const due = new Date(task.date)
  if (isNaN(due)) return []
  const out = []
  const time = fmtTime(due)
  const common = {
    taskId: task.id,
    originalTaskId: task.originalTaskId || task.id,
    recurring: !!task.recurring,
    title: task.title || "Task",
    priority: task.priority || "Normal",
    dueMs: due.getTime(),
  }

  // 1) Early reminder, based on the user's setting
  let early = null
  let body = ""
  if (settings.option === "Whole day") {
    early = new Date(due)
    early.setHours(8, 0, 0, 0)
    body = `Today at ${time} • ${task.priority || "Normal"}`
  } else if (settings.option === "Custom") {
    const [h, m] = settings.customTime.split(":").map(Number)
    early = new Date(due)
    early.setHours(h, m, 0, 0)
    body = `Today at ${time} • ${task.priority || "Normal"}`
  } else if (LEAD_MINUTES[settings.option]) {
    const mins = LEAD_MINUTES[settings.option]
    early = new Date(due.getTime() - mins * 60000)
    body = `Starts in ${mins === 60 ? "1 hour" : mins === 1 ? "1 minute" : `${mins} minutes`} (${time}) • ${task.priority || "Normal"}`
  }
  if (early && early > now && early < due) {
    out.push({ ...common, id: `${task.id}-early`, date: early, body, kind: "early" })
  }

  // 2) Always notify when the task is actually due
  if (due > now) {
    out.push({ ...common, id: `${task.id}-due`, date: due, body: `Due now • ${task.priority || "Normal"}`, kind: "due" })
  }
  return out
}

// ---- snoozed reminders (kept across re-syncs and app restarts) ----
const SNOOZE_KEY = "snoozedReminders"
async function loadSnoozes() {
  try {
    return JSON.parse((await AsyncStorage.getItem(SNOOZE_KEY)) || "[]")
  } catch {
    return []
  }
}
const saveSnoozes = (list) => AsyncStorage.setItem(SNOOZE_KEY, JSON.stringify(list))

export async function snoozeReminder(data, minutes = SNOOZE_MINUTES) {
  const list = (await loadSnoozes()).filter((x) => x.taskId !== data.taskId)
  list.push({
    taskId: data.taskId,
    originalTaskId: data.originalTaskId,
    recurring: !!data.recurring,
    title: data.title,
    priority: data.priority || "Normal",
    dueMs: data.date,
    date: Date.now() + minutes * 60000,
  })
  await saveSnoozes(list)
  await resyncReminders()
}

// Call when a task is completed so a pending snooze doesn't fire afterwards
export async function cancelSnooze(taskId) {
  const list = await loadSnoozes()
  if (!list.some((x) => x.taskId === taskId)) return
  await saveSnoozes(list.filter((x) => x.taskId !== taskId))
  await resyncReminders()
}

async function doSync() {
  const settings = await getReminderSettings()
  if (!settings.enabled) {
    plan = []
    await Notifications.cancelAllScheduledNotificationsAsync()
    return
  }
  const status = await getPermissionStatus()
  if (!status.granted) {
    plan = []
    return
  }
  await ensureChannel()
  await Notifications.cancelAllScheduledNotificationsAsync()

  const now = new Date()
  const snoozes = (await loadSnoozes()).filter((x) => x.date > now.getTime())
  await saveSnoozes(snoozes)
  const snoozeItems = snoozes.map((x) => ({
    ...x,
    id: `${x.taskId}-snooze`,
    date: new Date(x.date),
    body: `Snoozed reminder • ${x.priority}`,
    kind: "snooze",
  }))
  const items = [
    ...snoozeItems,
    ...lastTasks
      .flatMap((t) => buildReminders(t, settings, now))
      .sort((a, b) => a.date - b.date),
  ].slice(0, MAX_SCHEDULED)

  const scheduled = []
  for (const r of items) {
    try {
      await Notifications.scheduleNotificationAsync({
        identifier: r.id,
        content: {
          title: r.title,
          body: r.body,
          sound: "default",
          categoryIdentifier: CATEGORY_ID,
          data: {
            taskId: r.taskId,
            originalTaskId: r.originalTaskId,
            recurring: r.recurring,
            title: r.title,
            priority: r.priority,
            date: r.dueMs,
            kind: r.kind,
          },
        },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: r.date, ...channelProps() },
      })
      scheduled.push(r)
    } catch (e) {
      console.warn("Failed to schedule reminder:", r.id, e?.message)
    }
  }
  plan = scheduled
  console.log(`Reminders: ${scheduled.length} scheduled (${settings.option})`)
}

const runExclusive = (fn) => {
  chain = chain.then(fn).catch((e) => console.warn("Reminder sync failed:", e?.message || e))
  return chain
}

/**
 * Re-schedules every reminder from the given tasks.
 * tasks: [{ id, title, priority, date (ms or Date) }] - only pending, non-archived, non-deleted ones.
 */
export function syncTaskReminders(tasks) {
  lastTasks = tasks
  return runExclusive(doSync)
}

// Call after the user changes a setting (reuses the last task list)
export const resyncReminders = () => runExclusive(doSync)

export const getUpcomingReminders = (limit = 6) =>
  plan.filter((r) => r.date > new Date()).slice(0, limit)

export async function sendTestNotification() {
  const ok = await requestPermission()
  if (!ok) return false
  await Notifications.scheduleNotificationAsync({
    content: { title: "Taskline", body: "Reminders are working 🎉", sound: "default" },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: 5, ...channelProps() },
  })
  return true
}

// ---------------------------------------------------------------- taps
// cb(data, action) - action is "OPEN" (plain tap), "DONE" or "SNOOZE".
// Also fires for the notification that launched the app from a closed state.
export function listenForNotificationTaps(cb) {
  const handle = (resp) => {
    const d = resp?.notification?.request?.content?.data
    if (!d?.date) return
    const id = resp.actionIdentifier
    cb(d, id === Notifications.DEFAULT_ACTION_IDENTIFIER ? "OPEN" : id)
  }
  const last = Notifications.getLastNotificationResponse()
  if (last) {
    handle(last)
    Notifications.clearLastNotificationResponse?.()
  }
  const sub = Notifications.addNotificationResponseReceivedListener(handle)
  return () => sub.remove()
}