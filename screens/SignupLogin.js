"use client"
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  Modal,
  ScrollView,
  Image,
  Animated,
} from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { useState, useRef, useEffect } from "react"
import { Ionicons } from "@expo/vector-icons"
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  signInWithPopup,
  GoogleAuthProvider,
} from "firebase/auth"
import { auth } from "../firebase/config"

const ErrorMessage = ({ message, theme, visible }) => {
  const fadeAnim = useRef(new Animated.Value(0)).current
  const slideAnim = useRef(new Animated.Value(-10)).current

  useEffect(() => {
    if (visible && message) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start()
    } else {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: -10,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start()
    }
  }, [visible, message])

  if (!visible || !message) return null

  return (
    <Animated.View
      style={[
        styles.errorContainer,
        {
          backgroundColor: theme?.errorBackground || "#ffebee",
          borderColor: theme?.error || "#f44336",
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        },
      ]}
    >
      <Ionicons name="alert-circle" size={16} color={theme?.error || "#f44336"} style={styles.errorIcon} />
      <Text style={[styles.errorText, { color: theme?.error || "#f44336" }]}>{message}</Text>
    </Animated.View>
  )
}

const SuccessMessage = ({ message, theme, visible }) => {
  const fadeAnim = useRef(new Animated.Value(0)).current
  const slideAnim = useRef(new Animated.Value(-10)).current

  useEffect(() => {
    if (visible && message) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start()
    } else {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: -10,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start()
    }
  }, [visible, message])

  if (!visible || !message) return null

  return (
    <Animated.View
      style={[
        styles.successContainer,
        {
          backgroundColor: theme?.successBackground || "#e8f5e8",
          borderColor: theme?.success || "#4caf50",
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        },
      ]}
    >
      <Ionicons name="checkmark-circle" size={16} color={theme?.success || "#4caf50"} style={styles.successIcon} />
      <Text style={[styles.successText, { color: theme?.success || "#4caf50" }]}>{message}</Text>
    </Animated.View>
  )
}

