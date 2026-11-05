"use client"
import {
  View,
  Text,
  TextInput,
  FlatList,
  Modal,
  Switch,
  ScrollView,
  Platform,
  Image,
  Pressable,
  KeyboardAvoidingView,
  ActivityIndicator,
  RefreshControl,
  Alert,
  StatusBar,
  AppState,
  useWindowDimensions,
} from "react-native"
import { Ionicons } from "@expo/vector-icons"
import {
  syncTaskReminders,
  requestPermission,
  getPermissionStatus,
  hasExactAlarmPermission,
  requestExactAlarmPermission,
  getUpcomingReminders,
  openSystemSettings,
  sendTestNotification,
  listenForNotificationTaps,
  snoozeReminder,
  cancelSnooze,
  ACTION_DONE,
  ACTION_SNOOZE,
  SNOOZE_MINUTES,
} from "../utils/notifications"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import DateTimePickerModal from "react-native-modal-datetime-picker"
import { useState, useEffect, useCallback } from "react"
import { db, auth } from "../firebase/config"
import {
  collection,
  addDoc,
  query,
  where,
  onSnapshot,
  doc,
  updateDoc,
  arrayUnion,
  serverTimestamp,
  getDoc,
  deleteDoc,
} from "firebase/firestore"
import { useNavigation, useIsFocused } from "@react-navigation/native"

// Placeholder avatars
const avatars = {
  profile: "https://blob.v0.dev/pjtmy8OGJ.png",
  user1: "https://blob.v0.dev/pjtmy8OGJ.png",
  user2: "https://blob.v0.dev/pjtmy8OGJ.png",
  user3: "https://blob.v0.dev/pjtmy8OGJ.png",
}


// ---- Tone (colour) mapping for task rows ----
// Class names are written out in full so Tailwind can detect them.
const TONES = {
  green: { bar: "border-l-green-500", tint: "bg-green-500/15", pill: "bg-green-500/20", textL: "text-green-700", textD: "text-green-300", icon: "#16A34A" },
  blue: { bar: "border-l-blue-500", tint: "bg-blue-500/15", pill: "bg-blue-500/15", textL: "text-blue-700", textD: "text-blue-300", icon: "#2563EB" },
  red: { bar: "border-l-red-500", tint: "bg-red-500/15", pill: "bg-red-500/15", textL: "text-red-700", textD: "text-red-300", icon: "#DC2626" },
  amber: { bar: "border-l-amber-500", tint: "bg-amber-500/15", pill: "bg-amber-500/20", textL: "text-amber-700", textD: "text-amber-300", icon: "#D97706" },
}

const PRIORITIES = [
  { key: "Normal", selected: "border-blue-600 bg-blue-600" },
  { key: "Important", selected: "border-amber-500 bg-amber-500" },
  { key: "Very Important", selected: "border-red-500 bg-red-500" },
]

// completed -> green, otherwise by priority
const getTaskTone = (task) => {
  if (task.completed) return "green"
  if (task.priority === "Very Important") return "red"
  if (task.priority === "Important") return "amber"
  return "blue"
}

// 11:10 am style
const formatTime = (d) =>
  new Date(d)
    .toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true })
    .toLowerCase()

// ---- Reusable pieces ----
const TaskRow = ({ task, darkMode, onPress, onToggle, showDate }) => {
  const c = (l, d) => (darkMode ? d : l)
  const tone = TONES[getTaskTone(task)]
  const overdue = !task.completed && new Date(task.instanceDate) < new Date()
  const subtitle = overdue ? "Overdue" : showDate ? new Date(task.instanceDate).toLocaleDateString("en-ZA", { weekday: "short", day: "numeric", month: "short" }) : task.description

  return (
    <View className="mb-3 rounded-2xl shadow-md shadow-blue-900/10" style={{ backgroundColor: darkMode ? "#1B2438" : "#fff" }}>
      <Pressable
        onPress={onPress}
        className={`h-16 flex-row items-center overflow-hidden rounded-2xl border-l-4 active:opacity-80 ${tone.bar}`}
      >
        <View className={`h-full w-[80px] items-center justify-center rounded-r-2xl ${tone.tint}`}>
          <Ionicons name="time-outline" size={16} color={tone.icon} />
          <Text className={`mt-0.5 text-[11px] font-semibold ${c("text-ink", "text-slate-100")}`}>
            {formatTime(task.instanceDate)}
          </Text>
        </View>

        <Pressable
          onPress={onToggle}
          hitSlop={12}
          className={`ml-3 size-[24px] items-center justify-center rounded-full border-2 ${
            task.completed ? "border-green-500 bg-green-500" : c("border-slate-300", "border-slate-600")
          }`}
        >
          {task.completed && <Ionicons name="checkmark" size={15} color="#fff" />}
        </Pressable>

        <View className="mx-3 min-w-0 flex-1">
          <Text
            numberOfLines={1}
            className={`text-[15px] font-semibold ${c("text-ink", "text-slate-50")} ${task.completed ? "line-through opacity-60" : ""}`}
          >
            {task.title}
          </Text>
          {!!subtitle && (
            <Text
              numberOfLines={1}
              className={`mt-0.5 text-xs ${overdue ? "font-semibold text-red-500" : c("text-slate-500", "text-slate-400")}`}
            >
              {subtitle}
            </Text>
          )}
        </View>

        <View className={`mr-3 rounded-full px-2.5 py-1 ${tone.pill}`}>
          <Text numberOfLines={1} className={`text-[11px] font-bold ${c(tone.textL, tone.textD)}`}>
            {task.priority}
          </Text>
        </View>
      </Pressable>
    </View>
  )
}

// Bottom sheet used by every modal
const Sheet = ({ visible, onClose, darkMode, children }) => {
  const { height } = useWindowDimensions()
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <View className="flex-1 justify-end bg-black/50">
        <Pressable className="absolute inset-0" onPress={onClose} />
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined}>
          <View
            style={{ maxHeight: height * 0.9 }}
            className={`rounded-t-[28px] px-5 pb-8 pt-3 ${darkMode ? "bg-night-card" : "bg-white"}`}
          >
            <View className={`mx-auto mb-3 h-1.5 w-10 rounded-full ${darkMode ? "bg-slate-600" : "bg-slate-300"}`} />
            {children}
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  )
}

const SheetHeader = ({ title, onClose, darkMode }) => (
  <View className="mb-4 flex-row items-center justify-between">
    <Text className={`text-xl font-bold ${darkMode ? "text-slate-50" : "text-ink"}`}>{title}</Text>
    <Pressable
      onPress={onClose}
      hitSlop={10}
      className={`size-9 items-center justify-center rounded-full ${darkMode ? "bg-night-row" : "bg-slate-100"}`}
    >
      <Ionicons name="close" size={20} color={darkMode ? "#CBD5E1" : "#475569"} />
    </Pressable>
  </View>
)

