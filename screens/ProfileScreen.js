"use client"

import { useState, useEffect } from "react"
import { View, Text, StyleSheet, TouchableOpacity, Image, ScrollView, Platform, TextInput } from "react-native"
import { Ionicons } from "@expo/vector-icons"
import { useNavigation } from "@react-navigation/native"
import { auth, db } from "../firebase/config"
import { onAuthStateChanged, updatePassword } from "firebase/auth"
import { collection, doc, getDoc, setDoc, query, where, getDocs } from "firebase/firestore"

const ProfileScreen = ({ theme, darkMode }) => {
  const navigation = useNavigation()
  const [user, setUser] = useState(null)
  const [profileData, setProfileData] = useState({
    name: "",
    email: "",
    avatar: "https://blob.v0.dev/pjtmy8OGJ.png",
    totalTasks: 0,
    completedTasks: 0,
  })
  const [usernameInput, setUsernameInput] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmNewPassword, setConfirmNewPassword] = useState("")
  const [passwordError, setPasswordError] = useState("")
  const [profileUpdateMessage, setProfileUpdateMessage] = useState("")
  const [passwordUpdateMessage, setPasswordUpdateMessage] = useState("")
  const [isEditingProfile, setIsEditingProfile] = useState(false)
  const [isChangingPassword, setIsChangingPassword] = useState(false)

  // Create dynamic styles based on theme
  const styles = createStyles(theme)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUser(currentUser)
        setProfileData((prev) => ({ ...prev, email: currentUser.email }))
        const userDocRef = doc(db, "users", currentUser.uid)
        const docSnap = await getDoc(userDocRef)
        if (docSnap.exists()) {
          const data = docSnap.data()
          setProfileData((prev) => ({
            ...prev,
            name: data.name || "",
          }))
          setUsernameInput(data.name || "")
        } else {
          await setDoc(
            userDocRef,
            {
              email: currentUser.email,
              uid: currentUser.uid,
              name: currentUser.displayName || "",
            },
            { merge: true },
          )
          setUsernameInput(currentUser.displayName || "")
        }
        // Fetch user-specific task stats
        try {
          const tasksRef = collection(db, "tasks")
          const q = query(tasksRef, where("userId", "==", currentUser.uid))
          const querySnapshot = await getDocs(q)
          const total = querySnapshot.size
          const completed = querySnapshot.docs.filter((doc) => doc.data().status === "completed").length
          setProfileData((prev) => ({
            ...prev,
            totalTasks: total,
            completedTasks: completed,
          }))
        } catch (err) {
          console.error("Error fetching task stats:", err)
        }
      } else {
        setUser(null)
      }
    })
    return unsubscribe
  }, [])

  const validatePassword = (password) => {
    if (password.length < 8) return "Password must be at least 8 characters long."
    if (!/[A-Z]/.test(password)) return "Password must contain at least one uppercase letter."
    if (!/[a-z]/.test(password)) return "Password must contain at least one lowercase letter."
    if (!/[0-9]/.test(password)) return "Password must contain at least one digit."
    if (!/[^a-zA-Z0-9]/.test(password)) return "Password must contain at least one special character."
    return ""
  }

  const handleUpdateProfile = async () => {
    setProfileUpdateMessage("")
    if (!user) return setProfileUpdateMessage("User not logged in.")

    try {
      const userDocRef = doc(db, "users", user.uid)
      await setDoc(
        userDocRef,
        {
          name: usernameInput,
          email: user.email,
          uid: user.uid,
        },
        { merge: true },
      )
      setProfileData((prev) => ({
        ...prev,
        name: usernameInput,
      }))
      setProfileUpdateMessage("Profile updated successfully!")
      setIsEditingProfile(false)
    } catch (error) {
      console.error("Error updating profile:", error)
      setProfileUpdateMessage("Failed to update profile: " + error.message)
    }
  }

  const handleChangePassword = async () => {
    setPasswordUpdateMessage("")
    setPasswordError("")
    if (!user) return setPasswordUpdateMessage("User not logged in.")
    const validation = validatePassword(newPassword)
    if (validation) return setPasswordError(validation)
    if (newPassword !== confirmNewPassword) {
      return setPasswordError("New password and confirm password do not match.")
    }
    try {
      await updatePassword(user, newPassword)
      setPasswordUpdateMessage("Password updated successfully!")
      setNewPassword("")
      setConfirmNewPassword("")
      setIsChangingPassword(false)
    } catch (error) {
      console.error("Error changing password:", error)
      if (error.code === "auth/requires-recent-login") {
        setPasswordUpdateMessage("Please log in again to update your password.")
      } else {
        setPasswordUpdateMessage("Failed to change password: " + error.message)
      }
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Profile</Text>
        <View style={styles.headerRight} />
      </View>
      <ScrollView contentContainerStyle={styles.scrollViewContent}>
        <View style={styles.profileCard}>
          <Image source={{ uri: profileData.avatar }} style={styles.avatar} />
          <Text style={styles.name}>{profileData.name || "No Name Set"}</Text>
          <Text style={styles.email}>{profileData.email}</Text>
          <View style={styles.statsContainer}>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{profileData.totalTasks}</Text>
              <Text style={styles.statLabel}>Total Tasks</Text>
            </View>
            <View style={styles.statSeparator} />
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{profileData.completedTasks}</Text>
              <Text style={styles.statLabel}>Completed</Text>
            </View>
          </View>
          {!isEditingProfile ? (
            <TouchableOpacity style={styles.editProfileButton} onPress={() => setIsEditingProfile(true)}>
              <Text style={styles.editProfileButtonText}>Edit Profile</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.editSection}>
              <Text style={styles.sectionTitle}>Edit Profile</Text>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Username</Text>
                <TextInput
                  style={styles.input}
                  value={usernameInput}
                  onChangeText={setUsernameInput}
                  placeholder="Enter your username"
                  placeholderTextColor={theme.textTertiary}
                />
              </View>
              {profileUpdateMessage ? (
                <Text style={[styles.messageText, { color: theme.success }]}>{profileUpdateMessage}</Text>
              ) : null}
              <View style={styles.buttonRow}>
                <TouchableOpacity style={styles.saveButton} onPress={handleUpdateProfile}>
                  <Text style={styles.buttonText}>Save Profile</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={() => {
                    setIsEditingProfile(false)
                    setUsernameInput(profileData.name)
                    setProfileUpdateMessage("")
                  }}
                >
                  <Text style={styles.buttonText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
          {!isChangingPassword ? (
            <TouchableOpacity style={styles.editProfileButton} onPress={() => setIsChangingPassword(true)}>
              <Text style={styles.editProfileButtonText}>Change Password</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.editSection}>
              <Text style={styles.sectionTitle}>Change Password</Text>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>New Password</Text>
                <TextInput
                  style={styles.input}
                  value={newPassword}
                  onChangeText={setNewPassword}
                  placeholder="Enter new password"
                  placeholderTextColor={theme.textTertiary}
                  secureTextEntry
                />
              </View>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Confirm New Password</Text>
                <TextInput
                  style={styles.input}
                  value={confirmNewPassword}
                  onChangeText={setConfirmNewPassword}
                  placeholder="Confirm new password"
                  placeholderTextColor={theme.textTertiary}
                  secureTextEntry
                />
                {passwordError ? <Text style={styles.errorText}>{passwordError}</Text> : null}
              </View>
              {passwordUpdateMessage ? (
                <Text style={[styles.messageText, { color: theme.success }]}>{passwordUpdateMessage}</Text>
              ) : null}
              <View style={styles.buttonRow}>
                <TouchableOpacity style={styles.saveButton} onPress={handleChangePassword}>
                  <Text style={styles.buttonText}>Update Password</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={() => {
                    setIsChangingPassword(false)
                    setNewPassword("")
                    setConfirmNewPassword("")
                    setPasswordError("")
                    setPasswordUpdateMessage("")
                  }}
                >
                  <Text style={styles.buttonText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  )
}

// Dynamic styles function
const createStyles = (theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.background,
      paddingTop: Platform.OS === "android" ? 30 : 50,
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 15,
      paddingBottom: 15,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
    },
    backButton: {
      padding: 5,
    },
    headerTitle: {
      fontSize: 22,
      fontWeight: "bold",
      color: theme.text,
    },
    headerRight: {
      width: 24, // To balance the back button
    },
    scrollViewContent: {
      flexGrow: 1,
      alignItems: "center",
      paddingVertical: 20,
    },
    profileCard: {
      width: "90%",
      backgroundColor: theme.surface,
      borderRadius: 15,
      padding: 20,
      alignItems: "center",
      shadowColor: theme.shadow,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.25,
      shadowRadius: 8,
      elevation: 10,
      borderWidth: 1,
      borderColor: theme.border,
    },
    avatar: {
      width: 100,
      height: 100,
      borderRadius: 50,
      marginBottom: 15,
      borderWidth: 3,
      borderColor: theme.primary,
    },
    name: {
      fontSize: 24,
      fontWeight: "bold",
      color: theme.text,
      marginBottom: 5,
    },
    email: {
      fontSize: 16,
      color: theme.textSecondary,
      marginBottom: 20,
    },
    statsContainer: {
      flexDirection: "row",
      justifyContent: "space-around",
      width: "100%",
      marginBottom: 20,
      paddingVertical: 15,
      borderTopWidth: 1,
      borderBottomWidth: 1,
      borderColor: theme.border,
      backgroundColor: theme.background,
      borderRadius: 10,
    },
    statItem: {
      alignItems: "center",
    },
    statNumber: {
      fontSize: 24,
      fontWeight: "bold",
      color: theme.primary,
      marginBottom: 4,
    },
    statLabel: {
      fontSize: 14,
      color: theme.textSecondary,
      fontWeight: "500",
    },
    statSeparator: {
      width: 1,
      backgroundColor: theme.border,
      marginHorizontal: 10,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: "bold",
      color: theme.text,
      marginBottom: 15,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
      paddingBottom: 8,
    },
    editProfileButton: {
      backgroundColor: theme.primary,
      paddingVertical: 12,
      paddingHorizontal: 30,
      borderRadius: 12,
      marginTop: 15,
      shadowColor: theme.shadow,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.2,
      shadowRadius: 4,
      elevation: 3,
    },
    editProfileButtonText: {
      color: "#fff",
      fontSize: 16,
      fontWeight: "bold",
    },
    editSection: {
      width: "100%",
      marginTop: 20,
      paddingTop: 20,
      borderTopWidth: 1,
      borderTopColor: theme.border,
    },
    inputGroup: {
      marginBottom: 15,
    },
    label: {
      fontSize: 16,
      color: theme.text,
      marginBottom: 8,
      fontWeight: "600",
    },
    input: {
      backgroundColor: theme.background,
      color: theme.text,
      borderRadius: 10,
      paddingHorizontal: 15,
      paddingVertical: 12,
      fontSize: 16,
      borderWidth: 1,
      borderColor: theme.border,
    },
    errorText: {
      color: theme.danger,
      fontSize: 13,
      marginTop: 5,
      fontWeight: "500",
    },
    messageText: {
      fontSize: 14,
      marginTop: 10,
      textAlign: "center",
      fontWeight: "500",
    },
    buttonRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      marginTop: 20,
      gap: 10,
    },
    saveButton: {
      backgroundColor: theme.primary,
      paddingVertical: 12,
      paddingHorizontal: 20,
      borderRadius: 10,
      flex: 1,
      alignItems: "center",
      shadowColor: theme.shadow,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.2,
      shadowRadius: 4,
      elevation: 3,
    },
    cancelButton: {
      backgroundColor: theme.textTertiary,
      paddingVertical: 12,
      paddingHorizontal: 20,
      borderRadius: 10,
      flex: 1,
      alignItems: "center",
    },
    buttonText: {
      color: "#fff",
      fontSize: 16,
      fontWeight: "bold",
    },
  })

export default ProfileScreen
