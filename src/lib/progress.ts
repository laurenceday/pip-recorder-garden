const MAX_COMPLETED_LESSONS = 200;

export const PROGRESS_STORAGE_KEY = 'pip-recorder-garden.completed.v1';

export function parseCompletedLessons(raw: string | null, validIds: ReadonlySet<string>): Set<string> {
  if (raw === null || raw.length > 16_384) return new Set();
  try {
    const value: unknown = JSON.parse(raw);
    if (!Array.isArray(value) || value.length > MAX_COMPLETED_LESSONS) return new Set();
    const completed = value.filter((item): item is string => typeof item === 'string' && validIds.has(item));
    return new Set(completed);
  } catch {
    return new Set();
  }
}

export function serialiseCompletedLessons(completed: ReadonlySet<string>): string {
  return JSON.stringify([...completed].sort());
}

