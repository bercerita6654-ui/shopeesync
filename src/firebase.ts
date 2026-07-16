import { initializeApp } from 'firebase/app';
import { initializeFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyB00NLpil98xmUbL0c7jYwF5_r52f0frlU",
  authDomain: "database-online-750f1.firebaseapp.com",
  projectId: "database-online-750f1",
  storageBucket: "database-online-750f1.firebasestorage.app",
  messagingSenderId: "582127839876",
  appId: "1:582127839876:web:f6adf5d49e472a07af30d1"
};

const app = initializeApp(firebaseConfig);

// Initialize Firestore with the specific custom database ID provisioned by AI Studio
export const db = initializeFirestore(app, {}, "ai-studio-updatedatashopee-6a862ffc-f666-402f-a72b-4d31388e1eec");

export const auth = getAuth(app);