const SignupLogin = ({ theme, darkMode }) => {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [isLogin, setIsLogin] = useState(true)
  const [showPassword, setShowPassword] = useState(false)
  const [acceptedTerms, setAcceptedTerms] = useState(false)
  const [showTermsModal, setShowTermsModal] = useState(false)
  const [showPrivacyModal, setShowPrivacyModal] = useState(false)
  const [errorMessage, setErrorMessage] = useState("")
  const [successMessage, setSuccessMessage] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  // Clear messages when switching between login/signup
  useEffect(() => {
    setErrorMessage("")
    setSuccessMessage("")
  }, [isLogin])

  // Clear messages when user starts typing
  useEffect(() => {
    if (errorMessage) {
      setErrorMessage("")
    }
  }, [email, password])

  const getUserFriendlyErrorMessage = (errorCode) => {
    switch (errorCode) {
      case "auth/email-already-in-use":
        return "This email is already registered. Try logging in instead."
      case "auth/invalid-email":
        return "Please enter a valid email address."
      case "auth/weak-password":
        return "Password must be at least 6 characters long."
      case "auth/user-not-found":
        return "No account found with this email. Check your email or create a new account."
      case "auth/wrong-password":
        return "Incorrect password. Please try again or reset your password."
      case "auth/invalid-credential":
        return "Invalid email or password. Please check your credentials."
      case "auth/too-many-requests":
        return "Too many failed attempts. Please wait a moment before trying again."
      case "auth/network-request-failed":
        return "Network error. Please check your internet connection."
      case "auth/popup-closed-by-user":
        return "Sign-in was cancelled. Please try again."
      case "auth/account-exists-with-different-credential":
        return "An account with this email already exists. Try signing in with a different method."
      case "auth/popup-blocked":
        return "Pop-up was blocked. Please allow pop-ups and try again."
      case "auth/cancelled-popup-request":
        return "Sign-in was cancelled. Please try again."
      default:
        return "Something went wrong. Please try again."
    }
  }

  const validateInputs = () => {
    if (!email.trim()) {
      setErrorMessage("Please enter your email address.")
      return false
    }

    if (!email.includes("@") || !email.includes(".")) {
      setErrorMessage("Please enter a valid email address.")
      return false
    }

    if (!password.trim()) {
      setErrorMessage("Please enter your password.")
      return false
    }

    if (!isLogin && password.length < 6) {
      setErrorMessage("Password must be at least 6 characters long.")
      return false
    }

    return true
  }

  const handleAuth = async () => {
    setErrorMessage("")
    setSuccessMessage("")

    // Check if user is signing up and hasn't accepted terms
    if (!isLogin && !acceptedTerms) {
      setErrorMessage("Please accept the Terms & Conditions and Privacy Policy to create an account.")
      return
    }

    if (!validateInputs()) {
      return
    }

    setIsLoading(true)

    try {
      if (isLogin) {
        // Login
        await signInWithEmailAndPassword(auth, email, password)
        setSuccessMessage("Welcome back! You're now logged in.")
      } else {
        // Signup
        await createUserWithEmailAndPassword(auth, email, password)
        setSuccessMessage("Account created successfully! Welcome to the app.")
      }
    } catch (error) {
      const friendlyMessage = getUserFriendlyErrorMessage(error.code)
      setErrorMessage(friendlyMessage)
    } finally {
      setIsLoading(false)
    }
  }

  const handleGoogleSignIn = async () => {
    setErrorMessage("")
    setSuccessMessage("")

    // Check if user is signing up and hasn't accepted terms
    if (!isLogin && !acceptedTerms) {
      setErrorMessage("Please accept the Terms & Conditions and Privacy Policy to create an account.")
      return
    }

    setIsLoading(true)

    try {
      const provider = new GoogleAuthProvider()
      const result = await signInWithPopup(auth, provider)
      setSuccessMessage("Successfully signed in with Google!")
    } catch (error) {
      const friendlyMessage = getUserFriendlyErrorMessage(error.code)
      setErrorMessage(friendlyMessage)
    } finally {
      setIsLoading(false)
    }
  }

  const handleForgotPassword = async () => {
    setErrorMessage("")
    setSuccessMessage("")

    if (!email.trim()) {
      setErrorMessage("Please enter your email address first, then try resetting your password.")
      return
    }

    if (!email.includes("@") || !email.includes(".")) {
      setErrorMessage("Please enter a valid email address.")
      return
    }

    setIsLoading(true)

    try {
      await sendPasswordResetEmail(auth, email)
      setSuccessMessage("Password reset email sent! Check your inbox and follow the instructions.")
    } catch (error) {
      let friendlyMessage = "Unable to send password reset email. Please try again."

      if (error.code === "auth/invalid-email") {
        friendlyMessage = "Please enter a valid email address."
      } else if (error.code === "auth/user-not-found") {
        friendlyMessage = "No account found with this email address. Please check your email or create a new account."
      }

      setErrorMessage(friendlyMessage)
    } finally {
      setIsLoading(false)
    }
  }

  const toggleMode = () => {
    setIsLogin(!isLogin)
    setAcceptedTerms(false) // Reset terms acceptance when switching modes
    setErrorMessage("")
    setSuccessMessage("")
  }

  const TermsModal = () => (
    <Modal visible={showTermsModal} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView style={[styles.modalContainer, { backgroundColor: theme.background }]}>
        <View style={[styles.modalHeader, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
          <TouchableOpacity style={styles.modalCloseButton} onPress={() => setShowTermsModal(false)}>
            <Ionicons name="close" size={24} color={theme.text} />
          </TouchableOpacity>
          <Text style={[styles.modalTitle, { color: theme.text }]}>Terms & Conditions</Text>
          <View style={styles.placeholder} />
        </View>
        <ScrollView style={styles.modalScrollView} showsVerticalScrollIndicator={false}>
          <View style={styles.modalContent}>
            <Text style={[styles.lastUpdated, { color: theme.textSecondary }]}>
              Last updated: {new Date().toLocaleDateString()}
            </Text>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Acceptance of Terms</Text>
            <Text style={[styles.paragraph, { color: theme.textSecondary }]}>
              By accessing and using this application, you accept and agree to be bound by the terms and provision of
              this agreement. If you do not agree to abide by the above, please do not use this service.
            </Text>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Use License</Text>
            <Text style={[styles.paragraph, { color: theme.textSecondary }]}>
              Permission is granted to temporarily download one copy of the materials on our application for personal,
              non-commercial transitory viewing only. This is the grant of a license, not a transfer of title, and under
              this license you may not:
            </Text>
            <Text style={[styles.bulletPoint, { color: theme.textSecondary }]}>• Modify or copy the materials</Text>
            <Text style={[styles.bulletPoint, { color: theme.textSecondary }]}>
              • Use the materials for commercial purposes or public display
            </Text>
            <Text style={[styles.bulletPoint, { color: theme.textSecondary }]}>
              • Attempt to reverse engineer any software contained in the application
            </Text>
            <Text style={[styles.bulletPoint, { color: theme.textSecondary }]}>
              • Remove any copyright or proprietary notations from the materials
            </Text>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>User Accounts</Text>
            <Text style={[styles.paragraph, { color: theme.textSecondary }]}>
              When you create an account with us, you must provide information that is accurate, complete, and current
              at all times. You are responsible for safeguarding the password and for all activities that occur under
              your account.
            </Text>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Prohibited Uses</Text>
            <Text style={[styles.paragraph, { color: theme.textSecondary }]}>You may not use our service:</Text>
            <Text style={[styles.bulletPoint, { color: theme.textSecondary }]}>
              • For any unlawful purpose or to solicit others to perform unlawful acts
            </Text>
            <Text style={[styles.bulletPoint, { color: theme.textSecondary }]}>
              • To violate any international, federal, provincial, or state regulations, rules, laws, or local
              ordinances
            </Text>
            <Text style={[styles.bulletPoint, { color: theme.textSecondary }]}>
              • To infringe upon or violate our intellectual property rights or the intellectual property rights of
              others
            </Text>
            <Text style={[styles.bulletPoint, { color: theme.textSecondary }]}>
              • To harass, abuse, insult, harm, defame, slander, disparage, intimidate, or discriminate
            </Text>
            <Text style={[styles.bulletPoint, { color: theme.textSecondary }]}>
              • To submit false or misleading information
            </Text>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Contact Information</Text>
            <Text style={[styles.paragraph, { color: theme.textSecondary }]}>
              If you have any questions about these Terms and Conditions, please contact us at:
            </Text>
            <Text style={[styles.contactInfo, { color: theme.primary }]}>snaptasklegal@malloyagroup.co.za</Text>
            <View style={styles.bottomSpacing} />
          </View>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  )

  const PrivacyModal = () => (
    <Modal visible={showPrivacyModal} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView style={[styles.modalContainer, { backgroundColor: theme.background }]}>
        <View style={[styles.modalHeader, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
          <TouchableOpacity style={styles.modalCloseButton} onPress={() => setShowPrivacyModal(false)}>
            <Ionicons name="close" size={24} color={theme.text} />
          </TouchableOpacity>
          <Text style={[styles.modalTitle, { color: theme.text }]}>Privacy Policy</Text>
          <View style={styles.placeholder} />
        </View>
        <ScrollView style={styles.modalScrollView} showsVerticalScrollIndicator={false}>
          <View style={styles.modalContent}>
            <Text style={[styles.lastUpdated, { color: theme.textSecondary }]}>
              Last updated: {new Date().toLocaleDateString()}
            </Text>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Information We Collect</Text>
            <Text style={[styles.paragraph, { color: theme.textSecondary }]}>
              We collect information you provide directly to us, such as when you create an account, update your
              profile, or contact us for support. This may include your name, email address, and any other information
              you choose to provide.
            </Text>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>How We Use Your Information</Text>
            <Text style={[styles.paragraph, { color: theme.textSecondary }]}>
              We use the information we collect to:
            </Text>
            <Text style={[styles.bulletPoint, { color: theme.textSecondary }]}>
              • Provide, maintain, and improve our services
            </Text>
            <Text style={[styles.bulletPoint, { color: theme.textSecondary }]}>
              • Process transactions and send related information
            </Text>
            <Text style={[styles.bulletPoint, { color: theme.textSecondary }]}>
              • Send technical notices and support messages
            </Text>
            <Text style={[styles.bulletPoint, { color: theme.textSecondary }]}>
              • Respond to your comments and questions
            </Text>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Information Sharing</Text>
            <Text style={[styles.paragraph, { color: theme.textSecondary }]}>
              We do not sell, trade, or otherwise transfer your personal information to third parties without your
              consent, except as described in this policy. We may share your information in certain limited
              circumstances, such as to comply with legal obligations or protect our rights.
            </Text>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Data Security</Text>
            <Text style={[styles.paragraph, { color: theme.textSecondary }]}>
              We implement appropriate security measures to protect your personal information against unauthorized
              access, alteration, disclosure, or destruction. However, no method of transmission over the internet is
              100% secure.
            </Text>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Your Rights</Text>
            <Text style={[styles.paragraph, { color: theme.textSecondary }]}>
              You have the right to access, update, or delete your personal information. You may also have the right to
              restrict or object to certain processing of your data. To exercise these rights, please contact us using
              the information provided below.
            </Text>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Children's Privacy</Text>
            <Text style={[styles.paragraph, { color: theme.textSecondary }]}>
              Our service is not intended for children under 13 years of age. We do not knowingly collect personal
              information from children under 13. If we become aware that we have collected personal information from a
              child under 13, we will take steps to delete such information.
            </Text>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Contact Us</Text>
            <Text style={[styles.paragraph, { color: theme.textSecondary }]}>
              If you have any questions about this privacy policy, please contact us at:
            </Text>
            <Text style={[styles.contactInfo, { color: theme.primary }]}>snaptask@malloyagroup.co.za</Text>
            <View style={styles.bottomSpacing} />
          </View>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  )

  return (
    <View style={[styles.container, { backgroundColor: theme?.background || "#ffffff" }]}>
      {/* Background Text Elements */}
      <View style={styles.backgroundContainer}>
        <Text style={[styles.backgroundText, styles.malloyaText]}>Malloya</Text>
        <Text style={[styles.backgroundText, styles.tasksText]}>Tasks</Text>
        <Text style={[styles.backgroundText, styles.completeText]}>Complete</Text>
        <Text style={[styles.backgroundText, styles.todoText]}>To do</Text>
        {/* Background Icons */}
        <Ionicons name="time-outline" size={80} color="rgba(0,0,0,0.03)" style={styles.backgroundIcon1} />
        <Ionicons name="checkmark-circle-outline" size={70} color="rgba(0,0,0,0.03)" style={styles.backgroundIcon2} />
        <Ionicons name="list-outline" size={90} color="rgba(0,0,0,0.03)" style={styles.backgroundIcon3} />
        <Ionicons name="calendar-outline" size={60} color="rgba(0,0,0,0.03)" style={styles.backgroundIcon4} />
      </View>

      {/* Main Content */}
      <View style={styles.contentContainer}>
        {/* Logo */}
        <View style={styles.logoContainer}>
          <Image source={require("../assets/logo2.png")} style={styles.logoImage} resizeMode="contain" />
        </View>

        <Text style={[styles.title, { color: theme?.text || "#333333" }]}>
          {isLogin ? "Welcome Back" : "Create Account"}
        </Text>

        {/* Success Message */}
        <SuccessMessage message={successMessage} theme={theme} visible={!!successMessage} />

        {/* Error Message */}
        <ErrorMessage message={errorMessage} theme={theme} visible={!!errorMessage} />

        <TextInput
          style={[
            styles.input,
            {
              backgroundColor: theme?.surface || "#f8f9fa",
              borderColor:
                errorMessage &&
                (errorMessage.toLowerCase().includes("email") || errorMessage.toLowerCase().includes("valid"))
                  ? theme?.error || "#f44336"
                  : theme?.border || "#e0e0e0",
              color: theme?.text || "#333333",
            },
          ]}
          placeholder="Email"
          placeholderTextColor={theme?.textTertiary || "#888"}
          keyboardType="email-address"
          autoCapitalize="none"
          value={email}
          onChangeText={setEmail}
        />

        <View style={styles.passwordInputContainer}>
          <TextInput
            style={[
              styles.input,
              styles.passwordInput,
              {
                backgroundColor: theme?.surface || "#f8f9fa",
                borderColor:
                  errorMessage && errorMessage.toLowerCase().includes("password")
                    ? theme?.error || "#f44336"
                    : theme?.border || "#e0e0e0",
                color: theme?.text || "#333333",
              },
            ]}
            placeholder="Password"
            placeholderTextColor={theme?.textTertiary || "#888"}
            secureTextEntry={!showPassword}
            value={password}
            onChangeText={setPassword}
          />
          <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.passwordToggleIcon}>
            <Ionicons
              name={showPassword ? "eye-off-outline" : "eye-outline"}
              size={24}
              color={theme?.textTertiary || "#888"}
            />
          </TouchableOpacity>
        </View>

        {/* Terms & Conditions Checkbox - Only show during signup */}
        {!isLogin && (
          <View style={styles.termsContainer}>
            <TouchableOpacity style={styles.checkboxContainer} onPress={() => setAcceptedTerms(!acceptedTerms)}>
              <View
                style={[
                  styles.checkbox,
                  { borderColor: theme?.border || "#e0e0e0" },
                  acceptedTerms && { backgroundColor: "#0077b6", borderColor: "#0077b6" },
                ]}
              >
                {acceptedTerms && <Ionicons name="checkmark" size={16} color="#ffffff" />}
              </View>
              <Text style={[styles.termsText, { color: theme?.textSecondary || "#666666" }]}>
                I agree to the{" "}
                <Text
                  style={[styles.termsLink, { color: theme?.primary || "#0077b6" }]}
                  onPress={() => setShowTermsModal(true)}
                >
                  Terms & Conditions
                </Text>{" "}
                and{" "}
                <Text
                  style={[styles.termsLink, { color: theme?.primary || "#0077b6" }]}
                  onPress={() => setShowPrivacyModal(true)}
                >
                  Privacy Policy
                </Text>
              </Text>
            </TouchableOpacity>
          </View>
        )}

        <TouchableOpacity
          style={[styles.button, isLoading && styles.buttonDisabled]}
          onPress={handleAuth}
          disabled={isLoading}
        >
          <Text style={styles.buttonText}>{isLoading ? "Please wait..." : isLogin ? "Log In" : "Sign Up"}</Text>
        </TouchableOpacity>

        {/* Divider */}
        <View style={styles.dividerContainer}>
          <View style={[styles.divider, { backgroundColor: theme?.border || "#e0e0e0" }]} />
          <Text style={[styles.dividerText, { color: theme?.textTertiary || "#888" }]}>or</Text>
          <View style={[styles.divider, { backgroundColor: theme?.border || "#e0e0e0" }]} />
        </View>

        {/* Google Sign In Button */}
        <TouchableOpacity
          style={[
            styles.googleButton,
            {
              backgroundColor: theme?.surface || "#ffffff",
              borderColor: theme?.border || "#e0e0e0",
            },
            isLoading && styles.buttonDisabled,
          ]}
          onPress={handleGoogleSignIn}
          disabled={isLoading}
        >
          <Ionicons name="logo-google" size={20} color="#4285f4" style={styles.googleIcon} />
          <Text style={[styles.googleButtonText, { color: theme?.text || "#333333" }]}>
            {isLoading ? "Please wait..." : "Continue with Google"}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={toggleMode}>
          <Text style={[styles.toggleText, { color: theme?.primary || "#0077b6" }]}>
            {isLogin ? "Need an account? Sign Up" : "Already have an account? Log In"}
          </Text>
        </TouchableOpacity>

        {isLogin && (
          <TouchableOpacity onPress={handleForgotPassword} disabled={isLoading}>
            <Text
              style={[styles.forgotPasswordText, { color: theme?.primary || "#0077b6" }, isLoading && { opacity: 0.5 }]}
            >
              Forgot Password?
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Modals */}
      <TermsModal />
      <PrivacyModal />
    </View>
  )
}

export default SignupLogin

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#ffffff",
    position: "relative",
  },
  backgroundContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 0,
  },
  backgroundText: {
    position: "absolute",
    fontSize: 120,
    fontWeight: "bold",
    color: "rgba(0,0,0,0.02)",
    transform: [{ rotate: "-15deg" }],
  },
  malloyaText: {
    top: 100,
    left: -50,
  },
  tasksText: {
    top: 200,
    right: -30,
    fontSize: 100,
  },
  completeText: {
    top: 400,
    left: -80,
    fontSize: 90,
  },
  todoText: {
    bottom: 200,
    right: -40,
    fontSize: 110,
  },
  backgroundIcon1: {
    position: "absolute",
    top: 150,
    right: 50,
    transform: [{ rotate: "15deg" }],
  },
  backgroundIcon2: {
    position: "absolute",
    top: 350,
    left: 30,
    transform: [{ rotate: "-20deg" }],
  },
  backgroundIcon3: {
    position: "absolute",
    bottom: 300,
    left: 60,
    transform: [{ rotate: "25deg" }],
  },
  backgroundIcon4: {
    position: "absolute",
    bottom: 150,
    right: 40,
    transform: [{ rotate: "-10deg" }],
  },
  contentContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
    zIndex: 1,
  },
  logoContainer: {
    marginBottom: 30,
  },
  logoImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "#f0f8ff",
    justifyContent: "center",
    alignItems: "center",
    // borderWidth: 3,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    // elevation: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#333333",
    marginBottom: 30,
    textAlign: "center",
  },
  // Error Message Styles
  errorContainer: {
    flexDirection: "row",
    alignItems: "center",
    width: "100%",
    backgroundColor: "#ffebee",
    borderWidth: 1,
    borderColor: "#f44336",
    borderRadius: 8,
    padding: 12,
    marginBottom: 15,
  },
  errorIcon: {
    marginRight: 8,
  },
  errorText: {
    flex: 1,
    fontSize: 14,
    color: "#f44336",
    fontWeight: "500",
  },
  // Success Message Styles
  successContainer: {
    flexDirection: "row",
    alignItems: "center",
    width: "100%",
    backgroundColor: "#e8f5e8",
    borderWidth: 1,
    borderColor: "#4caf50",
    borderRadius: 8,
    padding: 12,
    marginBottom: 15,
  },
  successIcon: {
    marginRight: 8,
  },
  successText: {
    flex: 1,
    fontSize: 14,
    color: "#4caf50",
    fontWeight: "500",
  },
  input: {
    width: "100%",
    backgroundColor: "#f8f9fa",
    padding: 15,
    borderRadius: 12,
    fontSize: 16,
    color: "#333333",
    marginBottom: 15,
    borderWidth: 1,
    borderColor: "#e0e0e0",
  },
  passwordInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    width: "100%",
    marginBottom: 15,
    position: "relative",
  },
  passwordInput: {
    marginBottom: 0,
    paddingRight: 50,
  },
  passwordToggleIcon: {
    position: "absolute",
    right: 15,
    padding: 5,
  },
  termsContainer: {
    width: "100%",
    marginBottom: 20,
  },
  checkboxContainer: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  checkbox: {
    width: 20,
    height: 20,
    borderWidth: 2,
    borderRadius: 4,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
    marginTop: 2,
  },
  termsText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
  },
  termsLink: {
    textDecorationLine: "underline",
    fontWeight: "500",
  },
  button: {
    width: "100%",
    backgroundColor: "#0077b6",
    padding: 18,
    borderRadius: 12,
    alignItems: "center",
    marginBottom: 20,
    shadowColor: "#0077b6",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
  },
  dividerContainer: {
    flexDirection: "row",
    alignItems: "center",
    width: "100%",
    marginBottom: 20,
  },
  divider: {
    flex: 1,
    height: 1,
    backgroundColor: "#e0e0e0",
  },
  dividerText: {
    marginHorizontal: 15,
    color: "#888",
    fontSize: 14,
  },
  googleButton: {
    width: "100%",
    backgroundColor: "#ffffff",
    padding: 18,
    borderRadius: 12,
    alignItems: "center",
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#e0e0e0",
    flexDirection: "row",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  googleIcon: {
    marginRight: 10,
  },
  googleButtonText: {
    color: "#333333",
    fontSize: 16,
    fontWeight: "600",
  },
  toggleText: {
    color: "#0077b6",
    fontSize: 16,
    marginBottom: 10,
    textAlign: "center",
  },
  forgotPasswordText: {
    color: "#0077b6",
    fontSize: 14,
    textAlign: "center",
    textDecorationLine: "underline",
  },
  // Modal Styles
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  modalCloseButton: {
    padding: 8,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "600",
  },
  placeholder: {
    width: 40,
  },
  modalScrollView: {
    flex: 1,
  },
  modalContent: {
    padding: 20,
  },
  lastUpdated: {
    fontSize: 14,
    marginBottom: 20,
    fontStyle: "italic",
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginTop: 20,
    marginBottom: 10,
  },
  paragraph: {
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 15,
  },
  bulletPoint: {
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 8,
    marginLeft: 10,
  },
  contactInfo: {
    fontSize: 16,
    fontWeight: "500",
    marginTop: 5,
  },
  bottomSpacing: {
    height: 30,
  },
})
