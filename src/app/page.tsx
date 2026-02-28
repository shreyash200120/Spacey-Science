'use client';

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import type { LessonProgress, LessonStep } from "@/lib/progress";
import { clearProgress, loadProgress, persistProgress } from "@/lib/progress";
import { getFirebaseConfigStatus } from "@/lib/firebaseClient";
import { signOutUser } from "@/lib/firebaseAuth";
import { loadRemoteProgress, persistRemoteProgress } from "@/lib/remoteProgress";
import { useAuth } from "@/app/providers";

const STUDENT_ID = "cadet-nova";
const LESSON_ID = "gravity-mission-1";

type LessonStepConfig = {
  id: LessonStep;
  label: string;
  title: string;
};

const STEPS: LessonStepConfig[] = [
  { id: 1, label: "Intro", title: "Welcome to the Gravity Mission" },
  { id: 2, label: "Play", title: "Feel Gravity on Different Worlds" },
  { id: 3, label: "Quiz", title: "Prove Your Gravity Skills" },
];

type Planet = {
  id: string;
  name: string;
  gravityMultiplier: number;
  position: number;
  description: string;
};

const PLANETS: Planet[] = [
  {
    id: "moon",
    name: "Luna",
    gravityMultiplier: 0.17,
    position: 1,
    description: "Barely any pull – you could leap like a superhero.",
  },
  {
    id: "mars",
    name: "Mars",
    gravityMultiplier: 0.38,
    position: 2,
    description: "A light bounce in every step on the red sands.",
  },
  {
    id: "earth",
    name: "Earth",
    gravityMultiplier: 1,
    position: 3,
    description: "Your home turf – the gravity you know best.",
  },
  {
    id: "neptune",
    name: "Neptune",
    gravityMultiplier: 1.14,
    position: 4,
    description: "Heavy boots and slow strides in the blue depths.",
  },
  {
    id: "jupiter",
    name: "Jupiter",
    gravityMultiplier: 2.53,
    position: 5,
    description: "Crushing gravity – even lifting an arm is hard work.",
  },
];

type QuizOption = {
  id: string;
  label: string;
  text: string;
  correct: boolean;
};

const QUIZ_OPTIONS: QuizOption[] = [
  {
    id: "moon",
    label: "A",
    text: "The Moon, because its gravity is the weakest.",
    correct: true,
  },
  {
    id: "earth",
    label: "B",
    text: "Earth, because you are used to it.",
    correct: false,
  },
  {
    id: "jupiter",
    label: "C",
    text: "Jupiter, because bigger planets always make you jump higher.",
    correct: false,
  },
];

type QuizState = {
  selectedId: string | null;
  checked: boolean;
  isCorrect: boolean | null;
};

const initialQuizState: QuizState = {
  selectedId: null,
  checked: false,
  isCorrect: null,
};

type RewardState = {
  badgeLabel: string;
  score: number;
};

function computeReward(isCorrect: boolean): RewardState {
  if (isCorrect) {
    return {
      badgeLabel: "Gravity Guru",
      score: 100,
    };
  }
  return {
    badgeLabel: "Curious Cadet",
    score: 60,
  };
}

