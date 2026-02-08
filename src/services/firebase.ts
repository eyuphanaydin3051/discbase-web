// src/services/firebase.ts
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getStorage } from "firebase/storage";

// Firebase Konsolundan aldığın "firebaseConfig" nesnesini buraya yapıştır:
const firebaseConfig = {
    apiKey: "AIzaSyD9qud9v1F_Zgk2RzjoS4wbv_X2TWCL4bY",
    authDomain: "ultimate-stats-a2c89.firebaseapp.com",
    projectId: "ultimate-stats-a2c89",
    storageBucket: "ultimate-stats-a2c89.firebasestorage.app",
    messagingSenderId: "860197339001",
    appId: "1:860197339001:web:a81bc12238af6ca3f679a8",
    measurementId: "G-63EY01Q4TL"
};

// Uygulamayı başlat
const app = initializeApp(firebaseConfig);

// Servisleri dışarıya aç
export const db = getFirestore(app);
export const auth = getAuth(app);
export const storage = getStorage(app);
export const googleProvider = new GoogleAuthProvider();