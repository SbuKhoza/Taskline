"use client"

import { useState, useEffect } from "react"
import {
  StyleSheet,
  Text,
  View,
  Switch,
  TextInput,
  TouchableOpacity,
  Alert,
  Platform,
  ScrollView,
} from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import DateTimePicker from "@react-native-community/datetimepicker"
import AsyncStorage from "@react-native-async-storage/async-storage"
import { db } from "../firebase/config"
import { collection, addDoc, doc, setDoc, serverTimestamp } from "firebase/firestore"
import { __DEV__ } from "react-native"
import { useNavigation } from "@react-navigation/native"
import { Ionicons } from "@expo/vector-icons"

const reminderOptions = [
  "Whole day",
  "1 hour before",
  "30 minutes before",
  "15 minutes before",
  "5 minutes before",
  "1 minute before",
  "Custom",
]

const Settings = ({ user, theme, darkMode, setDarkMode }) => {
  const [remindersEnabled, setRemindersEnabled] = useState(true)
  const [reminderTime, setReminderTime] = useState(reminderOptions[0])
  const [customTime, setCustomTime] = useState(new Date())
  const [showPicker, setShowPicker] = useState(false)
  const [feedback, setFeedback] = useState("")
  const [notificationsSupported, setNotificationsSupported] = useState(false)

  const navigation = useNavigation()

  // Create dynamic styles based on theme
  const styles = createStyles(theme)

  useEffect(() => {
    checkNotificationSupport()
    loadSettings()
  }, [])

  const checkNotificationSupport = () => {
    const isExpoGo =
      __DEV__ &&
      !Platform.select({
        ios: false,
        android: false,
        default: true,
      })
    setNotificationsSupported(!isExpoGo)
  }

  const loadSettings = async () => {
    try {
      const savedReminderEnabled = await AsyncStorage.getItem("remindersEnabled")
      const savedReminderTime = await AsyncStorage.getItem("reminderTime")

      if (savedReminderEnabled !== null) {
        setRemindersEnabled(JSON.parse(savedReminderEnabled))
      }
      if (savedReminderTime !== null) {
        setReminderTime(savedReminderTime)
      }
    } catch (error) {
      console.error("Failed to load settings:", error)
    }
  }

  const toggleDarkMode = async () => {
    try {
      const newValue = !darkMode
      setDarkMode(newValue)
      await AsyncStorage.setItem("darkMode", String(newValue))

      if (user?.uid) {
        await setDoc(doc(db, "users", user.uid), { darkMode: newValue }, { merge: true })
      }
    } catch (err) {
      console.error("Failed to save theme:", err)
      Alert.alert("Error", "Failed to save theme preference")
    }
  }

  const toggleReminders = async () => {
    const newValue = !remindersEnabled
    setRemindersEnabled(newValue)

    try {
      await AsyncStorage.setItem("remindersEnabled", JSON.stringify(newValue))

      if (user?.uid) {
        await setDoc(
          doc(db, "users", user.uid),
          {
            remindersEnabled: newValue,
          },
          { merge: true },
        )
      }
    } catch (error) {
      console.error("Failed to save reminder preference:", error)
    }
  }

  const handleReminderTimeChange = async (option) => {
    setReminderTime(option)

    try {
      await AsyncStorage.setItem("reminderTime", option)

      if (user?.uid) {
        await setDoc(
          doc(db, "users", user.uid),
          {
            reminderTime: option,
          },
          { merge: true },
        )
      }
    } catch (error) {
      console.error("Failed to save reminder time:", error)
    }
    if (option === "Custom") {
      setShowPicker(true)
    }
  }

  const handleFeedbackSubmit = async () => {
    if (!feedback.trim()) {
      Alert.alert("Empty Feedback", "Please enter some feedback before submitting.")
      return
    }
    try {
      await addDoc(collection(db, "reports"), {
        feedback: feedback.trim(),
        userId: user?.uid || "anonymous",
        email: user?.email || "anonymous",
        createdAt: serverTimestamp(),
        platform: Platform.OS,
        appVersion: "1.0.0",
      })

      Alert.alert("Success", "Your feedback has been submitted. Thank you!")
      setFeedback("")
    } catch (error) {
      console.error("Failed to submit feedback:", error)
      Alert.alert("Error", "Failed to submit feedback. Please try again.")
    }
  }

  const scheduleNotification = async () => {
    if (!notificationsSupported) {
      Alert.alert(
        "Notifications Not Available",
        "Push notifications require a development build. This feature will work when you build your app for production.",
      )
      return
    }
    const now = new Date()
    const diffMs = customTime.getTime() - now.getTime()
    if (diffMs <= 0) {
      Alert.alert("Invalid Time", "Please pick a time in the future.")
      return
    }
    try {
      Alert.alert("Reminder Set", `Custom reminder would be scheduled for ${customTime.toLocaleTimeString()}`)
    } catch (error) {
      console.error("Failed to schedule notification:", error)
      Alert.alert("Error", "Failed to schedule notification.")
    }
  }

  const handleCustomTimeChange = (event, selectedDate) => {
    setShowPicker(Platform.OS === "ios")

    if (selectedDate) {
      setCustomTime(selectedDate)

      if (Platform.OS === "android") {
        scheduleNotification()
      }
    }
  }

  const openAppRating = () => {
    const storeUrl = Platform.select({
      ios: "https://apps.apple.com/app/your-app-id",
      android: "https://play.google.com/store/apps/details?id=your.package.name",
    })
    Alert.alert("Rate Our App", "Would you like to rate our app in the store?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Rate Now",
        onPress: () => {
          Alert.alert("Thank You!", "This would open the app store for rating.")
        },
      },
    ])
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
              <Ionicons name="arrow-back" size={24} color={theme.text} />
            </TouchableOpacity>
            <Text style={styles.heading}>Settings</Text>
            <View style={styles.headerRight} />
          </View>
          <Text style={styles.subtitle}>Customize your app experience</Text>
        </View>

        {/* Appearance Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Appearance</Text>
          <View style={styles.settingCard}>
            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingLabel}>Dark Mode</Text>
                <Text style={styles.settingDescription}>Switch between light and dark themes</Text>
              </View>
              <Switch
                value={darkMode}
                onValueChange={toggleDarkMode}
                trackColor={{ false: theme.border, true: theme.primary }}
                thumbColor={darkMode ? "#ffffff" : "#ffffff"}
                ios_backgroundColor={theme.border}
              />
            </View>
          </View>
        </View>

        {/* Notifications Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Notifications</Text>
          <View style={styles.settingCard}>
            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingLabel}>Reminders</Text>
                <Text style={styles.settingDescription}>Get notified about upcoming events</Text>
              </View>
              <Switch
                value={remindersEnabled}
                onValueChange={toggleReminders}
                trackColor={{ false: theme.border, true: theme.primary }}
                thumbColor={remindersEnabled ? "#ffffff" : "#ffffff"}
                ios_backgroundColor={theme.border}
              />
            </View>

            {/* Notification Support Warning */}
            {remindersEnabled && !notificationsSupported && (
              <View style={styles.warningBox}>
                <Text style={styles.warningText}>
                  ⚠️ Push notifications require a development build and won't work in Expo Go.
                </Text>
              </View>
            )}

            {/* Reminder Options */}
            {remindersEnabled && (
              <View style={styles.reminderSection}>
                <Text style={styles.reminderSectionTitle}>Reminder Timing</Text>
                <View style={styles.reminderGrid}>
                  {reminderOptions.map((option) => (
                    <TouchableOpacity
                      key={option}
                      style={[styles.reminderOption, reminderTime === option && styles.selectedOption]}
                      onPress={() => handleReminderTimeChange(option)}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.reminderText, reminderTime === option && styles.selectedText]}>
                        {option}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}
          </View>
        </View>

        {/* Custom Time Picker */}
        {showPicker && (
          <View style={styles.pickerCard}>
            <Text style={styles.pickerTitle}>Set Custom Reminder Time</Text>
            <View style={styles.pickerContainer}>
              <DateTimePicker
                mode="time"
                value={customTime}
                onChange={handleCustomTimeChange}
                display={Platform.OS === "ios" ? "spinner" : "default"}
                textColor={theme.text}
              />
              {Platform.OS === "ios" && (
                <View style={styles.pickerButtons}>
                  <TouchableOpacity
                    style={[styles.pickerButton, styles.cancelButton]}
                    onPress={() => setShowPicker(false)}
                  >
                    <Text style={styles.cancelButtonText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.pickerButton, styles.confirmButton]}
                    onPress={() => {
                      setShowPicker(false)
                      scheduleNotification()
                    }}
                  >
                    <Text style={styles.confirmButtonText}>Set Reminder</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </View>
        )}

        {/* Feedback Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Feedback</Text>
          <View style={styles.settingCard}>
            <Text style={styles.feedbackLabel}>Report an Issue or Share Feedback</Text>
            <Text style={styles.feedbackDescription}>Help us improve the app by sharing your thoughts</Text>
            <TextInput
              style={styles.textInput}
              placeholder="Tell us what you think..."
              placeholderTextColor={theme.textTertiary}
              multiline
              numberOfLines={4}
              value={feedback}
              onChangeText={setFeedback}
              maxLength={500}
              textAlignVertical="top"
            />
            <View style={styles.feedbackFooter}>
              <Text style={styles.characterCount}>{feedback.length}/500 characters</Text>
              <TouchableOpacity
                style={[styles.submitButton, !feedback.trim() && styles.disabledButton]}
                onPress={handleFeedbackSubmit}
                disabled={!feedback.trim()}
                activeOpacity={0.8}
              >
                <Text style={[styles.submitButtonText, !feedback.trim() && styles.disabledButtonText]}>
                  Submit Feedback
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Support Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Support</Text>
          <View style={styles.settingCard}>
            <TouchableOpacity style={styles.supportButton} onPress={openAppRating} activeOpacity={0.7}>
              <View style={styles.supportButtonContent}>
                <View>
                  <Text style={styles.supportButtonTitle}>Rate the App</Text>
                  <Text style={styles.supportButtonDescription}>Love the app? Leave us a review</Text>
                </View>
                <Text style={styles.supportButtonArrow}>→</Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>

        {/* App Info */}
        <View style={styles.appInfoSection}>
          <View style={styles.appInfo}>
            <Text style={styles.appInfoText}>Version 1.0.0 • Platform: {Platform.OS}</Text>
            <Text style={styles.appInfoSubtext}>Made with ❤️ Malloya Tech</Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

// Dynamic styles function
const createStyles = (theme) =>
  StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: theme.background,
    },
    container: {
      flex: 1,
      marginTop: 25,
    },
    contentContainer: {
      paddingHorizontal: 20,
      paddingBottom: 30,
    },
    header: {
      paddingTop: 20,
      paddingBottom: 10,
      marginBottom: 20,
    },
    headerTop: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 4,
    },
    backButton: {
      padding: 5,
      marginRight: 10,
    },
    headerRight: {
      width: 34, // To balance the back button
    },
    heading: {
      fontSize: 22,
      fontWeight: "700",
      color: theme.text,
      marginBottom: 4,
    },
    subtitle: {
      fontSize: 16,
      color: theme.textSecondary,
      fontWeight: "400",
    },
    section: {
      marginBottom: 24,
    },
    sectionTitle: {
      fontSize: 20,
      fontWeight: "600",
      color: theme.text,
      marginBottom: 12,
    },
    settingCard: {
      backgroundColor: theme.surface,
      borderRadius: 16,
      padding: 20,
      shadowColor: theme.shadow,
      shadowOffset: {
        width: 0,
        height: 2,
      },
      shadowOpacity: 0.08,
      shadowRadius: 8,
      elevation: 3,
      borderWidth: 1,
      borderColor: theme.border,
    },
    settingRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },
    settingInfo: {
      flex: 1,
      marginRight: 16,
    },
    settingLabel: {
      fontSize: 17,
      fontWeight: "600",
      color: theme.text,
      marginBottom: 2,
    },
    settingDescription: {
      fontSize: 14,
      color: theme.textSecondary,
      lineHeight: 18,
    },
    warningBox: {
      backgroundColor: theme.background,
      borderColor: theme.warning,
      borderWidth: 1,
      borderRadius: 12,
      padding: 16,
      marginTop: 16,
    },
    warningText: {
      color: theme.warning,
      fontSize: 14,
      fontWeight: "500",
      lineHeight: 20,
    },
    reminderSection: {
      marginTop: 20,
      paddingTop: 20,
      borderTopWidth: 1,
      borderTopColor: theme.border,
    },
    reminderSectionTitle: {
      fontSize: 16,
      fontWeight: "600",
      color: theme.text,
      marginBottom: 12,
    },
    reminderGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      marginHorizontal: -4,
    },
    reminderOption: {
      paddingVertical: 12,
      paddingHorizontal: 16,
      marginHorizontal: 4,
      marginVertical: 4,
      borderRadius: 24,
      backgroundColor: theme.background,
      borderWidth: 2,
      borderColor: "transparent",
      minWidth: "45%",
      alignItems: "center",
    },
    selectedOption: {
      backgroundColor: theme.primary,
      borderColor: theme.primary,
    },
    reminderText: {
      fontSize: 14,
      fontWeight: "500",
      color: theme.text,
      textAlign: "center",
    },
    selectedText: {
      color: "#ffffff",
      fontWeight: "600",
    },
    pickerCard: {
      backgroundColor: theme.surface,
      borderRadius: 16,
      padding: 20,
      marginBottom: 24,
      shadowColor: theme.shadow,
      shadowOffset: {
        width: 0,
        height: 2,
      },
      shadowOpacity: 0.08,
      shadowRadius: 8,
      elevation: 3,
      borderWidth: 1,
      borderColor: theme.border,
    },
    pickerTitle: {
      fontSize: 18,
      fontWeight: "600",
      color: theme.text,
      marginBottom: 16,
      textAlign: "center",
    },
    pickerContainer: {
      alignItems: "center",
    },
    pickerButtons: {
      flexDirection: "row",
      justifyContent: "space-around",
      width: "100%",
      marginTop: 20,
    },
    pickerButton: {
      paddingVertical: 12,
      paddingHorizontal: 24,
      borderRadius: 8,
      minWidth: 100,
      alignItems: "center",
    },
    cancelButton: {
      backgroundColor: theme.border,
    },
    confirmButton: {
      backgroundColor: theme.primary,
    },
    cancelButtonText: {
      color: theme.textSecondary,
      fontWeight: "600",
    },
    confirmButtonText: {
      color: "#ffffff",
      fontWeight: "600",
    },
    feedbackLabel: {
      fontSize: 16,
      fontWeight: "600",
      color: theme.text,
      marginBottom: 4,
    },
    feedbackDescription: {
      fontSize: 14,
      color: theme.textSecondary,
      marginBottom: 16,
      lineHeight: 20,
    },
    textInput: {
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 12,
      padding: 16,
      minHeight: 120,
      backgroundColor: theme.background,
      color: theme.text,
      fontSize: 16,
      lineHeight: 22,
    },
    feedbackFooter: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginTop: 12,
    },
    characterCount: {
      fontSize: 12,
      color: theme.textSecondary,
    },
    submitButton: {
      backgroundColor: theme.primary,
      paddingVertical: 10,
      paddingHorizontal: 20,
      borderRadius: 8,
    },
    disabledButton: {
      backgroundColor: theme.border,
    },
    submitButtonText: {
      color: "#ffffff",
      fontWeight: "600",
      fontSize: 14,
    },
    disabledButtonText: {
      color: theme.textTertiary,
    },
    supportButton: {
      paddingVertical: 4,
    },
    supportButtonContent: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },
    supportButtonTitle: {
      fontSize: 16,
      fontWeight: "600",
      color: theme.text,
      marginBottom: 2,
    },
    supportButtonDescription: {
      fontSize: 14,
      color: theme.textSecondary,
    },
    supportButtonArrow: {
      fontSize: 18,
      color: theme.primary,
      fontWeight: "600",
    },
    appInfoSection: {
      marginTop: 20,
      paddingTop: 20,
    },
    appInfo: {
      alignItems: "center",
      paddingTop: 20,
      borderTopWidth: 1,
      borderTopColor: theme.border,
    },
    appInfoText: {
      fontSize: 14,
      color: theme.textSecondary,
      marginBottom: 4,
    },
    appInfoSubtext: {
      fontSize: 12,
      color: theme.textTertiary,
    },
  })

export default Settings
