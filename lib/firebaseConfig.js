// firebaseConfig.js
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

// Your Firebase configuration from the JSON
const firebaseConfig = {
  apiKey: "AIzaSyAsQ7r5LXNR1MZ2XJM0_1RCcLxOSnDgUJM",
  authDomain: "aora-native-app-f65c6.firebaseapp.com",
  projectId: "aora-native-app-f65c6",
  storageBucket: "aora-native-app-f65c6.appspot.com",
  messagingSenderId: "921060383149",
  appId: "1:921060383149:android:ba6ce915a6ad3f446fe924",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

export { db };