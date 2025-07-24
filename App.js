"use client"
import { useState, useEffect } from "react"
import { NavigationContainer } from "@react-navigation/native"
import { createStackNavigator } from "@react-navigation/stack"
import { onAuthStateChanged } from "firebase/auth"
import { auth } from "./firebase/config" // Import the auth instance
import MainScreen from "./screens/MainScreen"
import SignupLogin from "./screens/SignupLogin"
import ProfileScreen from "./screens/ProfileScreen" // Import the new ProfileScreen
import { View, ActivityIndicator, StyleSheet, Text } from "react-native" // Import Text for loading message

const Stack = createStackNavigator()

const App = () => {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    console.log("App.js: useEffect - Setting up onAuthStateChanged listener.")
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      console.log("App.js: onAuthStateChanged callback fired.")
      if (currentUser) {
        console.log("App.js: User detected:", currentUser.uid, "Email:", currentUser.email)
        setUser(currentUser)
      } else {
        console.log("App.js: No user detected (logged out or not signed in). Setting user to null.")
        setUser(null) // Ensure user is null if no one is logged in
      }
      console.log("App.js: Setting loading to false.")
      setLoading(false) // Authentication state has been determined
    })

    // Cleanup subscription on unmount
    return () => {
      console.log("App.js: Unsubscribing from onAuthStateChanged listener.")
      unsubscribe()
    }
  }, [])

  console.log("App.js: Render - Current loading state:", loading, "Current user state:", user ? user.uid : "null")

  if (loading) {
    console.log("App.js: Rendering loading screen.")
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0077b6" />
        <Text style={styles.loadingText}>Loading app...</Text>
      </View>
    )
  }

  console.log("App.js: Rendering based on user status. User:", user ? user.uid : "null")

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {user ? (
          <Stack.Group>
            <Stack.Screen name="Main">{(props) => <MainScreen {...props} user={user} />}</Stack.Screen>
            <Stack.Screen name="Profile" component={ProfileScreen} />
          </Stack.Group>
        ) : (
          <Stack.Screen name="Auth" component={SignupLogin} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  )
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#202327", // Match app background
  },
  loadingText: {
    marginTop: 10,
    color: "#f8f8f8",
    fontSize: 16,
  },
})

export default App
