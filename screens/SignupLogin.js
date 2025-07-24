"use client"
import { StyleSheet, Text, View, TextInput, TouchableOpacity, Alert } from "react-native"
import { useState } from "react"
import { Ionicons } from "@expo/vector-icons" // Add this import
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, sendPasswordResetEmail } from "firebase/auth"
import { auth } from "../firebase/config" // Corrected import path

const SignupLogin = () => {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [isLogin, setIsLogin] = useState(true)
  const [showPassword, setShowPassword] = useState(false) // Add this state

  const handleAuth = async () => {
    try {
      if (isLogin) {
        // Login
        await signInWithEmailAndPassword(auth, email, password)
        Alert.alert("Success", "Logged in successfully!")
      } else {
        // Signup
        await createUserWithEmailAndPassword(auth, email, password)
        Alert.alert("Success", "Account created successfully!")
      }
    } catch (error) {
      let errorMessage = "An error occurred. Please try again."
      if (error.code === "auth/email-already-in-use") {
        errorMessage = "That email address is already in use!"
      } else if (error.code === "auth/invalid-email") {
        errorMessage = "That email address is invalid!"
      } else if (error.code === "auth/weak-password") {
        errorMessage = "Password should be at least 6 characters."
      } else if (error.code === "auth/user-not-found" || error.code === "auth/wrong-password") {
        errorMessage = "Invalid email or password."
      }
      Alert.alert("Authentication Error", errorMessage)
      console.error(error)
    }
  }

  const handleForgotPassword = async () => {
    if (!email.trim()) {
      Alert.alert("Error", "Please enter your email address to reset your password.")
      return
    }
    try {
      await sendPasswordResetEmail(auth, email)
      Alert.alert("Password Reset", "A password reset email has been sent to your email address.")
    } catch (error) {
      let errorMessage = "Failed to send password reset email. Please try again."
      if (error.code === "auth/invalid-email") {
        errorMessage = "That email address is invalid!"
      } else if (error.code === "auth/user-not-found") {
        errorMessage = "No user found with that email address."
      }
      Alert.alert("Password Reset Error", errorMessage)
      console.error("Password reset error:", error)
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{isLogin ? "Login" : "Sign Up"}</Text>
      <TextInput
        style={styles.input}
        placeholder="Email"
        placeholderTextColor="#888"
        keyboardType="email-address"
        autoCapitalize="none"
        value={email}
        onChangeText={setEmail}
      />
      <View style={styles.passwordInputContainer}>
        <TextInput
          style={styles.input}
          placeholder="Password"
          placeholderTextColor="#888"
          secureTextEntry={!showPassword} // Toggle based on state
          value={password}
          onChangeText={setPassword}
        />
        <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.passwordToggleIcon}>
          <Ionicons
            name={showPassword ? "eye-off-outline" : "eye-outline"} // Change icon based on state
            size={24}
            color="#888"
          />
        </TouchableOpacity>
      </View>
      <TouchableOpacity style={styles.button} onPress={handleAuth}>
        <Text style={styles.buttonText}>{isLogin ? "Log In" : "Sign Up"}</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={() => setIsLogin(!isLogin)}>
        <Text style={styles.toggleText}>
          {isLogin ? "Need an account? Sign Up" : "Already have an account? Log In"}
        </Text>
      </TouchableOpacity>
      {isLogin && ( // Only show if in login mode
        <TouchableOpacity onPress={handleForgotPassword}>
          <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
        </TouchableOpacity>
      )}
    </View>
  )
}

export default SignupLogin

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#202327", // Dark background
    padding: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#f8f8f8", // White text
    marginBottom: 30,
  },
  input: {
    width: "100%",
    backgroundColor: "#3A3D42", // Darker input background
    padding: 15,
    borderRadius: 10,
    fontSize: 16,
    color: "#f8f8f8",
    marginBottom: 15,
    borderWidth: 1,
    borderColor: "#444",
  },
  button: {
    width: "100%",
    backgroundColor: "#0077b6", // Blue accent
    padding: 18,
    borderRadius: 12,
    alignItems: "center",
    marginBottom: 20,
  },
  buttonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
  },
  toggleText: {
    color: "#0077b6", // Blue accent for link
    fontSize: 16,
    marginTop: 10,
  },
  passwordInputContainer: {
    // New style for wrapping password input and icon
    flexDirection: "row",
    alignItems: "center",
    width: "100%",
    marginBottom: 15,
    backgroundColor: "#3A3D42",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#444",
  },
  passwordToggleIcon: {
    // New style for the eye icon
    padding: 10,
    position: "absolute",
    right: 5,
  },
  forgotPasswordText: {
    // New style for forgot password link
    color: "#0077b6",
    fontSize: 14,
    marginTop: 10,
    textDecorationLine: "underline",
  },
})
