'use client';

import { useMemo, useState } from "react";
import { signIn, signOutUser, signUp } from "@/lib/firebaseAuth";
import { useAuth } from "@/app/providers";
import { getFirebaseConfigStatus } from "@/lib/firebaseClient";

export default function LoginPage() {
  const { user, hasLoaded } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isWorking, setIsWorking] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const configStatus = getFirebaseConfigStatus();
  const isConfigured = configStatus.enabled && configStatus.missing.length === 0;

  const statusText = useMemo(() => {
    if (!hasLoaded) return "Checking sign-in state...";
    if (!user) return "Signed out";
    return `Signed in as ${user.email ?? user.uid}`;
  }, [hasLoaded, user]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setSuccess(null);
    setIsWorking(true);
    try {
      if (isSignUp) {
        await signUp(email.trim(), password);
        setSuccess("Account created! You are now signed in.");
        setPassword("");
      } else {
        await signIn(email.trim(), password);
        setPassword("");
      }
    } catch (caught) {
      console.error(caught);
      const message = (caught as { code?: string })?.code;
      if (message === "auth/email-already-in-use") {
        setError("This email is already registered. Sign in instead.");
      } else if (message === "auth/weak-password") {
        setError("Use a longer password (at least 6 characters).");
      } else if (message === "auth/invalid-email") {
        setError("Please enter a valid email address.");
      } else {
        setError(
          isConfigured
            ? isSignUp
              ? "Sign-up failed. Try a different email or a longer password (6+ characters)."
              : "Sign-in failed. Double-check the email/password and that Firebase Auth (Email/Password) is enabled in your Firebase project."
            : "Firebase is not configured. Add Firebase env vars in spacey-science/.env.local, restart npm run dev, then try again.",
        );
      }
    } finally {
      setIsWorking(false);
    }
  };

  const handleSignOut = async () => {
    setIsWorking(true);
    setError(null);
    try {
      await signOutUser();
    } finally {
      setIsWorking(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-slate-50">
      <main className="mx-auto flex min-h-screen max-w-xl flex-col gap-6 px-4 py-8 sm:px-6 sm:py-12">
        <header className="space-y-2 rounded-2xl border border-slate-800/70 bg-slate-900/70 px-5 py-4 shadow-lg shadow-slate-950/70 backdrop-blur sm:px-6">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
            Sign in
          </p>
          <h1 className="text-xl font-semibold tracking-tight text-slate-50 sm:text-2xl">
            Spacey Science Access
          </h1>
          <p className="text-sm text-slate-400">
            Students can create their own account (Sign up) or sign in. Teachers
            sign in to view the class dashboard. No need to add users in Firebase
            first.
          </p>
        </header>

        <section className="space-y-3 rounded-2xl border border-slate-800/70 bg-slate-950/90 p-5 shadow-xl shadow-slate-950/80 sm:p-6">
          {!isConfigured && (
            <div className="rounded-xl border border-rose-400/40 bg-rose-500/10 p-3 text-sm text-rose-100">
              <p className="font-semibold">Firebase is not configured.</p>
              <p className="mt-1 text-rose-100/80">
                Create <code>spacey-science/.env.local</code> (not the repo root) and
                set:
              </p>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-rose-100/80">
                <li>
                  <code>NEXT_PUBLIC_SPACEY_FIREBASE_ENABLED=true</code>
                </li>
                <li>
                  <code>NEXT_PUBLIC_SPACEY_FIREBASE_PROJECT_ID</code>
                </li>
                <li>
                  <code>NEXT_PUBLIC_SPACEY_FIREBASE_API_KEY</code>
                </li>
                <li>
                  <code>NEXT_PUBLIC_SPACEY_FIREBASE_AUTH_DOMAIN</code>
                </li>
                <li>
                  <code>NEXT_PUBLIC_SPACEY_FIREBASE_APP_ID</code>
                </li>
              </ul>
              {configStatus.enabled && configStatus.missing.length > 0 && (
                <p className="mt-2 text-rose-100/80">
                  Missing: {configStatus.missing.join(", ")}
                </p>
              )}
              <p className="mt-2 text-rose-100/80">
                Then restart <code>npm run dev</code>.
              </p>
            </div>
          )}

          <p className="text-sm text-slate-200">
            <span className="font-semibold text-slate-100">Status:</span>{" "}
            {statusText}
          </p>

          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="space-y-1">
              <label className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                Email
              </label>
              <input
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="student@example.com"
                className="h-9 w-full rounded-xl border border-slate-700/80 bg-slate-950/80 px-3 text-sm text-slate-100 outline-none placeholder:text-slate-500 focus:border-sky-400 focus:ring-1 focus:ring-sky-400"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="••••••••"
                className="h-9 w-full rounded-xl border border-slate-700/80 bg-slate-950/80 px-3 text-sm text-slate-100 outline-none placeholder:text-slate-500 focus:border-sky-400 focus:ring-1 focus:ring-sky-400"
              />
            </div>

            <div className="flex flex-wrap items-center gap-3 pt-1">
              <button
                type="submit"
                disabled={isWorking || !email.trim() || !password || (isSignUp && password.length < 6)}
                className="inline-flex h-9 items-center justify-center rounded-full bg-sky-400 px-4 text-sm font-semibold text-slate-950 shadow-sm shadow-sky-900/60 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSignUp ? "Sign up" : "Sign in"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsSignUp(!isSignUp);
                  setError(null);
                  setSuccess(null);
                }}
                className="inline-flex h-9 items-center justify-center rounded-full border border-slate-600/80 bg-slate-900/60 px-4 text-sm font-semibold text-slate-200 transition hover:bg-slate-800"
              >
                {isSignUp ? "Already have an account? Sign in" : "New student? Sign up"}
              </button>
              <button
                type="button"
                onClick={handleSignOut}
                disabled={isWorking || !user}
                className="inline-flex h-9 items-center justify-center rounded-full border border-slate-700/80 bg-slate-950/80 px-4 text-sm font-semibold text-slate-200 shadow-sm shadow-slate-950/80 transition hover:border-slate-500 hover:bg-slate-900 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Sign out
              </button>

              <a
                href="/"
                className="text-sm font-semibold text-sky-200 hover:text-sky-100"
              >
                Back to lesson
              </a>
              <a
                href="/teacher"
                className="text-sm font-semibold text-sky-200 hover:text-sky-100"
              >
                Go to teacher dashboard
              </a>
            </div>

            {isSignUp && password.length > 0 && password.length < 6 && (
              <p className="text-xs text-amber-300">Password must be at least 6 characters</p>
            )}
            {error && <p className="text-sm text-rose-300">{error}</p>}
            {success && <p className="text-sm text-emerald-300">{success}</p>}
          </form>
        </section>
      </main>
    </div>
  );
}

