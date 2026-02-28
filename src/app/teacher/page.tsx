'use client';

import { useEffect, useState } from "react";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { getFirebaseConfigStatus, getFirestoreDb } from "@/lib/firebaseClient";
import type { FirestoreLessonProgress } from "@/lib/remoteProgress";
import { useAuth } from "@/app/providers";

const LESSON_ID = "gravity-mission-1";

type TeacherViewLessonProgress = FirestoreLessonProgress & {
  updatedAt?: string;
};

export default function TeacherDashboardPage() {
  const { user, hasLoaded } = useAuth();
  const [items, setItems] = useState<TeacherViewLessonProgress[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [firestoreError, setFirestoreError] = useState<string | null>(null);

  useEffect(() => {
    if (!hasLoaded) return;
    const db = getFirestoreDb();
    if (!db) {
      setIsConnected(false);
      setFirestoreError(null);
      return;
    }

    const lessonProgressRef = collection(db, "lessonProgress");
    const lessonQuery = query(lessonProgressRef, where("lessonId", "==", LESSON_ID));

    const unsubscribe = onSnapshot(
      lessonQuery,
      (snapshot) => {
        setIsConnected(true);
        setFirestoreError(null);
        const next: TeacherViewLessonProgress[] = [];
        snapshot.forEach((document) => {
          const data = document.data() as FirestoreLessonProgress & {
            updatedAt?: { toDate?: () => Date };
          };

          let updatedAt: string | undefined;
          if (data.updatedAt && typeof data.updatedAt.toDate === "function") {
            updatedAt = data.updatedAt.toDate().toISOString();
          }

          next.push({
            ...data,
            id: document.id,
            updatedAt,
          });
        });

        next.sort((a, b) => (b.updatedAt ?? "").localeCompare(a.updatedAt ?? ""));
        setItems(next);
      },
      (error) => {
        console.error("Firestore snapshot error:", error);
        setIsConnected(false);
        setItems([]);
        setFirestoreError(error.message || "Firestore permission error");
      },
    );

    return () => {
      unsubscribe();
    };
  }, [hasLoaded]);

  const configStatus = getFirebaseConfigStatus();
  const isConfigured = configStatus.enabled && configStatus.missing.length === 0;

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-slate-50">
      <main className="mx-auto flex min-h-screen max-w-6xl flex-col gap-6 px-4 py-6 sm:px-6 sm:py-10 lg:px-10">
        <header className="flex flex-col gap-3 rounded-2xl border border-slate-800/70 bg-slate-900/70 px-5 py-4 shadow-lg shadow-slate-950/70 backdrop-blur sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
              Teacher view
            </p>
            <h1 className="mt-1 text-xl font-semibold tracking-tight text-slate-50 sm:text-2xl">
              Gravity Mission – Class Progress
            </h1>
            <p className="mt-1 max-w-2xl text-xs text-slate-400 sm:text-[0.82rem]">
              Monitor how your cadets are progressing through the “Gravity on Different
              Worlds” mission. This dashboard reads from the shared{" "}
              <span className="font-semibold text-sky-200">lessonProgress</span>{" "}
              collection in Firestore.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 text-[0.75rem] ${
                isConnected
                  ? "border-emerald-400/60 bg-emerald-500/10 text-emerald-200"
                  : isConfigured
                    ? "border-amber-400/60 bg-amber-500/10 text-amber-100"
                    : "border-rose-400/60 bg-rose-500/10 text-rose-100"
              }`}
            >
              <span className="h-1.5 w-1.5 rounded-full bg-current" />
              {isConnected
                ? "Live data from Firestore"
                : isConfigured
                  ? "Firestore configured (check permissions)"
                  : "Firestore not configured"}
            </span>
            <a
              href="/login"
              className="inline-flex items-center justify-center rounded-full border border-slate-700/80 bg-slate-950/80 px-3 py-1 text-[0.75rem] font-medium text-slate-200 shadow-sm shadow-slate-950/80 transition hover:border-slate-500 hover:bg-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
            >
              {user ? "Account" : "Sign in"}
            </a>
            <a
              href="/"
              className="inline-flex items-center justify-center rounded-full border border-slate-700/80 bg-slate-950/80 px-3 py-1 text-[0.75rem] font-medium text-slate-200 shadow-sm shadow-slate-950/80 transition hover:border-slate-500 hover:bg-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
            >
              Back to student lesson
            </a>
          </div>
        </header>

        <section className="flex-1 rounded-2xl border border-slate-800/70 bg-slate-950/90 p-4 shadow-xl shadow-slate-950/80 sm:p-5">
          {!isConfigured && (
            <div className="mb-4 rounded-xl border border-rose-400/40 bg-rose-500/10 p-3 text-sm text-rose-100">
              <p className="font-semibold">Firestore is not configured.</p>
              <p className="mt-1 text-rose-100/80">
                Add Firebase env vars in <code>.env.local</code> inside{" "}
                <code>spacey-science</code>, then restart <code>npm run dev</code>.
              </p>
              {configStatus.enabled && configStatus.missing.length > 0 && (
                <p className="mt-2 text-rose-100/80">
                  Missing: {configStatus.missing.join(", ")}
                </p>
              )}
            </div>
          )}

          {isConfigured && !user && (
            <div className="mb-4 rounded-xl border border-amber-400/40 bg-amber-500/10 p-3 text-sm text-amber-100">
              <p className="font-semibold">You’re not signed in.</p>
              <p className="mt-1 text-amber-100/80">
                Sign in at <code>/login</code> using a Firebase Auth account. With the
                provided security rules, unauthenticated users cannot read student
                progress.
              </p>
            </div>
          )}

          {firestoreError && (
            <div className="mb-4 rounded-xl border border-amber-400/40 bg-amber-500/10 p-3 text-sm text-amber-100">
              <p className="font-semibold">Firestore error</p>
              <p className="mt-1 text-amber-100/80">{firestoreError}</p>
            </div>
          )}

          {items.length === 0 ? (
            <p className="text-sm text-slate-400">
              No lesson progress has been recorded yet for this mission. When students
              complete the gravity mission, their scores will appear here in real time.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full border-collapse text-xs sm:text-[0.8rem]">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-900/80 text-left text-[0.7rem] uppercase tracking-[0.17em] text-slate-400">
                    <th className="px-3 py-2 font-medium">Student</th>
                    <th className="px-3 py-2 font-medium">Lesson</th>
                    <th className="px-3 py-2 font-medium">Status</th>
                    <th className="px-3 py-2 font-medium">Score</th>
                    <th className="px-3 py-2 font-medium">Badge</th>
                    <th className="px-3 py-2 font-medium">Last updated</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => (
                    <tr
                      key={item.id}
                      className="border-b border-slate-800/70 last:border-b-0 odd:bg-slate-950/60 even:bg-slate-900/40"
                    >
                      <td className="px-3 py-2 text-slate-100">
                        {item.studentEmail ?? item.studentId}
                      </td>
                      <td className="px-3 py-2 text-slate-200">{item.lessonId}</td>
                      <td className="px-3 py-2">
                        <span
                          className={`inline-flex rounded-full px-2 py-0.5 text-[0.7rem] font-medium ${
                            item.completed
                              ? "bg-emerald-500/15 text-emerald-200"
                              : "bg-slate-700/40 text-slate-200"
                          }`}
                        >
                          {item.completed ? "Completed" : "In progress"}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-sky-200">{item.score}</td>
                      <td className="px-3 py-2 text-emerald-200">
                        {item.badge ?? "—"}
                      </td>
                      <td className="px-3 py-2 text-slate-300">
                        {item.updatedAt
                          ? new Date(item.updatedAt).toLocaleString()
                          : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

