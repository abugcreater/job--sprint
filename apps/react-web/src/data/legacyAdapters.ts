export const LEGACY_STORAGE_KEYS = [
  "jobSprint.completed.v1",
  "jobSprint.reviews.v1",
  "jobSprint.applications.v1",
  "jobSprint.interviewSessions.v1",
  "jobSprint.interviewMistakes.v1",
  "jobSprint.generatedKb.v1"
] as const;

export type LegacyStorageKey = (typeof LEGACY_STORAGE_KEYS)[number];

export interface LegacyStorageStatus {
  available: boolean;
  detectedKeys: LegacyStorageKey[];
}

export interface LegacySnapshot {
  completed: Record<string, boolean>;
  reviews: Record<string, unknown>;
  applications: unknown[];
  interviewSessions: unknown[];
}

export function readJsonStorage<T>(key: string, fallback: T, storage: Storage | undefined = getLocalStorage()): T {
  if (!storage) return fallback;

  try {
    const raw = storage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function getLocalStorage(): Storage | undefined {
  if (typeof window === "undefined" || !window.localStorage) {
    return undefined;
  }

  return window.localStorage;
}

export function getLegacyStorageStatus(): LegacyStorageStatus {
  const storage = getLocalStorage();

  if (!storage) {
    return { available: false, detectedKeys: [] };
  }

  return {
    available: true,
    detectedKeys: LEGACY_STORAGE_KEYS.filter((key) => storage.getItem(key) != null)
  };
}

export function getLegacySnapshot(storage: Storage | undefined = getLocalStorage()): LegacySnapshot {
  return {
    completed: readJsonStorage("jobSprint.completed.v1", {}, storage),
    reviews: readJsonStorage("jobSprint.reviews.v1", {}, storage),
    applications: readJsonStorage("jobSprint.applications.v1", [], storage),
    interviewSessions: readJsonStorage("jobSprint.interviewSessions.v1", [], storage)
  };
}
