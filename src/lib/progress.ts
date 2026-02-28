export type LessonStep = 1 | 2 | 3;

export type LessonProgress = {
  studentId: string;
  lessonId: string;
  currentStep: LessonStep;
  completed: boolean;
  score: number;
  badge?: string;
  completedAt?: string;
};

const STORAGE_KEY = "spacey-science/progress/v1";

type StoredProgressMap = Record<string, LessonProgress>;

function getStorage(): Storage | null {
  if (typeof window === "undefined") return null;
  if (!("localStorage" in window)) return null;
  return window.localStorage;
}

function loadAll(): StoredProgressMap {
  const storage = getStorage();
  if (!storage) return {};

  try {
    const raw = storage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as StoredProgressMap;
    if (!parsed || typeof parsed !== "object") return {};
    return parsed;
  } catch {
    return {};
  }
}

function saveAll(map: StoredProgressMap) {
  const storage = getStorage();
  if (!storage) return;
  storage.setItem(STORAGE_KEY, JSON.stringify(map));
}

export function loadProgress(studentId: string, lessonId: string): LessonProgress | null {
  const map = loadAll();
  const key = `${studentId}:${lessonId}`;
  return map[key] ?? null;
}

export function persistProgress(progress: LessonProgress): LessonProgress {
  const map = loadAll();
  const key = `${progress.studentId}:${progress.lessonId}`;
  const updated: LessonProgress = {
    ...progress,
    completedAt: progress.completed
      ? progress.completedAt ?? new Date().toISOString()
      : progress.completedAt,
  };
  map[key] = updated;
  saveAll(map);
  return updated;
}

export function clearProgress(studentId: string, lessonId: string) {
  const map = loadAll();
  const key = `${studentId}:${lessonId}`;
  if (key in map) {
    delete map[key];
    saveAll(map);
  }
}

