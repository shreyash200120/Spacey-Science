// This file sketches a Firestore-backed implementation for the progress API.
// The live app uses localStorage by default (see progress.ts) so it works
// without any external services. If you flip the NEXT_PUBLIC_SPACEY_FIREBASE_ENABLED
// flag and provide valid Firebase config in .env, you can replace the calls in
// page.tsx with these helpers to persist to Firestore instead.

import type { LessonProgress } from "./progress";
import { getFirestoreDb } from "./firebaseClient";
import {
  collection,
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
  type DocumentData,
} from "firebase/firestore";

export type FirestoreLessonProgress = LessonProgress & {
  id: string;
  studentEmail?: string;
};

const COLLECTION_NAME = "lessonProgress";

function mapDocToLessonProgress(
  documentId: string,
  data: DocumentData,
): FirestoreLessonProgress | null {
  if (!data) return null;
  if (typeof data.studentId !== "string" || typeof data.lessonId !== "string") {
    return null;
  }

  return {
    id: documentId,
    studentId: data.studentId,
    lessonId: data.lessonId,
    currentStep: (data.currentStep ?? 1) as LessonProgress["currentStep"],
    completed: !!data.completed,
    score: Number.isFinite(data.score) ? data.score : 0,
    badge: data.badge ?? undefined,
    completedAt: data.completedAt ?? undefined,
  };
}

export async function loadRemoteProgress(
  studentId: string,
  lessonId: string,
): Promise<LessonProgress | null> {
  const db = getFirestoreDb();
  if (!db) return null;

  const documentId = `${studentId}_${lessonId}`;
  const ref = doc(collection(db, COLLECTION_NAME), documentId);
  const snapshot = await getDoc(ref);

  if (!snapshot.exists()) return null;

  const mapped = mapDocToLessonProgress(snapshot.id, snapshot.data());
  return mapped ?? null;
}

export async function persistRemoteProgress(
  snapshot: LessonProgress,
  meta?: { studentEmail?: string },
): Promise<FirestoreLessonProgress | null> {
  const db = getFirestoreDb();
  if (!db) return null;

  const documentId = `${snapshot.studentId}_${snapshot.lessonId}`;
  const ref = doc(collection(db, COLLECTION_NAME), documentId);

  const payload: DocumentData = {
    ...snapshot,
    ...(meta?.studentEmail ? { studentEmail: meta.studentEmail } : {}),
    updatedAt: serverTimestamp(),
  };

  await setDoc(ref, payload, { merge: true });

  const stored: FirestoreLessonProgress = {
    id: documentId,
    ...snapshot,
    ...(meta?.studentEmail ? { studentEmail: meta.studentEmail } : {}),
  };

  return stored;
}

