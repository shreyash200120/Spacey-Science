# Spacey Science – Gravity Mission

Submission for the Spacey Science Technical Challenge. A small lesson where students learn about gravity across different worlds, with progress saved to Firestore and an optional AI tutor.

**Happy path:** Student does the 3-step lesson (Intro → Gravity slider → Quiz), gets a badge and score, and progress persists after refresh. Works with or without Firebase; with Firebase, teachers can see progress on `/teacher`.

---

## Path choice

I went with **Path 1 (Interactive Journey)** as the main focus and added **Path 2 (AI Tutor)** and **Path 3 (Teacher dashboard + Firestore)** so the submission hits the mandatory “progress in database” requirement and shows the full flow.

- **Path 1:** 3-step flow, gravity slider + jump animation (Framer Motion), responsive layout, semantic HTML and keyboard support.
- **Path 2:** “Ask Spacey” panel, OpenAI with JSON output, conversation context, RAG via `lessonFacts.ts`, and actions that move the lesson step or focus a planet.
- **Path 3:** Login/sign-up at `/login`, teacher view at `/teacher` reading from Firestore in real time, and Firestore rules so only signed-in users read/write (rules in repo; you can tighten to owner/teacher if you prefer).

---

## How to run

**Requirements:** Node 18+, npm.

```bash
cd spacey-science
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). You can do the lesson without any config; progress is stored in `localStorage`.

**Optional – Firebase + teacher dashboard:**  
Copy `.env.example` to `.env.local` and set the Firebase vars (project ID, API key, auth domain, app ID). In the Firebase Console: enable Email/Password auth, create a Firestore database, and paste the contents of `firestore.rules` into Firestore → Rules and publish. Students can sign up on `/login`; no need to create users in the console. Teacher view is at `/teacher` (sign in with any account to see progress when using the current permissive rules).

**Optional – OpenAI tutor:**  
Set `OPENAI_API_KEY` and optionally `OPENAI_MODEL` in `.env.local`. Without them, the tutor uses built-in answers.

---

## Trade-offs

- **Database:** Progress is in `localStorage` by default so the app runs without setup. With Firebase configured and the user signed in, progress is also written to Firestore so the teacher dashboard works.
- **Scope:** One lesson, one mission. I preferred making this flow solid over adding more lessons.
- **Firestore rules:** The repo includes simple rules (e.g. “signed-in only”); you can replace them with stricter owner/teacher rules from an earlier version if you want to demo RBAC.

---

## Tech stack

Next.js 16 (App Router), React, TypeScript, Tailwind CSS, Framer Motion. Backend: Next.js API route for the tutor. Database: Firestore when configured; otherwise `localStorage`. Auth: Firebase Auth (Email/Password) for login/sign-up.

---

## Repo structure (main pieces)

- `src/app/page.tsx` – Student lesson (3 steps, slider, quiz, badge, progress).
- `src/app/login/page.tsx` – Sign in / sign up.
- `src/app/teacher/page.tsx` – Teacher dashboard (Firestore `lessonProgress`).
- `src/app/api/tutor/route.ts` – Tutor API (OpenAI + RAG, JSON response).
- `src/lib/progress.ts` – Local progress (localStorage).
- `src/lib/remoteProgress.ts` – Firestore read/write for progress.
- `src/lib/lessonFacts.ts` – Facts used for tutor RAG.
- `firestore.rules` – Rules for `lessonProgress` (paste into Firebase Console).

No secrets are committed; use `.env.local` and `.env.example` as reference.
