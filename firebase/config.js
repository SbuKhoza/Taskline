import { initializeApp, getApps, getApp } from "firebase/app"
import { getFirestore } from "firebase/firestore"
import {
  getAuth,
  initializeAuth,
  getReactNativePersistence,
} from "firebase/auth"
import AsyncStorage from "@react-native-async-storage/async-storage"

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDNzAK-oG8Ir0uV4PJFmM0LmhZvqU5qQ_o",
  authDomain: "audio-recorder-f75c4.firebaseapp.com",
  projectId: "audio-recorder-f75c4",
  storageBucket: "audio-recorder-f75c4.firebasestorage.app",
  messagingSenderId: "817376701682",
  appId: "1:817376701682:web:d3bb3ad9be83084585746b",
  measurementId: "G-HPVSDQTZ99",
}

// Initialize Firebase app (only once)
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp()

// Initialize Auth with persistent session using AsyncStorage
const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(AsyncStorage),
})

// Export initialized services
export const db = getFirestore(app)
export { auth }
