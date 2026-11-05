"use client"
import "./global.css"
import { useState, useEffect } from "react"
import { NavigationContainer } from "@react-navigation/native"
import { createStackNavigator } from "@react-navigation/stack"
import { onAuthStateChanged } from "firebase/auth"
import { auth } from "./firebase/config"
import MainScreen from "./screens/MainScreen"
import SignupLogin from "./screens/SignupLogin"
import ProfileScreen from "./screens/ProfileScreen"
import Settings from "./screens/Settings"
import Privacy from "./screens/Privacy" // Import Privacy screen
import Terms from "./screens/Terms" // Import Terms screen
import Splash from "./screens/Splash" // Import your Splash component
import { View, ActivityIndicator, Text, StatusBar } from "react-native"
import AsyncStorage from "@react-native-async-storage/async-storage"

const Stack = createStackNavigator()

// Theme definitions
export const lightTheme = {
  background: "#f8f9fa",
  surface: "#ffffff",
  card: "#ffffff",
  text: "#1a1a1a",
  textSecondary: "#666666",
  textTertiary: "#999999",
  border: "#e0e0e0",
  primary: "#4A90E2",
  success: "#28a745",
  warning: "#ffc107",
  danger: "#dc3545",
  shadow: "rgba(0, 0, 0, 0.1)",
  statusBar: "dark-content",
}

export const darkTheme = {
  background: "#000000",
  surface: "#1c1c1c",
  card: "#2c2c2c",
  text: "#ffffff",
  textSecondary: "#cccccc",
  textTertiary: "#999999",
  border: "#404040",
  primary: "#4A90E2",
  success: "#28a745",
  warning: "#ffc107",
  danger: "#dc3545",
  shadow: "rgba(255, 255, 255, 0.1)",
  statusBar: "light-content",
}

const App = () => {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [darkMode, setDarkMode] = useState(false) // Default to light mode
  const [themeLoading, setThemeLoading] = useState(true)
  const [showSplash, setShowSplash] = useState(true) // Add splash state

  // Load theme preference on app start
  useEffect(() => {
    const loadTheme = async () => {
      try {
        const savedTheme = await AsyncStorage.getItem("darkMode")
        if (savedTheme !== null) {
          setDarkMode(JSON.parse(savedTheme))
        }
      } catch (error) {
        console.error("Failed to load theme:", error)
      } finally {
        setThemeLoading(false)
      }
    }
    loadTheme()
  }, [])

  useEffect(() => {
    console.log("App.js: useEffect - Setting up onAuthStateChanged listener.")
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      console.log("App.js: onAuthStateChanged callback fired.")
      if (currentUser) {
        console.log("App.js: User detected:", currentUser.uid, "Email:", currentUser.email)
        setUser(currentUser)
      } else {
        console.log("App.js: No user detected (logged out or not signed in). Setting user to null.")
        setUser(null)
      }
      console.log("App.js: Setting loading to false.")
      setLoading(false)
    })

    return () => {
      console.log("App.js: Unsubscribing from onAuthStateChanged listener.")
      unsubscribe()
    }
  }, [])

  // Handle splash screen timing
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowSplash(false)
    }, 2000) // Show splash for 2 seconds, adjust as needed

    return () => clearTimeout(timer)
  }, [])

  const currentTheme = darkMode ? darkTheme : lightTheme

  // Show splash screen first
  if (showSplash) {
    return <Splash theme={currentTheme} />
  }

  // Show loading screen while auth and theme are loading
  if (loading || themeLoading) {
    return (
      <View className="flex-1 items-center justify-center" style={{ backgroundColor: currentTheme.background }}>
        <StatusBar barStyle={currentTheme.statusBar} backgroundColor={currentTheme.background} />
        <ActivityIndicator size="large" color={currentTheme.primary} />
        <Text className="mt-3 text-base font-medium" style={{ color: currentTheme.text }}>Loading app...</Text>
      </View>
    )
  }

  return (
    <>
      <StatusBar barStyle={currentTheme.statusBar} backgroundColor={currentTheme.background} />
      <NavigationContainer>
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          {user ? (
            <Stack.Group>
              <Stack.Screen name="Main">
                {(props) => <MainScreen {...props} user={user} theme={currentTheme} darkMode={darkMode} />}
              </Stack.Screen>
              <Stack.Screen name="Profile">
                {(props) => <ProfileScreen {...props} theme={currentTheme} darkMode={darkMode} />}
              </Stack.Screen>
              <Stack.Screen name="Settings">
                {(props) => (
                  <Settings {...props} user={user} theme={currentTheme} darkMode={darkMode} setDarkMode={setDarkMode} />
                )}
              </Stack.Screen>
              <Stack.Screen name="Privacy">
                {(props) => <Privacy {...props} theme={currentTheme} />}
              </Stack.Screen>
              <Stack.Screen name="Terms">
                {(props) => <Terms {...props} theme={currentTheme} />}
              </Stack.Screen>
            </Stack.Group>
          ) : (
            <Stack.Group>
              <Stack.Screen name="Auth">
                {(props) => <SignupLogin {...props} theme={currentTheme} darkMode={darkMode} />}
              </Stack.Screen>
              {/* Allow access to Privacy and Terms even when not logged in */}
              <Stack.Screen name="Privacy">
                {(props) => <Privacy {...props} theme={currentTheme} />}
              </Stack.Screen>
              <Stack.Screen name="Terms">
                {(props) => <Terms {...props} theme={currentTheme} />}
              </Stack.Screen>
            </Stack.Group>
          )}
        </Stack.Navigator>
      </NavigationContainer>
    </>
  )
}

export default App