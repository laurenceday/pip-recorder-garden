import { useCallback, useMemo, useState } from 'react';
import { parseCompletedLessons, PROGRESS_STORAGE_KEY, serialiseCompletedLessons } from '../lib/progress.ts';

export function useProgress(lessonIds: readonly string[]) {
  const validIds = useMemo(() => new Set(lessonIds), [lessonIds]);
  const [completed, setCompleted] = useState<Set<string>>(() => {
    if (typeof window === 'undefined') return new Set();
    try {
      return parseCompletedLessons(window.localStorage.getItem(PROGRESS_STORAGE_KEY), validIds);
    } catch {
      return new Set();
    }
  });

  const store = useCallback((next: Set<string>) => {
    setCompleted(next);
    try {
      window.localStorage.setItem(PROGRESS_STORAGE_KEY, serialiseCompletedLessons(next));
    } catch {
      // Progress still works for this visit when storage is blocked or full.
    }
  }, []);

  const markComplete = useCallback((lessonId: string) => {
    if (!validIds.has(lessonId)) return;
    setCompleted((current) => {
      if (current.has(lessonId)) return current;
      const next = new Set(current);
      next.add(lessonId);
      try {
        window.localStorage.setItem(PROGRESS_STORAGE_KEY, serialiseCompletedLessons(next));
      } catch {
        // Progress still works for this visit when storage is blocked or full.
      }
      return next;
    });
  }, [validIds]);

  const resetProgress = useCallback(() => store(new Set()), [store]);
  return { completed, markComplete, resetProgress };
}
