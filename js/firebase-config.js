import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js"; 

// Your web app's Firebase configuration (CORRIGIDO )
const firebaseConfig = {
  apiKey: "AIzaSyD-2u7doOdw0_Pk7NSFqZ8pF1QXDJ1N2_Q",
  authDomain: "fantasiaeterna0.firebaseapp.com",
  projectId: "fantasiaeterna0",
  storageBucket: "fantasiaeterna0.firebasestorage.app",
  messagingSenderId: "646270648566",
  appId: "1:646270648566:web:f485effd958833b0726cd7"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);