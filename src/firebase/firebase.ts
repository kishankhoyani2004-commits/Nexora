import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBwJ7crtFcC9RENC5249dufKKDPU__fyBw",
  authDomain: "nexora-fa2ac.firebaseapp.com",
  projectId: "nexora-fa2ac",
  storageBucket: "nexora-fa2ac.firebasestorage.app",
  messagingSenderId: "80792902439",
  appId: "1:80792902439:web:2d56205976b448ac2fe702",
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);

export default app;
