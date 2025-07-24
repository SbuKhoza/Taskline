"use client"
import { useState, useEffect } from "react"
import { View, Text, StyleSheet, TouchableOpacity, Image, ScrollView, Platform, TextInput } from "react-native"
import { Ionicons } from "@expo/vector-icons"
import { useNavigation } from "@react-navigation/native"

// Import auth and db directly from your provided firebaseConfig.js
import { auth, db } from "../firebase/config" // Adjust the import path as necessary
import { onAuthStateChanged, updatePassword } from "firebase/auth" // Import modular auth functions
// Import modular Firestore functions
import { collection, doc, getDoc, setDoc, query, where, getDocs } from "firebase/firestore"

const ProfileScreen = () => {
  const navigation = useNavigation()

  const [user, setUser] = useState(null)
  const [profileData, setProfileData] = useState({
    name: "",
    email: "",
    phoneNumber: "",
    bio: "Passionate about productivity and task management. Always looking for new ways to optimize my workflow!",
    avatar: "https://blob.v0.dev/pjtmy8OGJ.png", // Placeholder avatar
    memberSince: "January 2023",
    totalTasks: 150,
    completedTasks: 120,
  })

  const [usernameInput, setUsernameInput] = useState("")
  const [phoneNumberInput, setPhoneNumberInput] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmNewPassword, setConfirmNewPassword] = useState("")

  const [passwordError, setPasswordError] = useState("")
  const [phoneNumberError, setPhoneNumberError] = useState("")
  const [profileUpdateMessage, setProfileUpdateMessage] = useState("")
  const [passwordUpdateMessage, setPasswordUpdateMessage] = useState("")

  const [isEditingProfile, setIsEditingProfile] = useState(false)
  const [isChangingPassword, setIsChangingPassword] = useState(false)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUser(currentUser)
        setProfileData((prev) => ({ ...prev, email: currentUser.email }))

        // Fetch user data from Firestore using modular syntax
        const userDocRef = doc(db, "users", currentUser.uid)
        const docSnap = await getDoc(userDocRef)

        if (docSnap.exists()) {
          const data = docSnap.data()
          setProfileData((prev) => ({
            ...prev,
            name: data.name || "",
            phoneNumber: data.phoneNumber || "",
            // Keep other fields as they are if not in Firestore or not meant to be updated
          }))
          setUsernameInput(data.name || "")
          setPhoneNumberInput(data.phoneNumber || "")
        } else {
          // If user document doesn't exist, create a basic one with email and UID
          await setDoc(
            userDocRef,
            {
              email: currentUser.email,
              uid: currentUser.uid,
              name: currentUser.displayName || "", // Use display name if available
              phoneNumber: "",
            },
            { merge: true },
          )
          setUsernameInput(currentUser.displayName || "")
        }
      } else {
        setUser(null)
        // Optionally redirect to login if no user
        // navigation.navigate('Login'); // Example for navigation
      }
    })

    return unsubscribe
  }, [])

  const validatePassword = (password) => {
    if (password.length < 8) {
      return "Password must be at least 8 characters long."
    }
    if (!/[A-Z]/.test(password)) {
      return "Password must contain at least one uppercase letter."
    }
    if (!/[a-z]/.test(password)) {
      return "Password must contain at least one lowercase letter."
    }
    if (!/[0-9]/.test(password)) {
      return "Password must contain at least one digit."
    }
    if (!/[^a-zA-Z0-9]/.test(password)) {
      return "Password must contain at least one special character."
    }
    return ""
  }

  const handleUpdateProfile = async () => {
    setProfileUpdateMessage("")
    setPhoneNumberError("")

    if (!user) {
      setProfileUpdateMessage("User not logged in.")
      return
    }

    // Phone number validation
    const phoneNumberRegex = /^0[0-9]{9}$/
    if (phoneNumberInput && !phoneNumberRegex.test(phoneNumberInput)) {
      setPhoneNumberError("Phone number must start with 0 and be 10 digits long.")
      return
    }

    // Check phone number uniqueness if it's changed and not empty
    if (phoneNumberInput && phoneNumberInput !== profileData.phoneNumber) {
      try {
        const usersCollectionRef = collection(db, "users")
        const q = query(usersCollectionRef, where("phoneNumber", "==", phoneNumberInput))
        const querySnapshot = await getDocs(q)

        if (!querySnapshot.empty) {
          setPhoneNumberError("This phone number is already in use by another user.")
          return
        }
      } catch (error) {
        console.error("Error checking phone number uniqueness:", error)
        setPhoneNumberError("Error checking phone number uniqueness.")
        return
      }
    }

    try {
      const userDocRef = doc(db, "users", user.uid)
      await setDoc(
        userDocRef,
        {
          name: usernameInput,
          phoneNumber: phoneNumberInput,
          email: user.email, // Ensure email is also saved/updated in Firestore
          uid: user.uid,
        },
        { merge: true },
      )

      setProfileData((prev) => ({
        ...prev,
        name: usernameInput,
        phoneNumber: phoneNumberInput,
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

    if (!user) {
      setPasswordUpdateMessage("User not logged in.")
      return
    }

    const newPasswordValidation = validatePassword(newPassword)
    if (newPasswordValidation) {
      setPasswordError(newPasswordValidation)
      return
    }

    if (newPassword !== confirmNewPassword) {
      setPasswordError("New password and confirm password do not match.")
      return
    }

    // Firebase's updatePassword might require recent login.
    // If you encounter 'auth/requires-recent-login', you'll need to re-authenticate the user
    // (e.g., by asking them to log in again or using a re-authentication method).
    // For simplicity, explicit re-authentication is not implemented here.
    try {
      await updatePassword(user, newPassword)
      setPasswordUpdateMessage("Password updated successfully!")
      setNewPassword("")
      setConfirmNewPassword("")
      setPasswordError("") // Clear any previous password errors
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
          <Ionicons name="arrow-back" size={24} color="#f8f8f8" />
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

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>About Me</Text>
            <Text style={styles.sectionContent}>{profileData.bio}</Text>
          </View>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Member Since</Text>
            <Text style={styles.sectionContent}>{profileData.memberSince}</Text>
          </View>

          {/* Profile Edit Section */}
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
                  placeholderTextColor="#888"
                />
              </View>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Phone Number</Text>
                <TextInput
                  style={styles.input}
                  value={phoneNumberInput}
                  onChangeText={setPhoneNumberInput}
                  placeholder="e.g., 0123456789"
                  placeholderTextColor="#888"
                  keyboardType="phone-pad"
                />
                {phoneNumberError ? <Text style={styles.errorText}>{phoneNumberError}</Text> : null}
              </View>
              {profileUpdateMessage ? <Text style={styles.messageText}>{profileUpdateMessage}</Text> : null}
              <View style={styles.buttonRow}>
                <TouchableOpacity style={styles.saveButton} onPress={handleUpdateProfile}>
                  <Text style={styles.editProfileButtonText}>Save Profile</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={() => {
                    setIsEditingProfile(false)
                    setUsernameInput(profileData.name) // Reset to current data
                    setPhoneNumberInput(profileData.phoneNumber) // Reset to current data
                    setPhoneNumberError("")
                    setProfileUpdateMessage("")
                  }}
                >
                  <Text style={styles.editProfileButtonText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Password Change Section */}
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
                  placeholderTextColor="#888"
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
                  placeholderTextColor="#888"
                  secureTextEntry
                />
                {passwordError ? <Text style={styles.errorText}>{passwordError}</Text> : null}
              </View>
              {passwordUpdateMessage ? <Text style={styles.messageText}>{passwordUpdateMessage}</Text> : null}
              <View style={styles.buttonRow}>
                <TouchableOpacity style={styles.saveButton} onPress={handleChangePassword}>
                  <Text style={styles.editProfileButtonText}>Update Password</Text>
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
                  <Text style={styles.editProfileButtonText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  )
}

const originalStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#202327",
    paddingTop: Platform.OS === "android" ? 30 : 50,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 15,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#3A3D42",
  },
  backButton: {
    padding: 5,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#f8f8f8",
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
    backgroundColor: "#2C2F33",
    borderRadius: 15,
    padding: 20,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 10,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: 15,
    borderWidth: 3,
    borderColor: "#0077b6",
  },
  name: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#f8f8f8",
    marginBottom: 5,
  },
  email: {
    fontSize: 16,
    color: "#ccc",
    marginBottom: 20,
  },
  statsContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    width: "100%",
    marginBottom: 20,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: "#3A3D42",
  },
  statItem: {
    alignItems: "center",
  },
  statNumber: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#7ED321",
  },
  statLabel: {
    fontSize: 14,
    color: "#ccc",
  },
  statSeparator: {
    width: 1,
    backgroundColor: "#3A3D42",
    marginHorizontal: 10,
  },
  section: {
    width: "100%",
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#f8f8f8",
    marginBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#444",
    paddingBottom: 5,
  },
  sectionContent: {
    fontSize: 15,
    color: "#ccc",
    lineHeight: 22,
  },
  editProfileButton: {
    backgroundColor: "#0077b6",
    paddingVertical: 12,
    paddingHorizontal: 25,
    borderRadius: 10,
    marginTop: 20,
  },
  editProfileButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
})

const newStyles = StyleSheet.create({
  editSection: {
    width: "100%",
    marginTop: 20,
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: "#3A3D42",
  },
  inputGroup: {
    marginBottom: 15,
  },
  label: {
    fontSize: 16,
    color: "#f8f8f8",
    marginBottom: 5,
  },
  input: {
    backgroundColor: "#3A3D42",
    color: "#f8f8f8",
    borderRadius: 8,
    paddingHorizontal: 15,
    paddingVertical: 10,
    fontSize: 16,
  },
  errorText: {
    color: "#ff6b6b", // A red color for errors
    fontSize: 13,
    marginTop: 5,
  },
  messageText: {
    color: "#7ED321", // A green color for success messages
    fontSize: 14,
    marginTop: 10,
    textAlign: "center",
  },
  buttonRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginTop: 15,
  },
  saveButton: {
    backgroundColor: "#0077b6",
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 10,
    flex: 1,
    marginRight: 5,
    alignItems: "center",
  },
  cancelButton: {
    backgroundColor: "#6c757d", // A grey color for cancel
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 10,
    flex: 1,
    marginLeft: 5,
    alignItems: "center",
  },
})

const styles = { ...originalStyles, ...newStyles }

export default ProfileScreen
