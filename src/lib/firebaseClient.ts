import { initializeApp, getApps, type FirebaseApp } from "firebase/app";
import {
  getFirestore,
  type Firestore,
} from "firebase/firestore";

let app: FirebaseApp | null = null;
let db: Firestore | null = null;

export type FirebaseConfigStatus = {
  enabled: boolean;
  missing: string[];
};

export function getFirebaseConfigStatus(): FirebaseConfigStatus {
  const enabled = process.env.NEXT_PUBLIC_SPACEY_FIREBASE_ENABLED === "true";
  const missing: string[] = [];

  if (!process.env.NEXT_PUBLIC_SPACEY_FIREBASE_PROJECT_ID) {
    missing.push("NEXT_PUBLIC_SPACEY_FIREBASE_PROJECT_ID");
  }
  if (!process.env.NEXT_PUBLIC_SPACEY_FIREBASE_API_KEY) {
    missing.push("NEXT_PUBLIC_SPACEY_FIREBASE_API_KEY");
  }
  if (!process.env.NEXT_PUBLIC_SPACEY_FIREBASE_AUTH_DOMAIN) {
    missing.push("NEXT_PUBLIC_SPACEY_FIREBASE_AUTH_DOMAIN");
  }
  if (!process.env.NEXT_PUBLIC_SPACEY_FIREBASE_APP_ID) {
    missing.push("NEXT_PUBLIC_SPACEY_FIREBASE_APP_ID");
  }

  return { enabled, missing };
}

function hasRequiredFirebaseEnv() {
  const status = getFirebaseConfigStatus();
  return (
    status.enabled &&
    status.missing.length === 0
  );
}

export function getFirebaseApp(): FirebaseApp | null {
  if (!hasRequiredFirebaseEnv()) return null;
  if (typeof window === "undefined") return null;
  if (app) return app;

  const existing = getApps()[0];
  if (existing) {
    app = existing;
    return app;
  }

  app = initializeApp({
    apiKey: process.env.NEXT_PUBLIC_SPACEY_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_SPACEY_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_SPACEY_FIREBASE_PROJECT_ID,
    appId: process.env.NEXT_PUBLIC_SPACEY_FIREBASE_APP_ID,
  });

  return app;
}

export function getFirestoreDb(): Firestore | null {
  if (!hasRequiredFirebaseEnv()) return null;
  if (typeof window === "undefined") return null;
  if (db) return db;

  const appInstance = getFirebaseApp();
  if (!appInstance) return null;

  db = getFirestore(appInstance);
  return db;
}

