import { getFirebaseApp } from "./firebaseClient";
import {
  browserLocalPersistence,
  createUserWithEmailAndPassword,
  getAuth,
  onAuthStateChanged,
  setPersistence,
  signInWithEmailAndPassword,
  signOut,
  type Auth,
  type User,
} from "firebase/auth";

let auth: Auth | null = null;

export function getFirebaseAuth(): Auth | null {
  if (typeof window === "undefined") return null;
  const app = getFirebaseApp();
  if (!app) return null;
  if (auth) return auth;
  auth = getAuth(app);
  void setPersistence(auth, browserLocalPersistence);
  return auth;
}

export function subscribeToAuth(callback: (user: User | null) => void) {
  const instance = getFirebaseAuth();
  if (!instance) {
    callback(null);
    return () => {};
  }
  return onAuthStateChanged(instance, callback);
}

export async function signIn(email: string, password: string) {
  const instance = getFirebaseAuth();
  if (!instance) throw new Error("Firebase auth not configured");
  return await signInWithEmailAndPassword(instance, email, password);
}

export async function signUp(email: string, password: string) {
  const instance = getFirebaseAuth();
  if (!instance) throw new Error("Firebase auth not configured");
  return await createUserWithEmailAndPassword(instance, email, password);
}

export async function signOutUser() {
  const instance = getFirebaseAuth();
  if (!instance) return;
  await signOut(instance);
}

