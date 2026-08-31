import type { Lesson } from '../types.ts';

interface LessonTrailProps {
  lessons: readonly Lesson[];
  selectedId: string;
  completed: ReadonlySet<string>;
  onSelect: (lessonId: string) => void;
}

const CHAPTER_ICONS: Record<string, string> = {
  'First sounds': '🌱',
  'Finger steps': '🐾',
  Echoes: '💧',
  'Little tunes': '🌼',
  Explore: '🪶',
};

export function LessonTrail({ lessons, selectedId, completed, onSelect }: LessonTrailProps) {
  return (
    <nav className="lesson-trail" aria-label="Twelve recorder lessons">
      <div className="trail-heading">
        <div>
          <span className="eyebrow">Garden path</span>
          <h2>12 little lessons</h2>
        </div>
        <span className="trail-count" aria-label={`${completed.size} of ${lessons.length} lessons saved as complete`}>
          {completed.size}/{lessons.length}
        </span>
      </div>
      <p className="trail-note">Every lesson is open. Pick the one that feels right today.</p>
      <ol>
        {lessons.map((lesson) => {
          const isSelected = lesson.id === selectedId;
          const isComplete = completed.has(lesson.id);
          return (
            <li key={lesson.id} className={`trail-item accent-${lesson.accent}`}>
              <button type="button" onClick={() => onSelect(lesson.id)} aria-current={isSelected ? 'page' : undefined}>
                <span className="trail-number" aria-hidden="true">{isComplete ? '✓' : lesson.order}</span>
                <span className="trail-copy">
                  <small>{CHAPTER_ICONS[lesson.chapter] ?? '🌿'} {lesson.chapter}</small>
                  <strong>{lesson.shortTitle}</strong>
                </span>
                <span className="trail-leaves" aria-label={`Difficulty ${lesson.difficulty} of 5`}>
                  {'●'.repeat(lesson.difficulty)}<i>{'●'.repeat(5 - lesson.difficulty)}</i>
                </span>
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
