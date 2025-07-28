"use client"
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  Modal,
  StyleSheet,
  Switch,
  ScrollView,
  Platform,
  Image,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from "react-native"
import { Ionicons } from "@expo/vector-icons"
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
  serverTimestamp,
  getDoc,
  deleteDoc,
} from "firebase/firestore"
import { useNavigation } from "@react-navigation/native"

// Placeholder avatars
const avatars = {
  profile: "https://blob.v0.dev/pjtmy8OGJ.png",
  user1: "https://blob.v0.dev/pjtmy8OGJ.png",
  user2: "https://blob.v0.dev/pjtmy8OGJ.png",
  user3: "https://blob.v0.dev/pjtmy8OGJ.png",
}

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
  const [refreshing, setRefreshing] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)

  // Create dynamic styles based on theme
  const styles = createStyles(theme)

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

  const getIcon = (tab) => {
    switch (tab) {
      case "Home":
        return "home-outline"
      case "Tasks":
        return "list-outline"
      case "More":
        return "ellipsis-horizontal-outline"
      case "Profile":
        return "person-outline"
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

  const getPriorityColor = (priority) => {
    switch (priority) {
      case "Very Important":
        return theme.danger
      case "Important":
        return theme.warning
      case "Normal":
      default:
        return theme.success
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

  return (
    <View style={styles.container}>
      {/* Top Header with Greeting and Notification */}
      <View style={styles.topHeader}>
        <View>
          <Text style={styles.greetingText}>{getGreeting()}</Text>
          {user && fetchedUsername && <Text style={styles.usernameText}>{fetchedUsername}</Text>}
        </View>
        <TouchableOpacity onPress={() => console.log("Notifications clicked")}>
          <Ionicons name="notifications-outline" size={24} color={theme.text} />
        </TouchableOpacity>
      </View>

      {loadingTasks && refreshing ? (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color={theme.primary} />
          <Text style={styles.loadingText}>Loading tasks...</Text>
        </View>
      ) : (
        <View style={styles.mainCard}>
          {/* Date and Task Count */}
          <View style={styles.dateSummaryContainer}>
            <View>
              <Text style={styles.dateText}>
                {selectedDate.toLocaleDateString("en-US", { month: "long", day: "numeric" })}
              </Text>
              <Text style={styles.taskCountText}>{tasksForSelectedDate.length} tasks today</Text>
            </View>
            <TouchableOpacity style={styles.calendarButtonLarge} onPress={() => setShowMonthCalendar(true)}>
              <Ionicons name="calendar-outline" size={24} color="#fff" />
            </TouchableOpacity>
          </View>

          {/* Weekly Calendar */}
          <View style={styles.calendarContainer}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.calendarScroll}>
              {daysOfWeek.map((d, i) => (
                <TouchableOpacity
                  key={i}
                  style={[styles.dayBlock, d.isSelected && styles.selectedDayBlock]}
                  onPress={() => setSelectedDate(d.date)}
                >
                  <Text style={[styles.dayLabel, d.isSelected && styles.selectedDayLabel]}>
                    {d.label.split(" ")[0]}
                  </Text>
                  <Text style={[styles.dayNumber, d.isSelected && styles.selectedDayNumber]}>
                    {d.label.split(" ")[1]}
                  </Text>
                  {d.isSelected && <View style={styles.selectedDayDot} />}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* Timeline */}
          <ScrollView
            style={styles.timelineScrollView}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.primary} />}
          >
            <View style={styles.timelineContent}>
              {tasksForSelectedDate.length > 0 && <View style={styles.timelineLine} />}
              {tasksForSelectedDate.map((task, index) => (
                <View key={task.id} style={styles.timelineRow}>
                  <Text style={styles.timeSlotText}>
                    {new Date(task.instanceDate).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </Text>
                  <View style={styles.timelineDot} />
                  <TouchableOpacity
                    style={[styles.taskTimelineItem, { backgroundColor: task.color || theme.primary }]}
                    onPress={() => handleEdit(task)}
                  >
                    {task.avatar && !task.avatars && (
                      <Image source={{ uri: task.avatar }} style={styles.taskTimelineAvatar} />
                    )}
                    {task.avatars && task.avatars.length > 0 && (
                      <View style={styles.taskTimelineAvatarsGroup}>
                        {task.avatars.map((avatarUri, idx) => (
                          <Image key={idx} source={{ uri: avatarUri }} style={styles.taskTimelineAvatarSmall} />
                        ))}
                      </View>
                    )}
                    <View style={styles.taskInfoContainer}>
                      <View style={styles.taskTimelineTitleContainer}>
                        <Text style={[styles.taskTimelineTitle, task.completed && styles.completedText]}>
                          {task.title}
                        </Text>
                        {task.completed && (
                          <Ionicons name="checkmark-circle" size={20} color="#fff" style={styles.completedTick} />
                        )}
                      </View>
                      <View style={[styles.priorityBadge, { backgroundColor: getPriorityColor(task.priority) }]}>
                        <Text style={styles.priorityBadgeText}>{task.priority}</Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                </View>
              ))}
              {tasksForSelectedDate.length === 0 && <Text style={styles.noTasksText}>No tasks for this day.</Text>}
            </View>
          </ScrollView>

          {/* Add Task Button (Floating) */}
          <TouchableOpacity style={styles.fab} onPress={openAddModal}>
            <Ionicons name="add" size={30} color="#fff" />
          </TouchableOpacity>
        </View>
      )}

      {/* Task Modal (Add/Edit) */}
      <Modal visible={showModal} transparent animationType="fade">
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{editingTask ? "Edit Task" : "Add New Task"}</Text>
              <TouchableOpacity onPress={closeModal}>
                <Ionicons name="close" size={24} color={theme.textSecondary} />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalForm}>
              <TextInput
                placeholder="Task title"
                placeholderTextColor={theme.textTertiary}
                value={form.title}
                onChangeText={(title) => setForm((prev) => ({ ...prev, title }))}
                style={styles.input}
              />
              <TextInput
                placeholder="Description (optional)"
                placeholderTextColor={theme.textTertiary}
                value={form.description}
                onChangeText={(description) => setForm((prev) => ({ ...prev, description }))}
                style={[styles.input, styles.textArea]}
                multiline
                numberOfLines={3}
              />
              <Text style={styles.label}>Due Date</Text>
              <TouchableOpacity
                onPress={() => setForm((prev) => ({ ...prev, showDatePicker: true }))}
                style={[styles.datePickerTrigger]}
              >
                <Text style={styles.datePickerTriggerText}>{form.date.toLocaleDateString()}</Text>
                <Ionicons name="chevron-down" size={18} color={theme.textSecondary} />
              </TouchableOpacity>
              <DateTimePickerModal
                isVisible={form.showDatePicker}
                mode="date"
                date={form.date}
                minimumDate={new Date()}
                onConfirm={(date) => setForm((prev) => ({ ...prev, date, showDatePicker: false }))}
                onCancel={() => setForm((prev) => ({ ...prev, showDatePicker: false }))}
                themeVariant={darkMode ? "dark" : "light"}
              />
              <Text style={styles.label}>Due Time</Text>
              <TouchableOpacity onPress={() => openCustomTimePicker("mainDate")} style={styles.timePickerTrigger}>
                <Text style={styles.timePickerTriggerText}>
                  {form.date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </Text>
                <Ionicons name="chevron-down" size={18} color={theme.textSecondary} />
              </TouchableOpacity>
              <Text style={styles.label}>Priority</Text>
              <View style={styles.pickerWrapper}>
                {["Normal", "Important", "Very Important"].map((p) => (
                  <TouchableOpacity
                    key={p}
                    style={[styles.priorityButton, form.priority === p && styles.prioritySelected]}
                    onPress={() => setForm((prev) => ({ ...prev, priority: p }))}
                  >
                    <Text style={[styles.priorityButtonText, form.priority === p && styles.priorityButtonTextSelected]}>
                      {p}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              <View style={styles.switchContainer}>
                <Text style={styles.switchLabel}>Recurring Task?</Text>
                <Switch
                  value={form.recurring}
                  onValueChange={(val) => setForm((prev) => ({ ...prev, recurring: val }))}
                  trackColor={{ false: theme.border, true: theme.primary }}
                  thumbColor={form.recurring ? "#fff" : "#f4f3f4"}
                />
              </View>
              {form.recurring && (
                <>
                  <Text style={styles.label}>Frequency</Text>
                  <View style={styles.pickerWrapper}>
                    {["Daily", "Weekly", "Monthly", "Yearly", "Custom"].map((freq) => (
                      <TouchableOpacity
                        key={freq}
                        style={[styles.priorityButton, form.recurringFrequency === freq && styles.prioritySelected]}
                        onPress={() => setForm((prev) => ({ ...prev, recurringFrequency: freq }))}
                      >
                        <Text
                          style={[
                            styles.priorityButtonText,
                            form.recurringFrequency === freq && styles.priorityButtonTextSelected,
                          ]}
                        >
                          {freq}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                  {form.recurringFrequency === "Custom" && (
                    <>
                      <Text style={styles.label}>Select Days</Text>
                      <View style={styles.daysSelector}>
                        {["S", "M", "T", "W", "T", "F", "S"].map((day, index) => (
                          <TouchableOpacity
                            key={index}
                            style={[styles.dayButton, form.recurringDays.includes(index) && styles.dayButtonSelected]}
                            onPress={() => toggleRecurringDay(index)}
                          >
                            <Text
                              style={[
                                styles.dayButtonText,
                                form.recurringDays.includes(index) && styles.dayButtonTextSelected,
                              ]}
                            >
                              {day}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                      <Text style={styles.label}>Recurring Time</Text>
                      <TouchableOpacity
                        onPress={() => openCustomTimePicker("recurringTime")}
                        style={styles.timePickerTrigger}
                      >
                        <Text style={styles.timePickerTriggerText}>
                          {form.recurringTime.toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </Text>
                        <Ionicons name="chevron-down" size={18} color={theme.textSecondary} />
                      </TouchableOpacity>
                    </>
                  )}
                </>
              )}
              {editingTask && (
                <View style={styles.taskActionsContainer}>
                  <TouchableOpacity
                    style={[styles.taskActionButton, styles.completeButton]}
                    onPress={() => markTaskComplete(editingTask)}
                  >
                    <Ionicons
                      name={editingTask?.completed ? "checkmark-circle" : "checkmark-circle-outline"}
                      size={20}
                      color="#fff"
                    />
                    <Text style={styles.taskActionButtonText}>
                      {editingTask?.completed ? "Unmark Complete" : "Mark Complete"}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.taskActionButton, styles.archiveButton]}
                    onPress={() => archiveTask(editingTask)}
                  >
                    <Ionicons
                      name={
                        tasks.find((t) => t.id === editingTask.originalTaskId || t.id === editingTask.id)?.archived
                          ? "archive"
                          : "archive-outline"
                      }
                      size={20}
                      color="#fff"
                    />
                    <Text style={styles.taskActionButtonText}>
                      {tasks.find((t) => t.id === editingTask.originalTaskId || t.id === editingTask.id)?.archived
                        ? "Unarchive"
                        : "Archive"}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.taskActionButton, styles.deleteButton]}
                    onPress={() => deleteTask(editingTask)}
                  >
                    <Ionicons
                      name={
                        tasks.find((t) => t.id === editingTask.originalTaskId || t.id === editingTask.id)?.deleted
                          ? "trash"
                          : "trash-outline"
                      }
                      size={20}
                      color="#fff"
                    />
                    <Text style={styles.taskActionButtonText}>
                      {tasks.find((t) => t.id === editingTask.originalTaskId || t.id === editingTask.id)?.deleted
                        ? "Undelete"
                        : "Delete"}
                    </Text>
                  </TouchableOpacity>
                  {editingTask &&
                    tasks.find((t) => t.id === editingTask.originalTaskId || t.id === editingTask.id)?.deleted && (
                      <TouchableOpacity
                        style={[styles.taskActionButton, styles.permanentDeleteButton]}
                        onPress={() => permanentlyDeleteTask(editingTask)}
                      >
                        <Ionicons name="trash-bin" size={20} color="#fff" />
                        <Text style={styles.taskActionButtonText}>Delete Forever</Text>
                      </TouchableOpacity>
                    )}
                </View>
              )}
            </ScrollView>
            <TouchableOpacity onPress={handleSave} style={styles.saveButton}>
              <Text style={styles.saveButtonText}>{editingTask ? "Update Task" : "Create Task"}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Custom Time Picker Modal */}
      <Modal visible={showCustomTimePickerModal} transparent animationType="fade">
        <View style={styles.modalContainer}>
          <View style={[styles.customTimePickerContent, { flex: 1 }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Time</Text>
              <TouchableOpacity onPress={() => setShowCustomTimePickerModal(false)}>
                <Ionicons name="close" size={24} color={theme.textSecondary} />
              </TouchableOpacity>
            </View>
            <View style={styles.timePickerColumns}>
              <ScrollView style={styles.timePickerColumn}>
                {generateHours().map((hour) => {
                  const now = new Date()
                  const isToday = form.date.toDateString() === now.toDateString()
                  const currentHour24 = now.getHours()
                  let displayHour24 = tempSelectedAmPm === "PM" && hour !== 12 ? hour + 12 : hour
                  if (tempSelectedAmPm === "AM" && hour === 12) displayHour24 = 0
                  if (currentEditingTimeTarget === "mainDate" && isToday && displayHour24 < currentHour24) {
                    return null
                  }
                  return (
                    <TouchableOpacity
                      key={hour}
                      style={[styles.timePickerItem, tempSelectedHour === hour && styles.timePickerItemSelected]}
                      onPress={() => setTempSelectedHour(hour)}
                    >
                      <Text
                        style={[
                          styles.timePickerItemText,
                          tempSelectedHour === hour && styles.timePickerItemTextSelected,
                        ]}
                      >
                        {hour.toString().padStart(2, "0")}
                      </Text>
                    </TouchableOpacity>
                  )
                })}
              </ScrollView>
              <Text style={styles.timePickerSeparator}>:</Text>
              <ScrollView style={styles.timePickerColumn}>
                {generateMinutes().map((minute) => {
                  const now = new Date()
                  const isToday = form.date.toDateString() === now.toDateString()
                  const currentHour24 = now.getHours()
                  const currentMinute = now.getMinutes()
                  let selectedHour24 =
                    tempSelectedAmPm === "PM" && tempSelectedHour !== 12 ? tempSelectedHour + 12 : tempSelectedHour
                  if (tempSelectedAmPm === "AM" && tempSelectedHour === 12) selectedHour24 = 0
                  if (
                    currentEditingTimeTarget === "mainDate" &&
                    isToday &&
                    selectedHour24 === currentHour24 &&
                    minute < currentMinute
                  ) {
                    return null
                  }
                  return (
                    <TouchableOpacity
                      key={minute}
                      style={[styles.timePickerItem, tempSelectedMinute === minute && styles.timePickerItemSelected]}
                      onPress={() => setTempSelectedMinute(minute)}
                    >
                      <Text
                        style={[
                          styles.timePickerItemText,
                          tempSelectedMinute === minute && styles.timePickerItemTextSelected,
                        ]}
                      >
                        {minute.toString().padStart(2, "0")}
                      </Text>
                    </TouchableOpacity>
                  )
                })}
              </ScrollView>
              <View style={[styles.timePickerAmPmColumn, { flex: 1 }]}>
                <TouchableOpacity
                  style={[styles.timePickerItem, tempSelectedAmPm === "AM" && styles.timePickerItemSelected]}
                  onPress={() => setTempSelectedAmPm("AM")}
                >
                  <Text
                    style={[styles.timePickerItemText, tempSelectedAmPm === "AM" && styles.timePickerItemTextSelected]}
                  >
                    AM
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.timePickerItem, tempSelectedAmPm === "PM" && styles.timePickerItemSelected]}
                  onPress={() => setTempSelectedAmPm("PM")}
                >
                  <Text
                    style={[styles.timePickerItemText, tempSelectedAmPm === "PM" && styles.timePickerItemTextSelected]}
                  >
                    PM
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
            <TouchableOpacity onPress={handleCustomTimePickerConfirm} style={styles.timePickerSaveButton}>
              <Text style={styles.timePickerSaveButtonText}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Monthly Calendar Modal */}
      <Modal visible={showMonthCalendar} transparent animationType="fade">
        <View style={styles.modalContainer}>
          <View style={styles.monthCalendarContent}>
            <View style={styles.monthCalendarHeader}>
              <TouchableOpacity
                onPress={() => {
                  const newMonth = new Date(currentMonthView)
                  newMonth.setMonth(newMonth.getMonth() - 1)
                  setCurrentMonthView(newMonth)
                }}
              >
                <Ionicons name="chevron-back" size={24} color={theme.text} />
              </TouchableOpacity>
              <Text style={styles.monthCalendarTitle}>
                {currentMonthView.toLocaleDateString("en-ZA", { month: "long", year: "numeric" })}
              </Text>
              <TouchableOpacity
                onPress={() => {
                  const newMonth = new Date(currentMonthView)
                  newMonth.setMonth(newMonth.getMonth() + 1)
                  setCurrentMonthView(newMonth)
                }}
              >
                <Ionicons name="chevron-forward" size={24} color={theme.text} />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setShowMonthCalendar(false)}>
                <Ionicons name="close" size={24} color={theme.textSecondary} />
              </TouchableOpacity>
            </View>
            <View style={styles.weekDaysHeader}>
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
                <Text key={day} style={styles.weekDayText}>
                  {day}
                </Text>
              ))}
            </View>
            <View style={styles.calendarGrid}>
              {Array.from({ length: 42 }, (_, i) => {
                const today = new Date()
                const firstDayOfMonth = new Date(currentMonthView.getFullYear(), currentMonthView.getMonth(), 1)
                const startDate = new Date(firstDayOfMonth)
                startDate.setDate(startDate.getDate() - firstDayOfMonth.getDay())
                const currentDate = new Date(startDate)
                currentDate.setDate(startDate.getDate() + i)
                const isCurrentMonth = currentDate.getMonth() === currentMonthView.getMonth()
                const isToday = currentDate.toDateString() === today.toDateString()
                const isSelected = currentDate.toDateString() === selectedDate.toDateString()
                return (
                  <TouchableOpacity
                    key={i}
                    style={[
                      styles.calendarDay,
                      isToday && styles.todayCalendarDay,
                      isSelected && styles.selectedCalendarDay,
                    ]}
                    onPress={() => {
                      setSelectedDate(currentDate)
                      setShowMonthCalendar(false)
                    }}
                  >
                    <Text
                      style={[
                        styles.calendarDayText,
                        !isCurrentMonth && styles.otherMonthText,
                        isToday && styles.todayCalendarText,
                        isSelected && styles.selectedCalendarText,
                      ]}
                    >
                      {currentDate.getDate()}
                    </Text>
                  </TouchableOpacity>
                )
              })}
            </View>
          </View>
        </View>
      </Modal>

      {/* Task Tabs Modal */}
      <Modal visible={showTaskTabsModal} transparent animationType="fade">
        <View style={styles.modalContainer}>
          <View style={styles.taskTabsModalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>My Tasks</Text>
              <TouchableOpacity onPress={() => setShowTaskTabsModal(false)}>
                <Ionicons name="close" size={24} color={theme.textSecondary} />
              </TouchableOpacity>
            </View>
            <View style={styles.taskTabsContainer}>
              {["Upcoming", "Complete", "Archive", "Deleted"].map((tab) => (
                <TouchableOpacity
                  key={tab}
                  style={[styles.taskTabButton, currentTaskTab === tab && styles.taskTabButtonSelected]}
                  onPress={() => setCurrentTaskTab(tab)}
                >
                  <Text style={[styles.taskTabButtonText, currentTaskTab === tab && styles.taskTabButtonTextSelected]}>
                    {tab}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <FlatList
              data={getTasksForCurrentTab()}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[styles.taskListItem, { backgroundColor: item.color || theme.primary }]}
                  onPress={() => handleEdit(item)}
                >
                  <View style={styles.taskListItemContent}>
                    <View style={styles.taskListItemTitleContainer}>
                      <Text style={[styles.taskListItemTitle, item.completed && styles.completedText]}>
                        {item.title}
                      </Text>
                      {item.completed && (
                        <Ionicons name="checkmark-circle" size={20} color="#fff" style={styles.completedTick} />
                      )}
                    </View>
                    <View style={[styles.priorityBadge, { backgroundColor: getPriorityColor(item.priority) }]}>
                      <Text style={styles.priorityBadgeText}>{item.priority}</Text>
                    </View>
                  </View>
                  <Text style={styles.taskListItemDate}>
                    {new Date(item.instanceDate).toLocaleDateString()}
                    {" at "}
                    {new Date(item.instanceDate).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </Text>
                </TouchableOpacity>
              )}
              ListEmptyComponent={() => <Text style={styles.noTasksText}>No tasks in this category.</Text>}
              contentContainerStyle={styles.taskListContainer}
            />
          </View>
        </View>
      </Modal>

      {/* More Options Modal */}
      <Modal visible={showMoreModal} transparent animationType="fade">
        <View style={styles.modalContainer}>
          <View style={styles.moreModalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>More Options</Text>
              <TouchableOpacity onPress={() => setShowMoreModal(false)}>
                <Ionicons name="close" size={24} color={theme.textSecondary} />
              </TouchableOpacity>
            </View>
            <ScrollView>
              <TouchableOpacity style={styles.moreOptionButton} onPress={handleSettingsPress}>
                <Ionicons name="settings-outline" size={22} color={theme.text} />
                <Text style={styles.moreOptionButtonText}>Settings</Text>
              </TouchableOpacity>
              <View style={styles.moreOptionGroup}>
                <Text style={styles.moreOptionGroupTitle}>About App</Text>
                <TouchableOpacity style={styles.moreOptionSubButton} onPress={handlePrivacyPolicyPress}>
                  <Text style={styles.moreOptionSubButtonText}>Privacy Policy</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.moreOptionSubButton} onPress={handleTermsAndConditionsPress}>
                  <Text style={styles.moreOptionSubButtonText}>Terms and Conditions</Text>
                </TouchableOpacity>
              </View>
              <TouchableOpacity style={styles.moreOptionButton} onPress={handleCheckForUpdatesPress}>
                <Ionicons name="cloud-download-outline" size={22} color={theme.text} />
                <Text style={styles.moreOptionButtonText}>Check for Updates</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.moreOptionButton, styles.logoutButton]} onPress={handleLogoutPress}>
                <Ionicons name="log-out-outline" size={22} color= 'white' />
                <Text style={[styles.moreOptionButtonText, styles.logoutButtonText]}>Logout</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Bottom Nav */}
      <View style={styles.bottomNav}>
        {["Home", "Tasks", "More", "Profile"].map((tab) => (
          <TouchableOpacity
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
            style={styles.navItem}
          >
            <Ionicons name={getIcon(tab)} size={24} color={activeTab === tab ? theme.primary : theme.textTertiary} />
            <Text style={[styles.navText, { color: activeTab === tab ? theme.primary : theme.textTertiary }]}>
              {tab}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  )
}

// Dynamic styles function
const createStyles = (theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.background,
      justifyContent: "flex-start",
      alignItems: "center",
      paddingTop: Platform.OS === "android" ? 30 : 50,
    },
    topHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      width: "95%",
      marginBottom: 20,
      marginTop: 10,
      paddingHorizontal: 5,
    },
    greetingText: {
      fontSize: 20,
      fontWeight: "700",
      color: theme.text,
    },
    usernameText: {
      fontSize: 16,
      fontWeight: "500",
      color: theme.textSecondary,
      marginTop: 2,
    },
    mainCard: {
      flex: 1,
      width: "100%",
      backgroundColor: theme.surface,
      borderRadius: 25,
      paddingHorizontal: 20,
      paddingTop: 20,
      paddingBottom: 20,
      shadowColor: theme.shadow,
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: 0.5,
      shadowRadius: 20,
      elevation: 15,
      marginBottom: 80,
    },
    dateSummaryContainer: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 25,
    },
    dateText: {
      fontSize: 20,
      fontWeight: "700",
      color: theme.text,
      marginBottom: 5,
    },
    taskCountText: {
      fontSize: 14,
      color: theme.textSecondary,
    },
    calendarButtonLarge: {
      width: 40,
      height: 40,
      borderRadius: 25,
      backgroundColor: theme.success,
      justifyContent: "center",
      alignItems: "center",
    },
    calendarContainer: {
      marginBottom: 20,
    },
    calendarScroll: {
      paddingVertical: 5,
    },
    dayBlock: {
      paddingVertical: 5,
      paddingHorizontal: 12,
      marginRight: 8,
      backgroundColor: theme.card,
      borderRadius: 10,
      height: 45,
      justifyContent: "center",
      alignItems: "center",
      borderWidth: 1,
      borderColor: theme.border,
    },
    selectedDayBlock: {
      backgroundColor: theme.primary,
      borderColor: theme.primary,
    },
    dayLabel: {
      fontSize: 12,
      fontWeight: "500",
      textAlign: "center",
      color: theme.textSecondary,
    },
    dayNumber: {
      fontSize: 14,
      fontWeight: "700",
      textAlign: "center",
      color: theme.text,
      marginTop: 0,
    },
    selectedDayLabel: {
      color: "#fff",
    },
    selectedDayNumber: {
      color: "#fff",
    },
    selectedDayDot: {
      width: 3,
      height: 3,
      borderRadius: 1.5,
      backgroundColor: "#fff",
      marginTop: 2,
    },
    timelineScrollView: {
      flex: 1,
      paddingHorizontal: 2,
    },
    timelineContent: {
      position: "relative",
      paddingLeft: 65,
    },
    timelineLine: {
      position: "absolute",
      left: 0,
      top: 0,
      bottom: 0,
      width: 2,
      backgroundColor: theme.border,
    },
    timelineRow: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: 20,
    },
    timeSlotText: {
      position: "absolute",
      left: -70,
      width: 65,
      textAlign: "right",
      fontSize: 13,
      color: theme.textSecondary,
      top: 0,
    },
    timelineDot: {
      width: 10,
      height: 10,
      borderRadius: 5,
      backgroundColor: theme.warning,
      position: "absolute",
      left: 21,
      top: 0,
    },
    taskTimelineItem: {
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: 10,
      paddingHorizontal: 15,
      borderRadius: 25,
      marginBottom: 0,
      minHeight: 50,
      flex: 1,
    },
    taskTimelineAvatar: {
      width: 30,
      height: 30,
      borderRadius: 15,
      marginRight: 10,
      backgroundColor: theme.border,
    },
    taskTimelineAvatarsGroup: {
      flexDirection: "row",
      marginRight: 10,
    },
    taskTimelineAvatarSmall: {
      width: 24,
      height: 24,
      borderRadius: 12,
      marginLeft: -8,
      borderWidth: 1,
      borderColor: "#fff",
      backgroundColor: theme.border,
    },
    taskInfoContainer: {
      flex: 1,
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },
    taskTimelineTitle: {
      fontSize: 16,
      fontWeight: "500",
      color: "#fff",
      flexShrink: 1,
    },
    priorityBadge: {
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 10,
      marginLeft: 10,
    },
    priorityBadgeText: {
      fontSize: 12,
      fontWeight: "bold",
      color: "#fff",
    },
    noTasksText: {
      fontSize: 16,
      color: theme.textSecondary,
      textAlign: "center",
      marginTop: 50,
      alignSelf: "center",
      width: "100%",
      paddingHorizontal: 30,
    },
    fab: {
      position: "absolute",
      bottom: 30,
      right: 30,
      width: 60,
      height: 60,
      borderRadius: 30,
      backgroundColor: theme.primary,
      justifyContent: "center",
      alignItems: "center",
      shadowColor: theme.shadow,
      shadowOffset: { width: 0, height: 5 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 8,
    },
    modalContainer: {
      flex: 1,
      backgroundColor: "rgba(0, 0, 0, 0.7)",
      justifyContent: "center",
      alignItems: "center",
    },
    modalContent: {
      width: "90%",
      backgroundColor: theme.surface,
      borderRadius: 15,
      padding: 20,
      maxHeight: "85%",
      shadowColor: theme.shadow,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.25,
      shadowRadius: 8,
      elevation: 10,
    },
    modalHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 20,
      paddingBottom: 15,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
    },
    modalTitle: {
      fontSize: 20,
      fontWeight: "bold",
      color: theme.text,
    },
    modalForm: {
      flexGrow: 1,
      paddingBottom: 10,
    },
    input: {
      backgroundColor: theme.card,
      padding: 15,
      marginBottom: 15,
      borderRadius: 10,
      fontSize: 16,
      color: theme.text,
      borderWidth: 1,
      borderColor: theme.border,
    },
    textArea: {
      height: 100,
      textAlignVertical: "top",
    },
    label: {
      fontWeight: "600",
      marginBottom: 10,
      fontSize: 16,
      color: theme.text,
    },
    datePickerTrigger: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      backgroundColor: theme.card,
      padding: 15,
      marginBottom: 15,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: theme.border,
    },
    datePickerTriggerText: {
      fontSize: 16,
      color: theme.text,
    },
    timePickerTrigger: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      backgroundColor: theme.card,
      padding: 15,
      marginBottom: 15,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: theme.border,
    },
    timePickerTriggerText: {
      fontSize: 16,
      color: theme.text,
    },
    pickerWrapper: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 10,
      marginBottom: 15,
    },
    priorityButton: {
      paddingVertical: 10,
      paddingHorizontal: 15,
      backgroundColor: theme.card,
      borderRadius: 10,
      minWidth: 90,
      alignItems: "center",
      borderWidth: 1,
      borderColor: theme.border,
    },
    prioritySelected: {
      backgroundColor: theme.primary,
      borderColor: theme.primary,
    },
    priorityButtonText: {
      fontSize: 14,
      color: theme.textSecondary,
      fontWeight: "500",
    },
    priorityButtonTextSelected: {
      color: "#fff",
      fontWeight: "bold",
    },
    switchContainer: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 15,
      paddingVertical: 5,
    },
    switchLabel: {
      fontSize: 16,
      fontWeight: "500",
      color: theme.text,
    },
    saveButton: {
      backgroundColor: theme.primary,
      padding: 18,
      borderRadius: 12,
      marginTop: 10,
      alignSelf: "stretch",
    },
    saveButtonText: {
      color: "#fff",
      textAlign: "center",
      fontSize: 18,
      fontWeight: "bold",
    },
    daysSelector: {
      flexDirection: "row",
      justifyContent: "space-around",
      marginBottom: 15,
    },
    dayButton: {
      width: 30,
      height: 30,
      borderRadius: 10,
      backgroundColor: theme.card,
      justifyContent: "center",
      alignItems: "center",
      borderWidth: 1,
      borderColor: theme.border,
    },
    dayButtonSelected: {
      backgroundColor: theme.primary,
      borderColor: theme.primary,
    },
    dayButtonText: {
      fontSize: 12,
      color: theme.textSecondary,
      fontWeight: "500",
    },
    dayButtonTextSelected: {
      color: "#fff",
      fontWeight: "bold",
    },
    monthCalendarContent: {
      margin: 20,
      padding: 20,
      backgroundColor: theme.surface,
      borderRadius: 10,
      maxHeight: "80%",
      shadowColor: theme.shadow,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.25,
      shadowRadius: 8,
      elevation: 10,
    },
    monthCalendarHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 20,
      paddingBottom: 15,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
    },
    monthCalendarTitle: {
      fontSize: 20,
      fontWeight: "bold",
      color: theme.text,
    },
    weekDaysHeader: {
      flexDirection: "row",
      marginBottom: 10,
    },
    weekDayText: {
      flex: 1,
      textAlign: "center",
      fontSize: 11,
      fontWeight: "600",
      color: theme.textSecondary,
      paddingVertical: 8,
    },
    calendarGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
    },
    calendarDay: {
      width: "14.28%",
      aspectRatio: 1,
      justifyContent: "center",
      alignItems: "center",
      borderRadius: 8,
      margin: 1,
    },
    todayCalendarDay: {
      backgroundColor: theme.primary,
    },
    selectedCalendarDay: {
      backgroundColor: theme.danger,
    },
    calendarDayText: {
      fontSize: 11,
      color: theme.text,
    },
    todayCalendarText: {
      color: "#fff",
      fontWeight: "bold",
      fontSize: 10,
    },
    selectedCalendarText: {
      color: "#fff",
      fontWeight: "bold",
    },
    otherMonthText: {
      color: theme.textTertiary,
    },
    bottomNav: {
      flexDirection: "row",
      justifyContent: "space-around",
      alignItems: "center",
      height: 70,
      backgroundColor: theme.surface,
      position: "absolute",
      bottom: 5,
      left: 0,
      right: 0,
      borderRadius: 25,
      marginHorizontal: 10,
      shadowColor: theme.shadow,
      shadowOffset: { width: 0, height: -2 },
      shadowOpacity: 0.05,
      shadowRadius: 4,
      elevation: 5,
      paddingBottom: Platform.OS === "ios" ? 10 : 0,
      borderWidth: 1,
      borderColor: theme.border,
    },
    navItem: {
      alignItems: "center",
      padding: 5,
    },
    navText: {
      fontSize: 12,
      marginTop: 4,
      fontWeight: "500",
    },
    taskActionsContainer: {
      flexDirection: "row",
      justifyContent: "space-between",
      flexWrap: "wrap",
      gap: 8,
      marginTop: 20,
      paddingTop: 15,
      borderTopWidth: 1,
      borderTopColor: theme.border,
    },
    taskActionButton: {
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: 8,
      paddingHorizontal: 12,
      borderRadius: 8,
      backgroundColor: theme.textTertiary,
    },
    taskActionButtonText: {
      color: "#fff",
      marginLeft: 6,
      fontWeight: "bold",
      fontSize: 12,
    },
    completeButton: {
      backgroundColor: theme.success,
    },
    archiveButton: {
      backgroundColor: theme.warning,
    },
    deleteButton: {
      backgroundColor: theme.danger,
    },
    taskTabsModalContent: {
      width: "95%",
      backgroundColor: theme.surface,
      borderRadius: 15,
      padding: 20,
      maxHeight: "90%",
      shadowColor: theme.shadow,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.25,
      shadowRadius: 8,
      elevation: 10,
    },
    taskTabsContainer: {
      flexDirection: "row",
      justifyContent: "space-around",
      marginBottom: 20,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
      paddingBottom: 10,
    },
    taskTabButton: {
      paddingVertical: 10,
      paddingHorizontal: 15,
      borderRadius: 10,
    },
    taskTabButtonSelected: {
      backgroundColor: theme.primary,
    },
    taskTabButtonText: {
      color: theme.textSecondary,
      fontWeight: "600",
    },
    taskTabButtonTextSelected: {
      color: "#fff",
    },
    taskListContainer: {
      paddingBottom: 20,
    },
    taskListItem: {
      padding: 15,
      borderRadius: 15,
      marginBottom: 10,
      position: "relative",
    },
    taskListItemContent: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 5,
    },
    taskListItemTitle: {
      fontSize: 18,
      fontWeight: "bold",
      color: "#fff",
      flexShrink: 1,
      marginRight: 10,
    },
    taskListItemDate: {
      fontSize: 12,
      color: "#eee",
    },
    completedText: {
      textDecorationLine: "line-through",
      opacity: 0.7,
    },
    completedTick: {
      marginLeft: 8,
    },
    taskTimelineTitleContainer: {
      flexDirection: "row",
      alignItems: "center",
      flexShrink: 1,
    },
    taskListItemTitleContainer: {
      flexDirection: "row",
      alignItems: "center",
      flexShrink: 1,
      marginRight: 10,
    },
    customTimePickerContent: {
      width: "90%",
      backgroundColor: theme.surface,
      borderRadius: 15,
      height: "80%",
      shadowColor: theme.shadow,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.25,
      shadowRadius: 8,
      elevation: 10,
      flexDirection: "column",
    },
    timePickerColumns: {
      flexDirection: "row",
      justifyContent: "center",
      alignItems: "center",
      marginBottom: 20,
      flex: 1,
    },
    timePickerColumn: {
      flex: 1,
      marginHorizontal: 5,
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 10,
    },
    timePickerAmPmColumn: {
      justifyContent: "space-around",
      marginHorizontal: 5,
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 10,
      flex: 1,
    },
    timePickerItem: {
      paddingVertical: 15,
      alignItems: "center",
    },
    timePickerItemSelected: {
      backgroundColor: theme.primary,
      borderRadius: 8,
      marginHorizontal: 5,
    },
    timePickerItemText: {
      fontSize: 20,
      color: theme.text,
    },
    timePickerItemTextSelected: {
      fontWeight: "bold",
      color: "#fff",
    },
    timePickerSeparator: {
      fontSize: 24,
      fontWeight: "bold",
      color: theme.text,
      marginHorizontal: 5,
    },
    timePickerSaveButton: {
      backgroundColor: theme.primary,
      paddingVertical: 12,
      paddingHorizontal: 15,
      borderRadius: 12,
      marginTop: 10,
      alignSelf: "stretch",
    },
    timePickerSaveButtonText: {
      color: "#fff",
      textAlign: "center",
      fontSize: 16,
      fontWeight: "bold",
    },
    moreModalContent: {
      width: "90%",
      backgroundColor: theme.surface,
      borderRadius: 15,
      padding: 20,
      maxHeight: "85%",
      shadowColor: theme.shadow,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.25,
      shadowRadius: 8,
      elevation: 10,
    },
    moreOptionButton: {
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: 15,
      paddingHorizontal: 10,
      borderRadius: 10,
      marginBottom: 10,
      backgroundColor: theme.card,
    },
    moreOptionButtonText: {
      fontSize: 16,
      color: theme.text,
      marginLeft: 15,
      fontWeight: "500",
    },
    moreOptionGroup: {
      marginBottom: 10,
      paddingVertical: 10,
      paddingHorizontal: 10,
      backgroundColor: theme.card,
      borderRadius: 10,
    },
    moreOptionGroupTitle: {
      fontSize: 14,
      fontWeight: "bold",
      color: theme.textSecondary,
      marginBottom: 10,
      marginLeft: 5,
    },
    moreOptionSubButton: {
      paddingVertical: 12,
      paddingHorizontal: 15,
      borderRadius: 8,
      marginBottom: 5,
      backgroundColor: theme.background,
    },
    moreOptionSubButtonText: {
      fontSize: 15,
      color: theme.text,
      marginLeft: 10,
    },
    logoutButton: {
      backgroundColor: theme.danger,
      marginTop: 20,
      justifyContent: "center",
    },
    logoutButtonText: {
      color: "#fff",
      fontWeight: "bold",
    },
    loadingOverlay: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      backgroundColor: theme.background,
    },
    loadingText: {
      marginTop: 10,
      color: theme.text,
      fontSize: 16,
    },
    permanentDeleteButton: {
      backgroundColor: "#e98282ff", // Dark red for permanent delete
      width: "100%",
      marginTop: 10,
      justifyContent: "center",
    },
  })

export default MainScreen
