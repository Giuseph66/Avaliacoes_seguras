
import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyDQgBbxV3AhW5UfxLnW_HKdiVEBOJmMj9A",
  authDomain: "provas-bcbb8.firebaseapp.com",
  projectId: "provas-bcbb8",
  storageBucket: "provas-bcbb8.firebasestorage.app",
  databaseURL: "https://provas-bcbb8-default-rtdb.firebaseio.com",
  messagingSenderId: "438987644267",
  appId: "1:438987644267:web:dbac47d4501ff6e000802e",
  measurementId: "G-DXBKVF0J8J"
  };

const app = initializeApp(firebaseConfig);

export const firestore = getFirestore(app);