export default function Home() {
  const { user } = useAuth();
  const effectiveStudentId = user?.uid ?? STUDENT_ID;
  const [currentStep, setCurrentStep] = useState<LessonStep>(1);
  const [planetPosition, setPlanetPosition] = useState<number>(3);
  const [quizState, setQuizState] = useState<QuizState>(initialQuizState);
  const [progress, setProgress] = useState<LessonProgress | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);

  const activePlanet = useMemo(
    () =>
      PLANETS.find((p) => p.position === planetPosition) ??
      PLANETS.find((p) => p.id === "earth")!,
    [planetPosition],
  );

  useEffect(() => {
    const stored = loadProgress(effectiveStudentId, LESSON_ID);
    if (stored) {
      setProgress(stored);
      setCurrentStep(stored.currentStep);
    }

    loadRemoteProgress(effectiveStudentId, LESSON_ID)
      .then((remote) => {
        if (remote) {
          setProgress(remote);
          setCurrentStep(remote.currentStep);
        }
      })
      .catch(() => {})
      .finally(() => {
        setHasLoaded(true);
      });
  }, [effectiveStudentId]);

  const handleReset = () => {
    clearProgress(effectiveStudentId, LESSON_ID);
    setProgress(null);
    setCurrentStep(1);
    setPlanetPosition(3);
    setQuizState(initialQuizState);
  };

  const handleSignOut = async () => {
    await signOutUser();
  };

  const handleNext = () => {
    setCurrentStep((prev) => (prev < 3 ? ((prev + 1) as LessonStep) : prev));
  };

  const handlePrevious = () => {
    setCurrentStep((prev) => (prev > 1 ? ((prev - 1) as LessonStep) : prev));
  };

  const handleSelectQuizOption = (id: string) => {
    setQuizState({
      selectedId: id,
      checked: false,
      isCorrect: null,
    });
  };

  const handleCheckAnswer = () => {
    if (!quizState.selectedId) return;
    const selectedOption = QUIZ_OPTIONS.find(
      (option) => option.id === quizState.selectedId,
    );
    const isCorrect = selectedOption?.correct ?? false;
    setQuizState((prev) => ({
      ...prev,
      checked: true,
      isCorrect,
    }));
  };

  const handleCompleteLesson = async () => {
    if (!quizState.checked || quizState.isCorrect === null) return;
    setIsSaving(true);
    try {
      const reward = computeReward(quizState.isCorrect);
      const snapshot: LessonProgress = {
        studentId: effectiveStudentId,
        lessonId: LESSON_ID,
        currentStep: 3,
        completed: true,
        score: reward.score,
        badge: reward.badgeLabel,
        completedAt: new Date().toISOString(),
      };

      const storedLocal = persistProgress(snapshot);
      setProgress(storedLocal);
      if (user) {
        persistRemoteProgress(snapshot, { studentEmail: user.email ?? undefined }).catch(
          (err) => console.warn("Firestore save failed:", err?.message ?? err),
        );
      }
    } finally {
      setIsSaving(false);
    }
  };

  useEffect(() => {
    if (!hasLoaded) return;
    if (progress?.completed) return;

    const snapshot: LessonProgress = {
      studentId: effectiveStudentId,
      lessonId: LESSON_ID,
      currentStep,
      completed: false,
      score: progress?.score ?? 0,
      badge: progress?.badge,
      completedAt: progress?.completedAt,
    };

    persistProgress(snapshot);
    if (user) {
      persistRemoteProgress(snapshot, { studentEmail: user.email ?? undefined }).catch(
        (err) => console.warn("Firestore save failed:", err?.message ?? err),
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentStep, effectiveStudentId, hasLoaded]);

  const canComplete =
    currentStep === 3 && quizState.checked && quizState.isCorrect !== null;

  const hasReward = progress?.completed && !!progress?.badge;

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-slate-50">
      <main className="mx-auto flex min-h-screen max-w-5xl flex-col gap-6 px-4 py-6 sm:px-6 sm:py-10 lg:px-10">
        <header className="flex flex-col items-start justify-between gap-4 rounded-2xl border border-slate-800/60 bg-slate-900/60 px-5 py-4 shadow-lg shadow-slate-950/60 backdrop-blur md:flex-row md:items-center md:px-7">
          <div className="flex items-center gap-4">
            <div className="flex h-11 w-11 items-center justify-center rounded-full border border-slate-600/80 bg-gradient-to-br from-indigo-500 via-sky-400 to-emerald-400 text-lg font-semibold shadow-md shadow-indigo-900/50">
              N
            </div>
            <div className="space-y-1">
              <p className="text-xs font-medium uppercase tracking-[0.2em] text-slate-400">
                Cadet
              </p>
              <p className="text-base font-semibold tracking-tight text-slate-50">
                Nova Starling
              </p>
              <p className="text-xs text-slate-400">
                Mission: Learn how gravity changes across the solar system.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {hasReward && (
              <motion.div
                aria-label="Unlocked badge"
                className="inline-flex items-center gap-2 rounded-full border border-emerald-400/40 bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-200 shadow-sm shadow-emerald-900/40"
                initial={{ opacity: 0, scale: 0.8, y: -4 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ type: "spring", stiffness: 260, damping: 20 }}
              >
                <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-emerald-400 text-[0.6rem] font-bold text-slate-950">
                  ★
                </span>
                <span>{progress?.badge}</span>
              </motion.div>
            )}

            <div className="flex items-center gap-2 rounded-full border border-slate-700/70 bg-slate-900/80 px-3 py-1 text-xs text-slate-200 shadow-sm shadow-slate-950/70">
              <span className="text-[0.68rem] uppercase tracking-[0.18em] text-slate-400">
                Score
              </span>
              <span className="text-sm font-semibold text-sky-300">
                {progress?.score ?? 0}
              </span>
            </div>

            <button
              type="button"
              onClick={handleReset}
              className="rounded-full border border-slate-700/80 bg-slate-900/80 px-3 py-1 text-xs font-medium text-slate-200 shadow-sm shadow-slate-950/70 transition hover:border-slate-500 hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
            >
              Reset mission
            </button>
            {getFirebaseConfigStatus().enabled &&
              getFirebaseConfigStatus().missing.length === 0 &&
              !user && (
                <a
                  href="/login"
                  className="rounded-full border border-sky-500/60 bg-sky-500/10 px-3 py-1 text-xs font-medium text-sky-200 shadow-sm transition hover:bg-sky-500/20"
                >
                  Sign in to save to cloud
                </a>
              )}
            {user && (
              <button
                type="button"
                onClick={handleSignOut}
                className="rounded-full border border-slate-700/80 bg-slate-900/80 px-3 py-1 text-xs font-medium text-slate-200 shadow-sm shadow-slate-950/70 transition hover:border-slate-500 hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
              >
                Sign out
              </button>
            )}
          </div>
        </header>

        <section
          aria-label="Lesson progress"
          className="flex flex-col gap-4 rounded-2xl border border-slate-800/70 bg-slate-950/80 px-5 py-4 shadow-inner shadow-slate-950/80 sm:px-6 sm:py-5"
        >
          <div className="flex items-center justify-between gap-4">
            <div className="space-y-1">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
                Lesson
              </p>
              <h1 className="text-lg font-semibold tracking-tight text-slate-50 sm:text-xl">
                Gravity on Different Worlds
              </h1>
              <p className="max-w-xl text-xs text-slate-400 sm:text-sm">
                A 3-step mission where you{" "}
                <span className="font-medium text-sky-200">
                  discover, interact,
                </span>{" "}
                and{" "}
                <span className="font-medium text-sky-200">quiz yourself</span>{" "}
                about how gravity changes from the Moon to Jupiter.
              </p>
            </div>

            <div className="hidden items-center gap-3 md:flex">
              <p className="text-xs text-slate-400">
                Step {currentStep} of {STEPS.length}
              </p>
              <div className="flex items-center gap-1.5">
                {STEPS.map((step) => {
                  const isActive = currentStep === step.id;
                  const isComplete =
                    progress?.completed && step.id <= (progress.currentStep ?? 3);
                  return (
                    <button
                      key={step.id}
                      type="button"
                      aria-label={`Go to step ${step.id}: ${step.label}`}
                      onClick={() => setCurrentStep(step.id)}
                      className="group relative h-2.5 flex-1 rounded-full bg-slate-800/80 outline-none"
                    >
                      <span
                        className={`absolute inset-0 rounded-full transition-all ${
                          isActive
                            ? "bg-gradient-to-r from-sky-400 via-indigo-400 to-emerald-400 shadow-[0_0_16px_rgba(56,189,248,0.65)]"
                            : isComplete
                              ? "bg-sky-500/80"
                              : "bg-slate-700/80 group-hover:bg-slate-600/80"
                        }`}
                      />
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs font-medium text-slate-300 md:hidden">
            <span className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-slate-600/80 bg-slate-900/80 text-[0.7rem] text-sky-300">
              {currentStep}
            </span>
            <span className="uppercase tracking-[0.18em] text-slate-400">
              {STEPS[currentStep - 1]?.label} step
            </span>
            <span className="text-slate-500">
              / {STEPS.length} total steps
            </span>
          </div>
        </section>

        <section className="grid flex-1 grid-cols-1 gap-5 md:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
          <section
            aria-live="polite"
            className="relative overflow-hidden rounded-2xl border border-slate-800/70 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 px-5 py-5 shadow-2xl shadow-slate-950/80 sm:px-6 sm:py-6"
          >
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 opacity-60"
            >
              <div className="absolute -top-20 -left-20 h-56 w-56 rounded-full bg-sky-500/20 blur-3xl" />
              <div className="absolute bottom-0 right-[-6rem] h-60 w-60 rounded-full bg-indigo-500/20 blur-3xl" />
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(148,163,184,0.3)_0,_transparent_45%),radial-gradient(circle_at_bottom,_rgba(56,189,248,0.25)_0,_transparent_55%)]" />
            </div>

            <AnimatePresence mode="wait">
              <motion.div
                key={currentStep}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -14 }}
                transition={{ duration: 0.32, ease: "easeOut" }}
                className="relative z-10 space-y-4 sm:space-y-5"
              >
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-300">
                  Step {currentStep} · {STEPS[currentStep - 1]?.label}
                </p>
                <h2 className="text-xl font-semibold tracking-tight text-slate-50 sm:text-2xl">
                  {STEPS[currentStep - 1]?.title}
                </h2>

                {currentStep === 1 && <IntroStep />}
                {currentStep === 2 && (
                  <GravityPlayStep
                    planetPosition={planetPosition}
                    setPlanetPosition={setPlanetPosition}
                    activePlanet={activePlanet}
                  />
                )}
                {currentStep === 3 && (
                  <QuizStep
                    quizState={quizState}
                    onSelect={handleSelectQuizOption}
                    onCheck={handleCheckAnswer}
                  />
                )}
              </motion.div>
            </AnimatePresence>

            <div className="relative z-10 mt-6 flex items-center justify-between gap-3 border-t border-slate-800/70 pt-4">
              <div className="flex items-center gap-2 text-[0.74rem] text-slate-400">
                {progress?.completed ? (
                  <span>
                    Last completed{" "}
                    <time dateTime={progress.completedAt ?? ""}>
                      {progress.completedAt
                        ? new Date(progress.completedAt).toLocaleString()
                        : "just now"}
                    </time>
                  </span>
                ) : (
                  <span>
                    Complete all 3 steps to{" "}
                    <span className="font-semibold text-sky-200">
                      unlock your badge
                    </span>
                    .
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handlePrevious}
                  disabled={currentStep === 1}
                  className="inline-flex items-center justify-center rounded-full border border-slate-700/80 bg-slate-950/80 px-3 py-1.5 text-xs font-medium text-slate-200 shadow-sm shadow-slate-950/80 transition hover:border-slate-500 hover:bg-slate-900 disabled:border-slate-800/60 disabled:text-slate-500 disabled:shadow-none disabled:hover:bg-slate-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
                >
                  Previous
                </button>
                {currentStep < 3 && (
                  <button
                    type="button"
                    onClick={handleNext}
                    className="inline-flex items-center justify-center rounded-full bg-gradient-to-r from-sky-400 via-indigo-400 to-emerald-400 px-4 py-1.5 text-xs font-semibold text-slate-950 shadow-md shadow-sky-900/60 transition hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
                  >
                    Next step
                  </button>
                )}
                {currentStep === 3 && (
                  <button
                    type="button"
                    onClick={handleCompleteLesson}
                    disabled={!canComplete || isSaving}
                    className="inline-flex items-center justify-center rounded-full bg-gradient-to-r from-emerald-400 via-sky-400 to-indigo-400 px-4 py-1.5 text-xs font-semibold text-slate-950 shadow-md shadow-emerald-900/60 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
                  >
                    {isSaving ? "Saving..." : "Finish mission"}
                  </button>
                )}
              </div>
            </div>
          </section>

          <aside className="flex flex-col gap-4 rounded-2xl border border-slate-800/70 bg-slate-950/90 p-4 shadow-xl shadow-slate-950/80 sm:p-5">
            <MissionChecklist currentStep={currentStep} hasReward={hasReward} />
            <ProgressSummary progress={progress} hasLoaded={hasLoaded} />
            <TutorPanel
              currentStep={currentStep}
              setCurrentStep={setCurrentStep}
              setPlanetPosition={setPlanetPosition}
            />
          </aside>
        </section>
      </main>
    </div>
  );
}

function IntroStep() {
  return (
    <div className="space-y-4 text-sm text-slate-200 sm:text-[0.94rem]">
      <p>
        Imagine you are hopping from world to world in your starship. On some
        planets you float like a feather. On others, your boots feel glued to
        the ground.{" "}
        <span className="font-semibold text-sky-200">
          That invisible pull is gravity.
        </span>
      </p>
      <p>
        Gravity is a force that pulls objects toward each other. The more mass
        a planet has, the stronger its gravity. That means your{" "}
        <span className="font-semibold text-sky-200">
          weight can change
        </span>{" "}
        without your body changing at all.
      </p>
      <ul className="mt-2 grid gap-2 text-xs text-slate-200 sm:grid-cols-3 sm:text-[0.72rem]">
        <li className="rounded-xl border border-slate-700/80 bg-slate-900/70 px-3 py-2">
          <p className="font-semibold text-sky-200">Moon</p>
          <p className="mt-1 text-slate-300">
            About <span className="font-semibold">6x weaker</span> gravity than
            Earth. High, slow-motion jumps!
          </p>
        </li>
        <li className="rounded-xl border border-slate-700/80 bg-slate-900/70 px-3 py-2">
          <p className="font-semibold text-sky-200">Earth</p>
          <p className="mt-1 text-slate-300">
            Your normal weight. Perfect for walking, running, and playing.
          </p>
        </li>
        <li className="rounded-xl border border-slate-700/80 bg-slate-900/70 px-3 py-2">
          <p className="font-semibold text-sky-200">Jupiter</p>
          <p className="mt-1 text-slate-300">
            More than <span className="font-semibold">2x stronger</span> than
            Earth. Everything feels super heavy.
          </p>
        </li>
      </ul>
      <p className="mt-2 text-xs text-slate-300 sm:text-[0.78rem]">
        In this mission you&apos;ll{" "}
        <span className="font-semibold text-sky-200">
          experiment with gravity
        </span>{" "}
        using a slider and then{" "}
        <span className="font-semibold text-sky-200">test your knowledge</span>{" "}
        in a quick quiz to earn a badge.
      </p>
    </div>
  );
}

type GravityPlayStepProps = {
  planetPosition: number;
  setPlanetPosition: (value: number) => void;
  activePlanet: Planet;
};

function GravityPlayStep({
  planetPosition,
  setPlanetPosition,
  activePlanet,
}: GravityPlayStepProps) {
  const normalizedHeight = 1.4 - activePlanet.gravityMultiplier * 0.4;

  return (
    <div className="space-y-4 text-sm text-slate-200 sm:text-[0.94rem]">
      <p>
        Use the{" "}
        <span className="font-semibold text-sky-200">
          gravity slider
        </span>{" "}
        to move your starship between different worlds. Watch how the{" "}
        <span className="font-semibold text-sky-200">
          jump height and descriptions
        </span>{" "}
        change as gravity gets stronger or weaker.
      </p>

      <div className="mt-2 grid gap-4 rounded-2xl border border-slate-800/80 bg-slate-950/90 p-3 sm:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] sm:p-4">
        <div className="flex flex-col justify-between gap-4">
          <label
            htmlFor="gravity-slider"
            className="flex items-center justify-between text-xs font-medium text-slate-200 sm:text-[0.76rem]"
          >
            <span className="uppercase tracking-[0.18em] text-slate-400">
              Gravity strength
            </span>
            <span className="text-sky-200">
              {activePlanet.gravityMultiplier.toFixed(2)}g
            </span>
          </label>

          <div className="flex items-center gap-3">
            <span className="text-[0.7rem] text-slate-400">Low</span>
            <input
              id="gravity-slider"
              type="range"
              min={1}
              max={5}
              step={1}
              value={planetPosition}
              onChange={(event) =>
                setPlanetPosition(Number.parseInt(event.target.value, 10))
              }
              className="flex-1 accent-sky-400"
            />
            <span className="text-[0.7rem] text-slate-400">High</span>
          </div>

          <div className="flex justify-between text-[0.7rem] text-slate-400">
            {PLANETS.map((planet) => (
              <button
                key={planet.id}
                type="button"
                onClick={() => setPlanetPosition(planet.position)}
                className={`relative rounded-full px-1.5 py-0.5 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 ${
                  planet.id === activePlanet.id
                    ? "text-sky-200"
                    : "text-slate-500 hover:text-slate-300"
                }`}
                aria-label={`Jump to ${planet.name}`}
              >
                {planet.name}
                {planet.id === activePlanet.id && (
                  <span
                    aria-hidden="true"
                    className="absolute inset-x-1 -bottom-0.5 h-0.5 rounded-full bg-gradient-to-r from-sky-400 via-indigo-400 to-emerald-400"
                  />
                )}
              </button>
            ))}
          </div>
        </div>

        <div className="relative overflow-hidden rounded-xl border border-slate-800/80 bg-gradient-to-b from-slate-900 to-slate-950 p-3 sm:p-4">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 opacity-60"
          >
            <div className="absolute -top-8 left-1/2 h-20 w-32 -translate-x-1/2 rounded-full bg-sky-500/30 blur-3xl" />
            <div className="absolute bottom-0 left-1/2 h-1.5 w-24 -translate-x-1/2 rounded-full bg-slate-900 shadow-[0_0_38px_rgba(15,23,42,1)]" />
          </div>

          <div className="relative z-10 flex flex-col items-center gap-2">
            <p className="text-[0.7rem] font-semibold uppercase tracking-[0.2em] text-slate-400">
              Jump simulator
            </p>

            <div className="mt-1 flex h-24 w-full items-end justify-center">
              <motion.div
                aria-hidden="true"
                className="flex h-20 w-16 items-center justify-center rounded-full border border-sky-300/40 bg-gradient-to-b from-sky-300 via-indigo-400 to-emerald-400 shadow-[0_0_30px_rgba(56,189,248,0.9)]"
                animate={{
                  y: [-8, -18 * normalizedHeight, -8],
                  scale: [1, 1.05, 1],
                }}
                transition={{
                  duration: 1.3,
                  repeat: Number.POSITIVE_INFINITY,
                  ease: "easeInOut",
                }}
              >
                <span className="text-xs font-bold text-slate-950">
                  ★
                </span>
              </motion.div>
            </div>

            <p className="mt-2 text-[0.78rem] font-medium text-slate-200">
              On <span className="text-sky-200">{activePlanet.name}</span> your
              jumps feel{" "}
              <span className="font-semibold text-sky-200">
                {activePlanet.gravityMultiplier < 1
                  ? "lighter"
                  : activePlanet.gravityMultiplier > 1.3
                    ? "much heavier"
                    : "slightly heavier"}
              </span>
              .
            </p>
            <p className="text-[0.76rem] text-slate-300">
              {activePlanet.description}
            </p>
          </div>
        </div>
      </div>

      <p className="text-xs text-slate-300 sm:text-[0.78rem]">
        Notice that{" "}
        <span className="font-semibold text-sky-200">
          the slider changes gravity smoothly
        </span>
        , but the labels jump between real planets. Scientists use gravity
        numbers like these to plan landings and design space suits.
      </p>
    </div>
  );
}

type QuizStepProps = {
  quizState: QuizState;
  onSelect: (id: string) => void;
  onCheck: () => void;
};

function QuizStep({ quizState, onSelect, onCheck }: QuizStepProps) {
  const handleKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>, id: string) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onSelect(id);
    }
  };

  const feedbackMessage =
    quizState.checked && quizState.isCorrect !== null
      ? quizState.isCorrect
        ? "Correct! The Moon’s weak gravity lets you jump the highest."
        : "Not quite. The Moon has the weakest gravity, so you’d jump highest there."
      : null;

  return (
    <div className="space-y-4 text-sm text-slate-200 sm:text-[0.94rem]">
      <p>
        Time for a quick check! Imagine you weigh{" "}
        <span className="font-semibold text-sky-200">30 kg</span> on Earth and
        can jump 30 cm high. On which world from this lesson would you jump the
        highest?
      </p>

      <div className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
          Choose one answer
        </p>
        <div className="space-y-2" role="radiogroup" aria-label="Gravity quiz">
          {QUIZ_OPTIONS.map((option) => {
            const isSelected = quizState.selectedId === option.id;
            const isChecked = quizState.checked && isSelected;
            const isCorrectAndChecked = isChecked && option.correct;
            const isIncorrectAndChecked = isChecked && !option.correct;

            return (
              <button
                key={option.id}
                type="button"
                role="radio"
                aria-checked={isSelected}
                tabIndex={0}
                onClick={() => onSelect(option.id)}
                onKeyDown={(event) => handleKeyDown(event, option.id)}
                className={`flex w-full items-start gap-3 rounded-xl border px-3 py-2.5 text-left text-xs transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 sm:px-3.5 sm:py-3 sm:text-[0.8rem] ${
                  isSelected
                    ? "border-sky-400/80 bg-slate-900/90 shadow-[0_0_0_1px_rgba(56,189,248,0.4)]"
                    : "border-slate-700/80 bg-slate-950/70 hover:border-slate-500/80 hover:bg-slate-900/80"
                } ${
                  isCorrectAndChecked
                    ? "border-emerald-400/80 bg-emerald-500/10"
                    : ""
                } ${
                  isIncorrectAndChecked
                    ? "border-rose-400/80 bg-rose-500/10"
                    : ""
                }`}
              >
                <span
                  className={`mt-0.5 inline-flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full border text-[0.7rem] font-semibold ${
                    isSelected
                      ? "border-sky-300/80 bg-sky-400 text-slate-950"
                      : "border-slate-600/80 text-slate-200"
                  }`}
                >
                  {option.label}
                </span>
                <span className="text-slate-100">{option.text}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex items-center justify-between gap-3 border-t border-slate-800/70 pt-3">
        <button
          type="button"
          onClick={onCheck}
          disabled={!quizState.selectedId}
          className="inline-flex items-center justify-center rounded-full border border-slate-700/80 bg-slate-950/80 px-3 py-1.5 text-xs font-medium text-slate-200 shadow-sm shadow-slate-950/80 transition hover:border-slate-500 hover:bg-slate-900 disabled:border-slate-800/60 disabled:text-slate-500 disabled:shadow-none disabled:hover:bg-slate-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
        >
          Check answer
        </button>

        {feedbackMessage && (
          <p className="text-[0.78rem] text-slate-200">{feedbackMessage}</p>
        )}
      </div>
    </div>
  );
}

type MissionChecklistProps = {
  currentStep: LessonStep;
  hasReward: boolean;
};

function MissionChecklist({ currentStep, hasReward }: MissionChecklistProps) {
  const items = [
    {
      id: 1,
      label: "Understand",
      title: "Learn what gravity is.",
      description: "Complete the short story about how gravity changes.",
    },
    {
      id: 2,
      label: "Experiment",
      title: "Play with the gravity slider.",
      description: "Compare how different planets change your jump height.",
    },
    {
      id: 3,
      label: "Prove",
      title: "Answer the gravity quiz.",
      description: "Pick the world where you’d jump the highest.",
    },
  ] as const;

  return (
    <section aria-label="Mission checklist" className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
          Mission checklist
        </p>
        {hasReward && (
          <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[0.7rem] font-medium text-emerald-200">
            Badge unlocked
          </span>
        )}
      </div>
      <ul className="space-y-2">
        {items.map((item) => {
          const isDone =
            hasReward || item.id < currentStep || (item.id === 3 && hasReward);
          const isActive = currentStep === item.id && !hasReward;

          return (
            <li
              key={item.id}
              className={`flex items-start gap-2.5 rounded-xl border px-3 py-2.5 text-xs transition ${
                isDone
                  ? "border-emerald-400/50 bg-emerald-500/10"
                  : isActive
                    ? "border-sky-400/70 bg-sky-500/5"
                    : "border-slate-800/80 bg-slate-950/80"
              }`}
            >
              <span
                aria-hidden="true"
                className={`mt-0.5 inline-flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full text-[0.7rem] font-semibold ${
                  isDone
                    ? "bg-emerald-400 text-slate-950"
                    : isActive
                      ? "bg-sky-400 text-slate-950"
                      : "border border-slate-600/80 bg-slate-900 text-slate-200"
                }`}
              >
                {isDone ? "✓" : item.id}
              </span>
              <div className="space-y-0.5">
                <p className="font-semibold text-slate-100">{item.title}</p>
                <p className="text-[0.72rem] text-slate-400">
                  {item.description}
                </p>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

type ProgressSummaryProps = {
  progress: LessonProgress | null;
  hasLoaded: boolean;
};

function ProgressSummary({ progress, hasLoaded }: ProgressSummaryProps) {
  return (
    <section
      aria-label="Progress summary"
      className="space-y-3 rounded-xl border border-slate-800/80 bg-slate-950/90 p-3 text-xs text-slate-200"
    >
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
        Progress summary
      </p>
      {!hasLoaded && (
        <p className="text-[0.76rem] text-slate-400">
          Loading your last mission data...
        </p>
      )}
      {hasLoaded && !progress && (
        <p className="text-[0.76rem] text-slate-400">
          No completed missions yet. Work through all 3 steps to earn your
          first badge.
        </p>
      )}
      {hasLoaded && progress && (
        <div className="space-y-1.5 text-[0.76rem]">
          <p>
            <span className="text-slate-400">Lesson:</span>{" "}
            <span className="font-medium text-slate-100">
              Gravity on Different Worlds
            </span>
          </p>
          <p>
            <span className="text-slate-400">Status:</span>{" "}
            <span className="font-medium text-emerald-300">
              {progress.completed ? "Completed" : "In progress"}
            </span>
          </p>
          <p>
            <span className="text-slate-400">Best score:</span>{" "}
            <span className="font-medium text-sky-200">{progress.score}</span>
          </p>
          {progress.badge && (
            <p>
              <span className="text-slate-400">Badge:</span>{" "}
              <span className="font-medium text-emerald-200">
                {progress.badge}
              </span>
            </p>
          )}
          {progress.completedAt && (
            <p className="text-slate-400">
              Completed at{" "}
              <time dateTime={progress.completedAt}>
                {new Date(progress.completedAt).toLocaleString()}
              </time>
            </p>
          )}
        </div>
      )}
    </section>
  );
}

type ChatMessage = {
  id: number;
  role: "user" | "assistant";
  text: string;
};

type TutorPanelProps = {
  currentStep: LessonStep;
  setCurrentStep: (step: LessonStep) => void;
  setPlanetPosition: (value: number) => void;
};

type TutorAction =
  | {
      type: "gotoStep";
      step: LessonStep;
    }
  | {
      type: "focusPlanet";
      planetId: "moon" | "mars" | "earth" | "neptune" | "jupiter";
    };

type TutorApiResponse = {
  reply: {
    text: string;
  };
  actions: TutorAction[];
  usedFacts: string[];
};

function TutorPanel({
  currentStep,
  setCurrentStep,
  setPlanetPosition,
}: TutorPanelProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 1,
      role: "assistant",
      text: "Hi Cadet! I’m Spacey, your gravity guide. Ask me anything you’re curious about while you explore this mission.",
    },
  ]);
  const [input, setInput] = useState("");
  const [isThinking, setIsThinking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || isThinking) return;

    const nextId = (messages[messages.length - 1]?.id ?? 1) + 1;
    const userMessage: ChatMessage = {
      id: nextId,
      role: "user",
      text: trimmed,
    };

    const nextMessages = [...messages, userMessage];
    setMessages(nextMessages);
    setInput("");
    setIsThinking(true);
    setError(null);

    try {
      const payload = {
        messages: nextMessages.map((message) => ({
          role: message.role,
          content: message.text,
        })),
        lessonStep: currentStep,
      };

      const response = await fetch("/api/tutor", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = (await response.json()) as TutorApiResponse;

      const assistantId = data.reply?.text
        ? data.reply.text.length + nextId
        : nextId + 1;

      const assistantMessage: ChatMessage = {
        id: assistantId,
        role: "assistant",
        text:
          data.reply?.text ??
          "I had trouble thinking of a reply, but remember: weaker gravity means higher jumps.",
      };

      setMessages((prev) => [...prev, assistantMessage]);
      applyTutorActions(data.actions ?? [], setCurrentStep, setPlanetPosition);
    } catch (caughtError) {
      console.error("TutorPanel error:", caughtError);
      setError(
        "I ran into a problem asking the AI for help. Please try again in a moment.",
      );
    } finally {
      setIsThinking(false);
    }
  };

  return (
    <section
      aria-label="Ask the Spacey AI tutor"
      className="space-y-3 rounded-xl border border-slate-800/80 bg-slate-950/90 p-3 text-xs text-slate-200"
    >
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
          Ask Spacey the tutor
        </p>
        <span className="rounded-full bg-sky-500/15 px-2 py-0.5 text-[0.7rem] text-sky-200">
          AI powered
        </span>
      </div>

      <div className="max-h-40 space-y-1.5 overflow-y-auto rounded-lg border border-slate-800/70 bg-slate-950/80 p-2">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${
              message.role === "user" ? "justify-end" : "justify-start"
            }`}
          >
            <div
              className={`max-w-[80%] rounded-2xl px-3 py-1.5 text-[0.75rem] ${
                message.role === "user"
                  ? "bg-sky-500 text-slate-950"
                  : "bg-slate-800 text-slate-100"
              }`}
            >
              {message.text}
            </div>
          </div>
        ))}
        {isThinking && (
          <div className="flex justify-start">
            <div className="flex items-center gap-1 rounded-2xl bg-slate-800 px-3 py-1.5 text-[0.75rem] text-slate-200">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-sky-300" />
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-sky-300 delay-150" />
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-sky-300 delay-300" />
            </div>
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-2">
        <label className="sr-only" htmlFor="tutor-input">
          Ask a question about gravity
        </label>
        <div className="flex items-center gap-2">
          <input
            id="tutor-input"
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder="Ask about gravity, planets, or your mission..."
            className="h-7 flex-1 rounded-full border border-slate-700/80 bg-slate-950/80 px-3 text-[0.75rem] text-slate-100 outline-none placeholder:text-slate-500 focus:border-sky-400 focus:ring-1 focus:ring-sky-400"
          />
          <button
            type="submit"
            disabled={isThinking || !input.trim()}
            className="inline-flex h-7 items-center justify-center rounded-full bg-sky-400 px-3 text-[0.72rem] font-semibold text-slate-950 shadow-sm shadow-sky-900/60 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Ask
          </button>
        </div>
        {error && (
          <p className="text-[0.7rem] text-rose-300">
            {error}
          </p>
        )}
        {!error && (
          <p className="text-[0.7rem] text-slate-500">
            Spacey remembers this conversation while the page is open and
            sometimes moves you to a different step or planet to demonstrate an
            idea.
          </p>
        )}
      </form>
    </section>
  );
}

function applyTutorActions(
  actions: TutorAction[],
  setCurrentStep: (step: LessonStep) => void,
  setPlanetPosition: (value: number) => void,
) {
  for (const action of actions) {
    if (action.type === "gotoStep") {
      setCurrentStep(action.step);
    }
    if (action.type === "focusPlanet") {
      const planet = PLANETS.find((candidate) => candidate.id === action.planetId);
      if (planet) {
        setPlanetPosition(planet.position);
      }
    }
  }
}