const MainScreen = ({ user, theme, darkMode }) => {
  const navigation = useNavigation()
  console.log("MainScreen received user prop:", user ? user.uid : "null")
  const [tasks, setTasks] = useState([])
  const [loadingTasks, setLoadingTasks] = useState(true)
  const [fetchedUsername, setFetchedUsername] = useState(null)
  const [showModal, setShowModal] = useState(false)
  const [editingTask, setEditingTask] = useState(null)
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [showMonthCalendar, setShowMonthCalendar] = useState(false)
  const [currentMonthView, setCurrentMonthView] = useState(new Date())
  const [activeTab, setActiveTab] = useState("Home")
  const [showTaskTabsModal, setShowTaskTabsModal] = useState(false)
  const [currentTaskTab, setCurrentTaskTab] = useState("Upcoming")
  const [showCustomTimePickerModal, setShowCustomTimePickerModal] = useState(false)
  const [tempSelectedHour, setTempSelectedHour] = useState(12)
  const [tempSelectedMinute, setTempSelectedMinute] = useState(0)
  const [tempSelectedAmPm, setTempSelectedAmPm] = useState("AM")
  const [currentEditingTimeTarget, setCurrentEditingTimeTarget] = useState(null)
  const [form, setForm] = useState({
    title: "",
    description: "",
    date: new Date(),
    showDatePicker: false,
    priority: "Normal",
    recurring: false,
    recurringFrequency: "Daily",
    recurringDays: [],
    recurringTime: new Date(),
  })
  const [showMoreModal, setShowMoreModal] = useState(false)
  const [showRemindersModal, setShowRemindersModal] = useState(false)
  const [toast, setToast] = useState(null)
  const showToast = useCallback((msg) => {
    setToast(msg)
    setTimeout(() => setToast(null), 3000)
  }, [])
  const [notifState, setNotifState] = useState({ granted: true, canAskAgain: true, exact: true })
  const [refreshing, setRefreshing] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)


  const insets = useSafeAreaInsets()
  const c = (l, d) => (darkMode ? d : l)

  const isFocused = useIsFocused()

  // ----- Notifications: permission, taps, and top-up when the app comes back to the foreground -----
  const refreshNotifState = useCallback(async () => {
    const [p, exact] = await Promise.all([getPermissionStatus(), hasExactAlarmPermission()])
    setNotifState({ granted: p.granted, canAskAgain: p.canAskAgain, exact })
  }, [])

  useEffect(() => {
    requestPermission().finally(refreshNotifState)
    const stopTaps = listenForNotificationTaps(async (d, action) => {
      setSelectedDate(new Date(d.date))
      setActiveTab("Home")
      try {
        if (action === ACTION_DONE) {
          const ref = doc(db, "tasks", d.originalTaskId)
          if (d.recurring) {
            await updateDoc(ref, { completedInstances: arrayUnion(new Date(d.date).toDateString()) })
          } else {
            await updateDoc(ref, { completed: true })
          }
          await cancelSnooze(d.taskId)
          showToast(`Marked "${d.title}" as done`)
        } else if (action === ACTION_SNOOZE) {
          await snoozeReminder(d)
          showToast(`Snoozed "${d.title}" for ${SNOOZE_MINUTES} minutes`)
        }
      } catch (e) {
        console.warn("Notification action failed:", e?.message)
        showToast("Couldn't complete that action")
      }
    })
    const appStateSub = AppState.addEventListener("change", (state) => {
      if (state === "active") refreshNotifState()
    })
    return () => {
      stopTaps()
      appStateSub.remove()
    }
  }, [])

  // Effect to fetch username from Firestore
  useEffect(() => {
    let ignore = false
    async function getUserProfile() {
      if (!user || !user.uid) {
        setFetchedUsername(null)
        return
      }
      try {
        const userDocRef = doc(db, "users", user.uid)
        const docSnap = await getDoc(userDocRef)
        if (!ignore && docSnap.exists()) {
          const userData = docSnap.data()
          setFetchedUsername(userData.name || null)
        } else if (!ignore) {
          console.log("No user document found in 'users' collection for UID:", user.uid)
          setFetchedUsername(null)
        }
      } catch (error) {
        if (!ignore) {
          console.error("Error fetching user profile:", error)
          setFetchedUsername(null)
        }
      }
    }
    getUserProfile()
    return () => {
      ignore = true
    }
  }, [user])

  // Firebase Data Fetching
  useEffect(() => {
    if (!user) {
      console.log("Firestore listener not set up: User is null.")
      setTasks([])
      setLoadingTasks(false)
      setRefreshing(false)
      return
    }
    console.log("Setting up Firestore listener for user:", user.uid, "with refreshKey:", refreshKey)
    setLoadingTasks(true)
    const tasksCollectionRef = collection(db, "tasks")
    const q = query(tasksCollectionRef, where("userId", "==", user.uid))
    const unsubscribeFirestore = onSnapshot(
      q,
      (snapshot) => {
        const fetchedTasks = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
          date: doc.data().date ? doc.data().date.toDate() : new Date(),
          recurringTime: doc.data().recurringTime ? doc.data().recurringTime.toDate() : null,
        }))
        setTasks(fetchedTasks)
        setLoadingTasks(false)
        setRefreshing(false)
        console.log("Fetched tasks from Firestore:", fetchedTasks.length, "tasks.")
        if (fetchedTasks.length === 0) {
          console.log("No tasks found for this user. Check Firestore 'tasks' collection and 'userId' field.")
        }
      },
      (error) => {
        console.error("Error fetching tasks: ", error)
        setLoadingTasks(false)
        setRefreshing(false)
        alert("Failed to load tasks. Please try again.")
      },
    )
    return () => {
      console.log("Unsubscribing from Firestore listener.")
      unsubscribeFirestore()
    }
  }, [user, refreshKey])

  const onRefresh = useCallback(() => {
    setRefreshing(true)
    setRefreshKey((prevKey) => prevKey + 1)
  }, [])

  const isTaskCompletedForDate = (taskId, date) => {
    const originalTask = tasks.find((t) => t.id === taskId)
    if (!originalTask || !originalTask.recurring) return false
    const dateStr = date.toDateString()
    return (originalTask.completedInstances || []).includes(dateStr)
  }

  const getNextOccurrence = (date, frequency, recurringDays, recurringTime) => {
    const nextDate = new Date(date)
    switch (frequency) {
      case "Daily":
        nextDate.setDate(nextDate.getDate() + 1)
        break
      case "Weekly":
        nextDate.setDate(nextDate.getDate() + 7)
        break
      case "Monthly":
        nextDate.setMonth(nextDate.getMonth() + 1)
        break
      case "Yearly":
        nextDate.setFullYear(nextDate.getFullYear() + 1)
        break
      case "Custom":
        let foundNextDay = false
        while (!foundNextDay) {
          nextDate.setDate(nextDate.getDate() + 1)
          if (recurringDays.includes(nextDate.getDay())) {
            foundNextDay = true
          }
        }
        if (recurringTime) {
          nextDate.setHours(recurringTime.getHours())
          nextDate.setMinutes(recurringTime.getMinutes())
          nextDate.setSeconds(recurringTime.getSeconds())
          nextDate.setMilliseconds(recurringTime.getMilliseconds())
        }
        break
    }
    return nextDate
  }

  const getExpandedTasks = () => {
    const expandedTasks = []
    const today = new Date()
    tasks.forEach((task) => {
      if (!task.recurring) {
        expandedTasks.push({
          ...task,
          instanceDate: task.date,
        })
      } else {
        let currentDate = new Date(task.date)
        const endDate = new Date(today)
        endDate.setDate(endDate.getDate() + 365)
        while (currentDate <= endDate) {
          let shouldAddInstance = false
          const instanceDate = new Date(currentDate)
          if (task.recurringFrequency === "Custom") {
            if (task.recurringDays.includes(currentDate.getDay())) {
              shouldAddInstance = true
              if (task.recurringTime) {
                const recTime = new Date(task.recurringTime)
                instanceDate.setHours(recTime.getHours())
                instanceDate.setMinutes(recTime.getMinutes())
                instanceDate.setSeconds(recTime.getSeconds())
                instanceDate.setMilliseconds(recTime.getMilliseconds())
              }
            }
          } else {
            shouldAddInstance = true
          }
          if (shouldAddInstance) {
            const isCompleted = isTaskCompletedForDate(task.id, instanceDate)
            expandedTasks.push({
              ...task,
              instanceDate: new Date(instanceDate),
              completed: isCompleted,
              id: `${task.id}_${instanceDate.toDateString()}`,
              originalTaskId: task.id,
            })
          }
          currentDate = getNextOccurrence(currentDate, task.recurringFrequency, task.recurringDays, task.recurringTime)
        }
      }
    })
    console.log("Generated expanded tasks:", expandedTasks.length, "tasks.")
    return expandedTasks
  }

  const tasksForSelectedDate = getExpandedTasks()
    .filter((task) => {
      const originalTask = tasks.find((t) => t.id === task.originalTaskId || t.id === task.id)
      const isOriginalTaskValid = originalTask && !originalTask.deleted && !originalTask.archived
      const taskDate = new Date(task.instanceDate)
      const isDateMatch = taskDate.toDateString() === selectedDate.toDateString()
      return isOriginalTaskValid && isDateMatch
    })
    .sort((a, b) => new Date(a.instanceDate) - new Date(b.instanceDate))

  const openAddModal = () => {
    setEditingTask(null)
    const now = new Date()
    setForm({
      title: "",
      description: "",
      date: now,
      showDatePicker: false,
      priority: "Normal",
      recurring: false,
      recurringFrequency: "Daily",
      recurringDays: [],
      recurringTime: now,
    })
    let hours = now.getHours()
    const minutes = now.getMinutes()
    let ampm = "AM"
    if (hours >= 12) {
      ampm = "PM"
      if (hours > 12) hours -= 12
    } else if (hours === 0) {
      hours = 12
    }
    setTempSelectedHour(hours)
    setTempSelectedMinute(minutes - (minutes % 5))
    setTempSelectedAmPm(ampm)
    setCurrentEditingTimeTarget("mainDate")
    setShowModal(true)
  }

  const closeModal = () => {
    setShowModal(false)
    setForm({
      title: "",
      description: "",
      date: new Date(),
      showDatePicker: false,
      priority: "Normal",
      recurring: false,
      recurringFrequency: "Daily",
      recurringDays: [],
      recurringTime: new Date(),
    })
    setEditingTask(null)
    setTempSelectedHour(12)
    setTempSelectedMinute(0)
    setTempSelectedAmPm("AM")
    setCurrentEditingTimeTarget(null)
  }

  const handleSave = async () => {
    console.log("Attempting to save task. Current user:", user ? user.uid : "null")
    if (!form.title.trim()) {
      alert("Task title cannot be empty.")
      return
    }
    if (!user) {
      alert("You must be logged in to save tasks.")
      return
    }
    const finalMainDate = new Date(form.date)
    let mainHour = tempSelectedHour
    if (tempSelectedAmPm === "PM" && mainHour !== 12) {
      mainHour += 12
    } else if (tempSelectedAmPm === "AM" && mainHour === 12) {
      mainHour = 0
    }
    finalMainDate.setHours(mainHour, tempSelectedMinute, 0, 0)
    const now = new Date()
    if (!editingTask && finalMainDate < now) {
      alert("Cannot create a task in the past!")
      return
    } else if (editingTask) {
      const originalTaskInFirestore = tasks.find((t) => t.id === editingTask.originalTaskId || t.id === editingTask.id)
      if (originalTaskInFirestore && finalMainDate < now && finalMainDate < new Date(originalTaskInFirestore.date)) {
        alert("Cannot set task to an earlier past time!")
        return
      }
    }
    let finalRecurringTime = null
    if (form.recurring && form.recurringFrequency === "Custom") {
      const newRecTime = new Date()
      let recHour = tempSelectedHour
      if (tempSelectedAmPm === "PM" && recHour !== 12) {
        recHour += 12
      } else if (tempSelectedAmPm === "AM" && recHour === 12) {
        recHour = 0
      }
      newRecTime.setHours(recHour, tempSelectedMinute, 0, 0)
      finalRecurringTime = newRecTime
    }
    const taskData = {
      title: form.title,
      description: form.description,
      date: finalMainDate,
      priority: form.priority,
      recurring: form.recurring,
      recurringFrequency: form.recurringFrequency,
      recurringDays: form.recurringFrequency === "Custom" ? form.recurringDays : [],
      recurringTime: finalRecurringTime,
      completed: false,
      archived: false,
      deleted: false,
      color: [theme.primary, theme.success, theme.danger, theme.warning, "#9B59B6"][Math.floor(Math.random() * 5)],
      avatar: avatars.user1,
      userId: user.uid,
      completedInstances: [],
    }
    try {
      if (editingTask) {
        const originalTaskId = editingTask.originalTaskId || editingTask.id
        const taskRef = doc(db, "tasks", originalTaskId)
        await updateDoc(taskRef, taskData)
        alert("Task updated successfully!")
      } else {
        await addDoc(collection(db, "tasks"), {
          ...taskData,
          createdAt: serverTimestamp(),
        })
        alert("Task created successfully!")
        setSelectedDate(finalMainDate)
      }
      closeModal()
    } catch (error) {
      console.error("Error saving task: ", error)
      alert("Failed to save task. Please try again.")
    }
  }

  const handleEdit = (task) => {
    const originalTask = tasks.find((t) => t.id === task.originalTaskId || t.id === task.id)
    if (!originalTask) return
    setEditingTask(task)
    setForm({
      title: originalTask.title,
      description: originalTask.description || "",
      date: new Date(originalTask.date),
      showDatePicker: false,
      priority: originalTask.priority,
      recurring: originalTask.recurring || false,
      recurringFrequency: originalTask.recurringFrequency || "Daily",
      recurringDays: originalTask.recurringDays || [],
      recurringTime: originalTask.recurringTime ? new Date(originalTask.recurringTime) : new Date(),
    })
    const mainDate = new Date(originalTask.date)
    let hours = mainDate.getHours()
    const minutes = mainDate.getMinutes()
    let ampm = "AM"
    if (hours >= 12) {
      ampm = "PM"
      if (hours > 12) hours -= 12
    } else if (hours === 0) {
      hours = 12
    }
    setTempSelectedHour(hours)
    setTempSelectedMinute(minutes - (minutes % 5))
    setTempSelectedAmPm(ampm)
    setCurrentEditingTimeTarget("mainDate")
    setShowModal(true)
  }

  const markTaskComplete = async (taskToComplete) => {
    if (!user) {
      alert("You must be logged in to mark tasks complete.")
      return
    }
    const originalTaskId = taskToComplete.originalTaskId || taskToComplete.id
    const taskRef = doc(db, "tasks", originalTaskId)
    try {
      if (taskToComplete.recurring) {
        const dateStr = new Date(taskToComplete.instanceDate).toDateString()
        const originalTask = tasks.find((t) => t.id === originalTaskId)
        let currentCompletedInstances = originalTask.completedInstances || []
        if (isTaskCompletedForDate(taskToComplete.originalTaskId, taskToComplete.instanceDate)) {
          currentCompletedInstances = currentCompletedInstances.filter(
            (completionDateStr) => completionDateStr !== dateStr,
          )
        } else {
          currentCompletedInstances = [...currentCompletedInstances, dateStr]
        }
        await updateDoc(taskRef, { completedInstances: currentCompletedInstances })
      } else {
        await updateDoc(taskRef, { completed: !taskToComplete.completed })
      }
      alert("Task completion status updated!")
      closeModal()
    } catch (error) {
      console.error("Error updating task completion: ", error)
      alert("Failed to update task completion. Please try again.")
    }
  }

  // Quick toggle from the checkbox on a task row (no alert / modal)
  const toggleTaskCompleteQuick = async (task) => {
    if (!user) return
    if (!task.completed) cancelSnooze(task.id)
    const originalTaskId = task.originalTaskId || task.id
    const taskRef = doc(db, "tasks", originalTaskId)
    try {
      if (task.recurring) {
        const dateStr = new Date(task.instanceDate).toDateString()
        const originalTask = tasks.find((t) => t.id === originalTaskId)
        let instances = (originalTask && originalTask.completedInstances) || []
        instances = instances.includes(dateStr) ? instances.filter((d) => d !== dateStr) : [...instances, dateStr]
        await updateDoc(taskRef, { completedInstances: instances })
      } else {
        await updateDoc(taskRef, { completed: !task.completed })
      }
    } catch (error) {
      console.error("Error toggling task: ", error)
      alert("Failed to update task. Please try again.")
    }
  }

  const archiveTask = async (taskToArchive) => {
    if (!user) {
      alert("You must be logged in to archive tasks.")
      return
    }
    const originalTaskId = taskToArchive.originalTaskId || taskToArchive.id
    const taskRef = doc(db, "tasks", originalTaskId)
    try {
      const originalTask = tasks.find((t) => t.id === originalTaskId)
      await updateDoc(taskRef, { archived: !originalTask.archived, deleted: false })
      alert("Task archive status updated!")
      closeModal()
    } catch (error) {
      console.error("Error archiving task: ", error)
      alert("Failed to archive task. Please try again.")
    }
  }

  const deleteTask = async (taskToDelete) => {
    if (!user) {
      alert("You must be logged in to delete tasks.")
      return
    }
    const originalTaskId = taskToDelete.originalTaskId || taskToDelete.id
    const taskRef = doc(db, "tasks", originalTaskId)
    try {
      const originalTask = tasks.find((t) => t.id === originalTaskId)
      await updateDoc(taskRef, { deleted: !originalTask.deleted, archived: false })
      alert("Task delete status updated!")
      closeModal()
    } catch (error) {
      console.error("Error deleting task: ", error)
      alert("Failed to delete task. Please try again.")
    }
  }

  const permanentlyDeleteTask = async (taskToDelete) => {
    if (!user) {
      alert("You must be logged in to permanently delete tasks.")
      return
    }

    // Show confirmation dialog
    Alert.alert(
      "Permanently Delete Task",
      "This action cannot be undone. Are you sure you want to permanently delete this task?",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Delete Forever",
          style: "destructive",
          onPress: async () => {
            try {
              const originalTaskId = taskToDelete.originalTaskId || taskToDelete.id
              const taskRef = doc(db, "tasks", originalTaskId)
              await deleteDoc(taskRef)
              alert("Task permanently deleted!")
              closeModal()
            } catch (error) {
              console.error("Error permanently deleting task: ", error)
              alert("Failed to permanently delete task. Please try again.")
            }
          },
        },
      ],
    )
  }

  const daysOfWeek = Array.from({ length: 7 }, (_, i) => {
    const date = new Date(selectedDate)
    date.setDate(date.getDate() - date.getDay() + i)
    const isSelected = date.toDateString() === selectedDate.toDateString()
    return {
      label: date.toLocaleDateString("en-ZA", { weekday: "short", day: "numeric" }),
      date,
      isSelected,
    }
  })

  const getIcon = (tab, active) => {
    switch (tab) {
      case "Home":
        return active ? "home" : "home-outline"
      case "Tasks":
        return "list"
      case "More":
        return "ellipsis-horizontal"
      case "Profile":
        return active ? "person" : "person-outline"
      default:
        return "square-outline"
    }
  }

  const getGreeting = () => {
    const hour = new Date().getHours()
    if (hour < 12) return "Good Morning"
    if (hour < 18) return "Good Afternoon"
    return "Good Evening"
  }

  const toggleRecurringDay = (dayIndex) => {
    setForm((prev) => {
      const newDays = prev.recurringDays.includes(dayIndex)
        ? prev.recurringDays.filter((d) => d !== dayIndex)
        : [...prev.recurringDays, dayIndex]
      return { ...prev, recurringDays: newDays.sort((a, b) => a - b) }
    })
  }

  const allExpandedTasks = getExpandedTasks()
  const deletedTasks = allExpandedTasks
    .filter((task) => {
      const originalTask = tasks.find((t) => t.id === task.originalTaskId || t.id === task.id)
      return originalTask && originalTask.deleted
    })
    .sort((a, b) => new Date(b.instanceDate) - new Date(a.instanceDate))

  const archivedTasks = allExpandedTasks
    .filter((task) => {
      const originalTask = tasks.find((t) => t.id === task.originalTaskId || t.id === task.id)
      return originalTask && originalTask.archived && !originalTask.deleted
    })
    .sort((a, b) => new Date(b.instanceDate) - new Date(a.instanceDate))

  const completedTasks = allExpandedTasks
    .filter((task) => {
      const originalTask = tasks.find((t) => t.id === task.originalTaskId || t.id === task.id)
      return task.completed && !originalTask.deleted && !originalTask.archived
    })
    .sort((a, b) => new Date(b.instanceDate) - new Date(a.instanceDate))

  const upcomingTasks = allExpandedTasks
    .filter((task) => {
      const originalTask = tasks.find((t) => t.id === task.originalTaskId || t.id === task.id)
      const instanceDate = new Date(task.instanceDate)
      const now = new Date()
      now.setHours(0, 0, 0, 0)
      return !task.completed && !originalTask.deleted && !originalTask.archived && instanceDate >= now
    })
    .sort((a, b) => new Date(a.instanceDate) - new Date(b.instanceDate))

  const getTasksForCurrentTab = () => {
    switch (currentTaskTab) {
      case "Deleted":
        return deletedTasks
      case "Archive":
        return archivedTasks
      case "Complete":
        return completedTasks
      case "Upcoming":
      default:
        return upcomingTasks
    }
  }


  const generateHours = () => {
    return Array.from({ length: 12 }, (_, i) => (i === 0 ? 12 : i))
  }

  const generateMinutes = () => {
    return Array.from({ length: 12 }, (_, i) => i * 5)
  }

  const openCustomTimePicker = (targetField) => {
    setCurrentEditingTimeTarget(targetField)
    let timeToParse
    if (targetField === "mainDate") {
      timeToParse = form.date
    } else if (targetField === "recurringTime") {
      timeToParse = form.recurringTime
    }
    const now = new Date()
    if (timeToParse) {
      let hours = timeToParse.getHours()
      const minutes = timeToParse.getMinutes()
      let ampm = "AM"
      if (hours >= 12) {
        ampm = "PM"
        if (hours > 12) hours -= 12
      } else if (hours === 0) {
        hours = 12
      }
      setTempSelectedHour(hours)
      setTempSelectedMinute(minutes - (minutes % 5))
      setTempSelectedAmPm(ampm)
    } else {
      let hours = now.getHours()
      const minutes = now.getMinutes()
      let ampm = "AM"
      if (hours >= 12) {
        ampm = "PM"
        if (hours > 12) hours -= 12
      } else if (hours === 0) {
        hours = 12
      }
      setTempSelectedHour(hours)
      setTempSelectedMinute(minutes - (minutes % 5))
      setTempSelectedAmPm(ampm)
    }
    setShowCustomTimePickerModal(true)
  }

  const handleCustomTimePickerConfirm = () => {
    const newTime = new Date()
    let hour = tempSelectedHour
    if (tempSelectedAmPm === "PM" && hour !== 12) {
      hour += 12
    } else if (tempSelectedAmPm === "AM" && hour === 12) {
      hour = 0
    }
    newTime.setHours(hour, tempSelectedMinute, 0, 0)
    setForm((prevForm) => {
      if (currentEditingTimeTarget === "mainDate") {
        const updatedDate = new Date(prevForm.date)
        updatedDate.setHours(newTime.getHours(), newTime.getMinutes(), newTime.getSeconds(), newTime.getMilliseconds())
        return { ...prevForm, date: updatedDate }
      } else if (currentEditingTimeTarget === "recurringTime") {
        return { ...prevForm, recurringTime: newTime }
      }
      return prevForm
    })
    setShowCustomTimePickerModal(false)
  }

  const handleSettingsPress = () => {
    console.log("Settings pressed")
    setShowMoreModal(false)
    navigation.navigate("Settings")
  }

  const handlePrivacyPolicyPress = () => {
    console.log("Privacy Policy pressed")
    setShowMoreModal(false)
    navigation.navigate("Privacy")
  }

  const handleTermsAndConditionsPress = () => {
    console.log("Terms and Conditions pressed")
    setShowMoreModal(false)
    navigation.navigate("Terms")
  }

  const handleCheckForUpdatesPress = () => {
    console.log("Check for updates pressed")
    setShowMoreModal(false)
    alert("Checking for updates...")
  }

  const handleLogoutPress = async () => {
    console.log("Logout pressed")
    setShowMoreModal(false)
    try {
      await auth.signOut()
      alert("Logged out successfully!")
    } catch (error) {
      console.error("Error logging out:", error)
      alert("Failed to log out. Please try again.")
    }
  }

  // ----- schedule local reminders for every pending, future task -----
  const nowMs = Date.now()
  const reminderTasks = allExpandedTasks
    .filter((t) => {
      const o = tasks.find((x) => x.id === t.originalTaskId || x.id === t.id)
      return o && !o.deleted && !o.archived && !t.completed && new Date(t.instanceDate).getTime() > nowMs
    })
    .map((t) => ({
      id: t.id,
      originalTaskId: t.originalTaskId || t.id,
      recurring: !!t.recurring,
      title: t.title,
      priority: t.priority,
      date: new Date(t.instanceDate).getTime(),
    }))
    .sort((a, b) => a.date - b.date)
    .slice(0, 80)
  const reminderSignature = reminderTasks.map((t) => `${t.id}|${t.date}|${t.title}|${t.priority}`).join(";")

  useEffect(() => {
    syncTaskReminders(reminderTasks)
  }, [reminderSignature])

  // ----- derived values for the UI -----
  const doneToday = tasksForSelectedDate.filter((t) => t.completed).length
  const totalToday = tasksForSelectedDate.length
  const progress = totalToday === 0 ? 0 : Math.round((doneToday / totalToday) * 100)
  const pendingToday = totalToday - doneToday
  const isSelectedToday = selectedDate.toDateString() === new Date().toDateString()

  const taskDays = new Set(
    allExpandedTasks
      .filter((t) => {
        const o = tasks.find((x) => x.id === t.originalTaskId || x.id === t.id)
        return o && !o.deleted && !o.archived
      })
      .map((t) => new Date(t.instanceDate).toDateString()),
  )

  const tabCounts = { Upcoming: upcomingTasks.length, Complete: completedTasks.length, Archive: archivedTasks.length, Deleted: deletedTasks.length }
  const heroHeight = insets.top + 150
  const navBottom = Math.max(insets.bottom, 10) + 8
  const placeholderColor = darkMode ? "#64748B" : "#94A3B8"
  const iconMuted = darkMode ? "#94A3B8" : "#64748B"
  const field = c("border-slate-200 bg-slate-50", "border-slate-700 bg-night-row")
  const textMain = c("text-ink", "text-slate-50")
  const textMuted = c("text-slate-500", "text-slate-400")
  const originalOfEditing = editingTask ? tasks.find((t) => t.id === editingTask.originalTaskId || t.id === editingTask.id) : null

  const renderRow = (task, showDate = false) => (
    <TaskRow
      key={task.id}
      task={task}
      darkMode={darkMode}
      showDate={showDate}
      onPress={() => handleEdit(task)}
      onToggle={() => toggleTaskCompleteQuick(task)}
    />
  )

  return (
    <View className={`flex-1 ${c("bg-page", "bg-night")}`}>
      {isFocused && <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />}

      {/* ================= Hero header ================= */}
      <View style={{ height: heroHeight }} className="w-full overflow-hidden bg-hero">
        <View className="absolute -inset-x-16 -bottom-10 h-36 rounded-full bg-sky-300/30" />
        <Image
          source={require("../assets/header-skyline.png")}
          resizeMode="cover"
          className="absolute right-0 top-2 h-[88%] w-4/5"
        />
        <View className="absolute left-5 right-20" style={{ top: insets.top + 14 }}>
          <Text className="text-[26px] font-extrabold text-white">{getGreeting()}</Text>
          {user && fetchedUsername ? <Text className="mt-0.5 text-lg text-white/90">{fetchedUsername}</Text> : null}
          <View className="mt-2 h-1 w-14 rounded-full bg-green-400" />
        </View>
        <Pressable
          onPress={() => {
            refreshNotifState()
            setShowRemindersModal(true)
          }}
          hitSlop={10}
          className="absolute right-5 size-10 items-center justify-center rounded-full bg-white/15 active:bg-white/25"
          style={{ top: insets.top + 12 }}
        >
          <Ionicons name="notifications-outline" size={22} color="#fff" />
          {pendingToday > 0 && <View className="absolute right-2 top-2 size-2.5 rounded-full border border-hero bg-red-500" />}
        </Pressable>
        <View className="absolute -inset-x-20 -bottom-16 h-24 rotate-[-2deg] rounded-full bg-green-500" />
        <View className={`absolute -inset-x-16 -bottom-20 h-24 rounded-full ${c("bg-page", "bg-night")}`} />
      </View>

      {loadingTasks && refreshing ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#0B6CF0" />
          <Text className={`mt-3 text-base ${textMuted}`}>Loading tasks...</Text>
        </View>
      ) : (
        <View
          style={{ marginBottom: navBottom + 64 + 12 }}
          className={`-mt-6 mx-3 flex-1 rounded-3xl shadow-lg shadow-blue-900/15 ${c("bg-white", "bg-night-card")}`}
        >
          <View className="flex-1 overflow-hidden rounded-3xl pt-5">
            {/* Date + count */}
            <View className="mb-4 flex-row items-center justify-between px-5">
              <View className="flex-row items-center">
                <View className="size-12 items-center justify-center rounded-2xl bg-brand/10">
                  <Ionicons name="calendar-outline" size={26} color="#0B6CF0" />
                </View>
                <View className="ml-3">
                  <Text className={`text-xl font-extrabold ${textMain}`}>
                    {selectedDate.toLocaleDateString("en-US", { month: "long", day: "numeric" })}
                  </Text>
                  <Text className={`text-[13px] ${textMuted}`}>
                    {totalToday} {totalToday === 1 ? "task" : "tasks"} {isSelectedToday ? "today" : "this day"}
                  </Text>
                </View>
              </View>
              <Pressable
                onPress={() => setShowMonthCalendar(true)}
                className="size-11 items-center justify-center rounded-full bg-green-500/15 active:opacity-70"
              >
                <Ionicons name="calendar" size={20} color="#16A34A" />
              </Pressable>
            </View>

            {/* Progress */}
            {totalToday > 0 && (
              <View className="mb-4 px-5">
                <View className="mb-1.5 flex-row items-center justify-between">
                  <Text className={`text-xs font-medium ${textMuted}`}>
                    {doneToday} of {totalToday} completed
                  </Text>
                  <Text className="text-xs font-bold text-green-600">{progress}%</Text>
                </View>
                <View className={`h-1.5 overflow-hidden rounded-full ${c("bg-slate-100", "bg-night-row")}`}>
                  <View className="h-full rounded-full bg-green-500" style={{ width: `${progress}%` }} />
                </View>
              </View>
            )}

            {/* Week strip */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              className="mb-3 grow-0"
              contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 6, gap: 8 }}
            >
              {daysOfWeek.map((d, i) => {
                const isToday = d.date.toDateString() === new Date().toDateString()
                const has = taskDays.has(d.date.toDateString())
                return (
                  <Pressable
                    key={i}
                    onPress={() => setSelectedDate(d.date)}
                    className={`h-16 w-12 items-center justify-center rounded-2xl border active:opacity-80 ${
                      d.isSelected
                        ? "border-brand bg-brand shadow-md shadow-blue-500/40"
                        : c("border-slate-200 bg-slate-100", "border-slate-700 bg-night-row")
                    }`}
                  >
                    <Text
                      className={`text-xs font-medium ${
                        d.isSelected ? "text-white/90" : isToday ? "text-brand" : textMuted
                      }`}
                    >
                      {d.label.split(" ")[0]}
                    </Text>
                    <Text className={`text-lg font-bold ${d.isSelected ? "text-white" : textMain}`}>
                      {d.label.split(" ")[1]}
                    </Text>
                    <View
                      className={`mt-0.5 size-1 rounded-full ${
                        d.isSelected ? "bg-white" : has ? "bg-brand" : "bg-transparent"
                      }`}
                    />
                  </Pressable>
                )
              })}
            </ScrollView>

            {/* Task list */}
            <ScrollView
              className="flex-1"
              contentContainerStyle={{ paddingHorizontal: 12, paddingTop: 6, paddingBottom: 100 }}
              showsVerticalScrollIndicator={false}
              refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#0B6CF0" />}
            >
              {tasksForSelectedDate.map((task) => renderRow(task))}
              {totalToday === 0 && (
                <View className="items-center px-8 pt-8">
                  <View className="size-20 items-center justify-center rounded-full bg-brand/10">
                    <Ionicons name="checkmark-done" size={38} color="#0B6CF0" />
                  </View>
                  <Text className={`mt-4 text-lg font-bold ${textMain}`}>Nothing planned</Text>
                  <Text className={`mt-1 text-center text-sm ${textMuted}`}>
                    You have no tasks for this day. Enjoy the free time or add something new.
                  </Text>
                  <Pressable onPress={openAddModal} className="mt-5 rounded-full bg-brand px-6 py-3 active:opacity-80">
                    <Text className="font-bold text-white">Add a task</Text>
                  </Pressable>
                </View>
              )}
            </ScrollView>

            {/* FAB */}
            <Pressable
              onPress={openAddModal}
              className="absolute bottom-5 right-5 size-[54px] items-center justify-center rounded-full bg-green-600 shadow-lg shadow-green-600/50 active:scale-95"
            >
              <Ionicons name="add" size={30} color="#fff" />
            </Pressable>
          </View>
        </View>
      )}

      {/* ================= Add / Edit task sheet ================= */}
      <Sheet visible={showModal} onClose={closeModal} darkMode={darkMode}>
        <SheetHeader title={editingTask ? "Edit task" : "New task"} onClose={closeModal} darkMode={darkMode} />
        <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          <TextInput
            placeholder="What needs to be done?"
            placeholderTextColor={placeholderColor}
            value={form.title}
            onChangeText={(title) => setForm((prev) => ({ ...prev, title }))}
            className={`mb-3 rounded-2xl border px-4 py-3.5 text-base ${field} ${textMain}`}
          />
          <TextInput
            placeholder="Description (optional)"
            placeholderTextColor={placeholderColor}
            value={form.description}
            onChangeText={(description) => setForm((prev) => ({ ...prev, description }))}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
            className={`mb-4 h-24 rounded-2xl border px-4 py-3.5 text-base ${field} ${textMain}`}
          />

          <View className="mb-4 flex-row gap-3">
            <Pressable
              onPress={() => setForm((prev) => ({ ...prev, showDatePicker: true }))}
              className={`flex-1 flex-row items-center rounded-2xl border px-3.5 py-3 active:opacity-80 ${field}`}
            >
              <Ionicons name="calendar-outline" size={20} color="#0B6CF0" />
              <View className="ml-2.5">
                <Text className={`text-[11px] ${textMuted}`}>Date</Text>
                <Text className={`text-[15px] font-semibold ${textMain}`}>
                  {form.date.toLocaleDateString("en-ZA", { day: "numeric", month: "short", year: "numeric" })}
                </Text>
              </View>
            </Pressable>
            <Pressable
              onPress={() => openCustomTimePicker("mainDate")}
              className={`flex-1 flex-row items-center rounded-2xl border px-3.5 py-3 active:opacity-80 ${field}`}
            >
              <Ionicons name="time-outline" size={20} color="#0B6CF0" />
              <View className="ml-2.5">
                <Text className={`text-[11px] ${textMuted}`}>Time</Text>
                <Text className={`text-[15px] font-semibold ${textMain}`}>{formatTime(form.date)}</Text>
              </View>
            </Pressable>
          </View>
          <DateTimePickerModal
            isVisible={form.showDatePicker}
            mode="date"
            date={form.date}
            minimumDate={new Date()}
            onConfirm={(date) => setForm((prev) => ({ ...prev, date, showDatePicker: false }))}
            onCancel={() => setForm((prev) => ({ ...prev, showDatePicker: false }))}
            themeVariant={darkMode ? "dark" : "light"}
          />

          <Text className={`mb-2 text-sm font-semibold ${textMain}`}>Priority</Text>
          <View className="mb-4 flex-row gap-2">
            {PRIORITIES.map((p) => {
              const sel = form.priority === p.key
              return (
                <Pressable
                  key={p.key}
                  onPress={() => setForm((prev) => ({ ...prev, priority: p.key }))}
                  className={`flex-1 items-center rounded-xl border py-2.5 active:opacity-80 ${sel ? p.selected : field}`}
                >
                  <Text className={`text-[13px] font-semibold ${sel ? "text-white" : textMuted}`}>{p.key}</Text>
                </Pressable>
              )
            })}
          </View>

          <View className={`mb-4 flex-row items-center justify-between rounded-2xl border px-4 py-2.5 ${field}`}>
            <View className="flex-row items-center">
              <Ionicons name="repeat" size={20} color="#0B6CF0" />
              <Text className={`ml-2.5 text-[15px] font-semibold ${textMain}`}>Repeat this task</Text>
            </View>
            <Switch
              value={form.recurring}
              onValueChange={(val) => setForm((prev) => ({ ...prev, recurring: val }))}
              trackColor={{ false: darkMode ? "#334155" : "#CBD5E1", true: "#0B6CF0" }}
              thumbColor="#fff"
            />
          </View>

          {form.recurring && (
            <View className="mb-2">
              <Text className={`mb-2 text-sm font-semibold ${textMain}`}>Frequency</Text>
              <View className="mb-4 flex-row flex-wrap gap-2">
                {["Daily", "Weekly", "Monthly", "Yearly", "Custom"].map((freq) => {
                  const sel = form.recurringFrequency === freq
                  return (
                    <Pressable
                      key={freq}
                      onPress={() => setForm((prev) => ({ ...prev, recurringFrequency: freq }))}
                      className={`rounded-full border px-4 py-2 active:opacity-80 ${sel ? "border-brand bg-brand" : field}`}
                    >
                      <Text className={`text-[13px] font-semibold ${sel ? "text-white" : textMuted}`}>{freq}</Text>
                    </Pressable>
                  )
                })}
              </View>

              {form.recurringFrequency === "Custom" && (
                <>
                  <Text className={`mb-2 text-sm font-semibold ${textMain}`}>Days</Text>
                  <View className="mb-4 flex-row justify-between">
                    {["S", "M", "T", "W", "T", "F", "S"].map((day, index) => {
                      const sel = form.recurringDays.includes(index)
                      return (
                        <Pressable
                          key={index}
                          onPress={() => toggleRecurringDay(index)}
                          className={`size-10 items-center justify-center rounded-full border active:opacity-80 ${sel ? "border-brand bg-brand" : field}`}
                        >
                          <Text className={`text-sm font-bold ${sel ? "text-white" : textMuted}`}>{day}</Text>
                        </Pressable>
                      )
                    })}
                  </View>
                  <Pressable
                    onPress={() => openCustomTimePicker("recurringTime")}
                    className={`mb-2 flex-row items-center justify-between rounded-2xl border px-4 py-3 active:opacity-80 ${field}`}
                  >
                    <Text className={`text-[15px] font-semibold ${textMain}`}>Repeat time</Text>
                    <Text className="text-[15px] font-bold text-brand">{formatTime(form.recurringTime)}</Text>
                  </Pressable>
                </>
              )}
            </View>
          )}

          {editingTask && (
            <View className={`mb-2 mt-2 flex-row flex-wrap gap-2 border-t pt-4 ${c("border-slate-200", "border-slate-700")}`}>
              <Pressable
                onPress={() => markTaskComplete(editingTask)}
                className="flex-row items-center rounded-xl bg-green-600 px-3.5 py-2.5 active:opacity-80"
              >
                <Ionicons name={editingTask.completed ? "checkmark-circle" : "checkmark-circle-outline"} size={18} color="#fff" />
                <Text className="ml-1.5 text-xs font-bold text-white">{editingTask.completed ? "Unmark" : "Complete"}</Text>
              </Pressable>
              <Pressable
                onPress={() => archiveTask(editingTask)}
                className="flex-row items-center rounded-xl bg-amber-500 px-3.5 py-2.5 active:opacity-80"
              >
                <Ionicons name={originalOfEditing?.archived ? "archive" : "archive-outline"} size={18} color="#fff" />
                <Text className="ml-1.5 text-xs font-bold text-white">{originalOfEditing?.archived ? "Unarchive" : "Archive"}</Text>
              </Pressable>
              <Pressable
                onPress={() => deleteTask(editingTask)}
                className="flex-row items-center rounded-xl bg-red-500 px-3.5 py-2.5 active:opacity-80"
              >
                <Ionicons name={originalOfEditing?.deleted ? "trash" : "trash-outline"} size={18} color="#fff" />
                <Text className="ml-1.5 text-xs font-bold text-white">{originalOfEditing?.deleted ? "Undelete" : "Delete"}</Text>
              </Pressable>
              {originalOfEditing?.deleted && (
                <Pressable
                  onPress={() => permanentlyDeleteTask(editingTask)}
                  className="flex-row items-center rounded-xl bg-red-800 px-3.5 py-2.5 active:opacity-80"
                >
                  <Ionicons name="trash-bin" size={18} color="#fff" />
                  <Text className="ml-1.5 text-xs font-bold text-white">Delete forever</Text>
                </Pressable>
              )}
            </View>
          )}
        </ScrollView>
        <Pressable onPress={handleSave} className="mt-3 items-center rounded-2xl bg-brand py-4 shadow-md shadow-blue-500/40 active:opacity-80">
          <Text className="text-base font-bold text-white">{editingTask ? "Update task" : "Create task"}</Text>
        </Pressable>
      </Sheet>

      {/* ================= Time picker sheet ================= */}
      <Sheet visible={showCustomTimePickerModal} onClose={() => setShowCustomTimePickerModal(false)} darkMode={darkMode}>
        <SheetHeader title="Select time" onClose={() => setShowCustomTimePickerModal(false)} darkMode={darkMode} />
        <View className="h-64 flex-row items-stretch">
          <ScrollView className={`mx-1 flex-1 rounded-2xl border ${field}`} showsVerticalScrollIndicator={false}>
            {generateHours().map((hour) => {
              const now = new Date()
              const isToday = form.date.toDateString() === now.toDateString()
              const currentHour24 = now.getHours()
              let displayHour24 = tempSelectedAmPm === "PM" && hour !== 12 ? hour + 12 : hour
              if (tempSelectedAmPm === "AM" && hour === 12) displayHour24 = 0
              if (currentEditingTimeTarget === "mainDate" && isToday && displayHour24 < currentHour24) return null
              const sel = tempSelectedHour === hour
              return (
                <Pressable
                  key={hour}
                  onPress={() => setTempSelectedHour(hour)}
                  className={`m-1 items-center rounded-xl py-3 ${sel ? "bg-brand" : ""}`}
                >
                  <Text className={`text-lg ${sel ? "font-bold text-white" : textMain}`}>{hour.toString().padStart(2, "0")}</Text>
                </Pressable>
              )
            })}
          </ScrollView>
          <View className="justify-center">
            <Text className={`text-2xl font-bold ${textMain}`}>:</Text>
          </View>
          <ScrollView className={`mx-1 flex-1 rounded-2xl border ${field}`} showsVerticalScrollIndicator={false}>
            {generateMinutes().map((minute) => {
              const now = new Date()
              const isToday = form.date.toDateString() === now.toDateString()
              const currentHour24 = now.getHours()
              const currentMinute = now.getMinutes()
              let selectedHour24 = tempSelectedAmPm === "PM" && tempSelectedHour !== 12 ? tempSelectedHour + 12 : tempSelectedHour
              if (tempSelectedAmPm === "AM" && tempSelectedHour === 12) selectedHour24 = 0
              if (currentEditingTimeTarget === "mainDate" && isToday && selectedHour24 === currentHour24 && minute < currentMinute) return null
              const sel = tempSelectedMinute === minute
              return (
                <Pressable
                  key={minute}
                  onPress={() => setTempSelectedMinute(minute)}
                  className={`m-1 items-center rounded-xl py-3 ${sel ? "bg-brand" : ""}`}
                >
                  <Text className={`text-lg ${sel ? "font-bold text-white" : textMain}`}>{minute.toString().padStart(2, "0")}</Text>
                </Pressable>
              )
            })}
          </ScrollView>
          <View className="mx-1 w-20 justify-center gap-2">
            {["AM", "PM"].map((ap) => {
              const sel = tempSelectedAmPm === ap
              return (
                <Pressable
                  key={ap}
                  onPress={() => setTempSelectedAmPm(ap)}
                  className={`items-center rounded-xl border py-4 ${sel ? "border-brand bg-brand" : field}`}
                >
                  <Text className={`text-base font-bold ${sel ? "text-white" : textMain}`}>{ap}</Text>
                </Pressable>
              )
            })}
          </View>
        </View>
        <Pressable onPress={handleCustomTimePickerConfirm} className="mt-4 items-center rounded-2xl bg-brand py-4 active:opacity-80">
          <Text className="text-base font-bold text-white">Done</Text>
        </Pressable>
      </Sheet>

      {/* ================= Month calendar ================= */}
      <Modal visible={showMonthCalendar} transparent animationType="fade" onRequestClose={() => setShowMonthCalendar(false)} statusBarTranslucent>
        <View className="flex-1 items-center justify-center bg-black/50 px-5">
          <Pressable className="absolute inset-0" onPress={() => setShowMonthCalendar(false)} />
          <View className={`w-full rounded-3xl p-5 ${c("bg-white", "bg-night-card")}`}>
            <View className="mb-4 flex-row items-center justify-between">
              <Pressable
                hitSlop={10}
                onPress={() => {
                  const m = new Date(currentMonthView)
                  m.setMonth(m.getMonth() - 1)
                  setCurrentMonthView(m)
                }}
                className={`size-9 items-center justify-center rounded-full ${c("bg-slate-100", "bg-night-row")}`}
              >
                <Ionicons name="chevron-back" size={18} color={iconMuted} />
              </Pressable>
              <Text className={`text-lg font-bold ${textMain}`}>
                {currentMonthView.toLocaleDateString("en-ZA", { month: "long", year: "numeric" })}
              </Text>
              <Pressable
                hitSlop={10}
                onPress={() => {
                  const m = new Date(currentMonthView)
                  m.setMonth(m.getMonth() + 1)
                  setCurrentMonthView(m)
                }}
                className={`size-9 items-center justify-center rounded-full ${c("bg-slate-100", "bg-night-row")}`}
              >
                <Ionicons name="chevron-forward" size={18} color={iconMuted} />
              </Pressable>
            </View>
            <View className="mb-1 flex-row">
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
                <Text key={day} className={`flex-1 text-center text-[11px] font-semibold ${textMuted}`}>{day}</Text>
              ))}
            </View>
            <View className="flex-row flex-wrap">
              {Array.from({ length: 42 }, (_, i) => {
                const today = new Date()
                const first = new Date(currentMonthView.getFullYear(), currentMonthView.getMonth(), 1)
                const cur = new Date(first)
                cur.setDate(1 - first.getDay() + i)
                const inMonth = cur.getMonth() === currentMonthView.getMonth()
                const isToday = cur.toDateString() === today.toDateString()
                const isSel = cur.toDateString() === selectedDate.toDateString()
                const has = taskDays.has(cur.toDateString())
                return (
                  <Pressable
                    key={i}
                    onPress={() => {
                      setSelectedDate(cur)
                      setShowMonthCalendar(false)
                    }}
                    className="w-[14.2857%] items-center py-0.5"
                  >
                    <View
                      className={`size-10 items-center justify-center rounded-full ${
                        isSel ? "bg-brand" : isToday ? "border-2 border-brand" : ""
                      }`}
                    >
                      <Text
                        className={`text-sm ${
                          isSel ? "font-bold text-white" : !inMonth ? c("text-slate-300", "text-slate-600") : isToday ? "font-bold text-brand" : textMain
                        }`}
                      >
                        {cur.getDate()}
                      </Text>
                    </View>
                    <View className={`mt-0.5 size-1 rounded-full ${has && !isSel ? "bg-green-500" : "bg-transparent"}`} />
                  </Pressable>
                )
              })}
            </View>
            <Pressable
              onPress={() => {
                setSelectedDate(new Date())
                setCurrentMonthView(new Date())
                setShowMonthCalendar(false)
              }}
              className="mt-3 items-center rounded-2xl bg-brand/10 py-3 active:opacity-70"
            >
              <Text className="font-bold text-brand">Jump to today</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* ================= My Tasks sheet ================= */}
      <Sheet visible={showTaskTabsModal} onClose={() => setShowTaskTabsModal(false)} darkMode={darkMode}>
        <SheetHeader title="My tasks" onClose={() => setShowTaskTabsModal(false)} darkMode={darkMode} />
        <View className={`mb-4 flex-row rounded-2xl p-1 ${c("bg-slate-100", "bg-night-row")}`}>
          {["Upcoming", "Complete", "Archive", "Deleted"].map((tab) => {
            const sel = currentTaskTab === tab
            return (
              <Pressable
                key={tab}
                onPress={() => setCurrentTaskTab(tab)}
                className={`flex-1 items-center rounded-xl py-2.5 ${sel ? "bg-brand" : ""}`}
              >
                <Text className={`text-[12px] font-bold ${sel ? "text-white" : textMuted}`}>{tab}</Text>
                <Text className={`text-[10px] ${sel ? "text-white/80" : textMuted}`}>{tabCounts[tab]}</Text>
              </Pressable>
            )
          })}
        </View>
        <FlatList
          data={getTasksForCurrentTab()}
          keyExtractor={(item) => item.id}
          style={{ maxHeight: 420 }}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => renderRow(item, true)}
          ListEmptyComponent={
            <View className="items-center py-10">
              <Ionicons name="file-tray-outline" size={40} color={iconMuted} />
              <Text className={`mt-2 text-sm ${textMuted}`}>No tasks in this category.</Text>
            </View>
          }
        />
      </Sheet>

      {/* ================= Reminders sheet ================= */}
      <Sheet visible={showRemindersModal} onClose={() => setShowRemindersModal(false)} darkMode={darkMode}>
        <SheetHeader title="Reminders" onClose={() => setShowRemindersModal(false)} darkMode={darkMode} />

        {!notifState.granted ? (
          <View className="mb-4 rounded-2xl bg-red-500/10 p-4">
            <View className="flex-row items-center">
              <Ionicons name="notifications-off-outline" size={22} color="#EF4444" />
              <Text className="ml-2 flex-1 text-[15px] font-bold text-red-500">Notifications are off</Text>
            </View>
            <Text className={`mt-1.5 text-[13px] ${textMuted}`}>
              Turn them on to get reminded before your tasks are due.
            </Text>
            <Pressable
              onPress={async () => {
                if (notifState.canAskAgain) {
                  await requestPermission()
                  refreshNotifState()
                  syncTaskReminders(reminderTasks)
                } else {
                  openSystemSettings()
                }
              }}
              className="mt-3 items-center rounded-xl bg-red-500 py-2.5 active:opacity-80"
            >
              <Text className="font-bold text-white">{notifState.canAskAgain ? "Allow notifications" : "Open settings"}</Text>
            </Pressable>
          </View>
        ) : (
          <View className="mb-4 flex-row items-center rounded-2xl bg-green-500/15 px-4 py-3">
            <Ionicons name="notifications" size={20} color="#16A34A" />
            <Text className={`ml-2 flex-1 text-[14px] font-semibold ${c("text-green-700", "text-green-300")}`}>
              Notifications are on
            </Text>
            <Pressable
              onPress={async () => {
                const ok = await sendTestNotification()
                if (ok) Alert.alert("Test sent", "You should get a notification in a few seconds.")
              }}
              className="rounded-full bg-green-600 px-3.5 py-1.5 active:opacity-80"
            >
              <Text className="text-xs font-bold text-white">Send test</Text>
            </Pressable>
          </View>
        )}

        {notifState.granted && !notifState.exact && (
          <Pressable
            onPress={async () => {
              await requestExactAlarmPermission()
              refreshNotifState()
              syncTaskReminders(reminderTasks)
            }}
            className="mb-4 flex-row items-center rounded-2xl bg-amber-500/15 px-4 py-3 active:opacity-80"
          >
            <Ionicons name="alarm-outline" size={20} color="#D97706" />
            <View className="ml-2 flex-1">
              <Text className={`text-[14px] font-semibold ${c("text-amber-700", "text-amber-300")}`}>Allow exact timing</Text>
              <Text className={`text-xs ${textMuted}`}>Without it Android may delay reminders by a few minutes.</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={iconMuted} />
          </Pressable>
        )}

        <Text className={`mb-2 text-sm font-semibold ${textMain}`}>Coming up</Text>
        {getUpcomingReminders(6).length === 0 ? (
          <View className="items-center py-6">
            <Ionicons name="moon-outline" size={34} color={iconMuted} />
            <Text className={`mt-2 text-center text-sm ${textMuted}`}>
              No reminders scheduled. Add a task with a future time and it will show up here.
            </Text>
          </View>
        ) : (
          getUpcomingReminders(6).map((r) => (
            <View key={r.id} className={`mb-2 flex-row items-center rounded-2xl px-4 py-3 ${c("bg-slate-50", "bg-night-row")}`}>
              <View className={`size-9 items-center justify-center rounded-xl ${r.kind === "due" ? "bg-red-500/15" : "bg-brand/10"}`}>
                <Ionicons name={r.kind === "due" ? "alarm-outline" : r.kind === "snooze" ? "moon-outline" : "notifications-outline"} size={18} color={r.kind === "due" ? "#EF4444" : "#0B6CF0"} />
              </View>
              <View className="ml-3 min-w-0 flex-1">
                <Text numberOfLines={1} className={`text-[14px] font-semibold ${textMain}`}>{r.title}</Text>
                <Text numberOfLines={1} className={`text-xs ${textMuted}`}>{r.body}</Text>
              </View>
              <Text className={`ml-2 text-right text-[11px] font-medium ${textMuted}`}>
                {r.date.toLocaleDateString("en-ZA", { day: "numeric", month: "short" })}
                {"\n"}
                {formatTime(r.date)}
              </Text>
            </View>
          ))
        )}
      </Sheet>

      {/* ================= More sheet ================= */}
      <Sheet visible={showMoreModal} onClose={() => setShowMoreModal(false)} darkMode={darkMode}>
        <SheetHeader title="More" onClose={() => setShowMoreModal(false)} darkMode={darkMode} />
        {[
          { icon: "settings-outline", label: "Settings", onPress: handleSettingsPress },
          { icon: "shield-checkmark-outline", label: "Privacy policy", onPress: handlePrivacyPolicyPress },
          { icon: "document-text-outline", label: "Terms and conditions", onPress: handleTermsAndConditionsPress },
          { icon: "cloud-download-outline", label: "Check for updates", onPress: handleCheckForUpdatesPress },
        ].map((item) => (
          <Pressable
            key={item.label}
            onPress={item.onPress}
            className={`mb-2.5 flex-row items-center rounded-2xl px-4 py-3.5 active:opacity-70 ${c("bg-slate-50", "bg-night-row")}`}
          >
            <View className="size-9 items-center justify-center rounded-xl bg-brand/10">
              <Ionicons name={item.icon} size={20} color="#0B6CF0" />
            </View>
            <Text className={`ml-3 flex-1 text-[15px] font-semibold ${textMain}`}>{item.label}</Text>
            <Ionicons name="chevron-forward" size={18} color={iconMuted} />
          </Pressable>
        ))}
        <Pressable
          onPress={handleLogoutPress}
          className="mt-2 flex-row items-center justify-center rounded-2xl bg-red-500 py-3.5 active:opacity-80"
        >
          <Ionicons name="log-out-outline" size={20} color="#fff" />
          <Text className="ml-2 text-[15px] font-bold text-white">Log out</Text>
        </Pressable>
      </Sheet>

      {/* ================= Toast ================= */}
      {toast && (
        <View pointerEvents="none" className="absolute inset-x-6 items-center" style={{ top: insets.top + 10 }}>
          <View className="flex-row items-center rounded-full bg-ink px-4 py-2.5 shadow-lg">
            <Ionicons name="checkmark-circle" size={18} color="#4ADE80" />
            <Text numberOfLines={2} className="ml-2 text-[13px] font-semibold text-white">{toast}</Text>
          </View>
        </View>
      )}

      {/* ================= Bottom nav ================= */}
      <View
        style={{ bottom: navBottom }}
        className={`absolute inset-x-3 h-[64px] rounded-3xl shadow-xl shadow-blue-900/20 ${c("bg-white", "bg-night-card")}`}
      >
        <View className="h-full flex-row overflow-hidden rounded-3xl">
          {["Home", "Tasks", "More", "Profile"].map((tab) => {
            const active = activeTab === tab
            return (
              <Pressable
                key={tab}
                onPress={
                  tab === "Tasks"
                    ? () => setShowTaskTabsModal(true)
                    : tab === "More"
                      ? () => setShowMoreModal(true)
                      : tab === "Profile"
                        ? () => navigation.navigate("Profile")
                        : () => setActiveTab(tab)
                }
                className="flex-1 items-center justify-center active:opacity-70"
              >
                <Ionicons name={getIcon(tab, active)} size={24} color={active ? "#0B6CF0" : iconMuted} />
                <Text className={`mt-0.5 text-xs ${active ? "font-bold text-brand" : `font-medium ${textMuted}`}`}>{tab}</Text>
                <View className={`absolute bottom-0 h-1 w-10 rounded-t-full ${active ? "bg-brand" : "bg-transparent"}`} />
              </Pressable>
            )
          })}
        </View>
      </View>
    </View>
  )
}

export default MainScreen