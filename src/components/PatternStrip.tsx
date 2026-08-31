import { RECORDER_NOTES, type NoteName } from '../lib/recorder.ts';
import type { LessonPatternStep } from '../types.ts';

interface PatternStripProps {
  pattern: readonly LessonPatternStep[];
  currentIndex: number | null;
  complete: boolean;
  onSelectNote?: (note: NoteName) => void;
  explored?: ReadonlySet<NoteName>;
}

export function PatternStrip({ pattern, currentIndex, complete, onSelectNote, explored }: PatternStripProps) {
  return (
    <div className="pattern-strip" aria-label="Notes in this lesson" aria-live="polite">
      {pattern.map((step, index) => {
        const isCurrent = currentIndex !== null && !complete && index === currentIndex;
        const isDone = complete || (explored ? explored.has(step.note) : currentIndex !== null && index < currentIndex);
        const content = (
          <>
            <strong>{RECORDER_NOTES[step.note].label}</strong>
            <small>{step.beats === 0.5 ? 'quick' : step.beats === 1 ? 'one beat' : `${step.beats} beats`}</small>
            {isDone && <span aria-hidden="true">✓</span>}
          </>
        );
        if (onSelectNote) {
          return (
            <button
              type="button"
              className={`note-stone ${isCurrent ? 'note-stone--current' : ''} ${isDone ? 'note-stone--done' : ''}`}
              key={`${step.note}-${index}`}
              onClick={() => onSelectNote(step.note)}
              aria-pressed={isCurrent}
            >
              {content}
            </button>
          );
        }
        return (
          <div className={`note-stone ${isCurrent ? 'note-stone--current' : ''} ${isDone ? 'note-stone--done' : ''}`} key={`${step.note}-${index}`} aria-current={isCurrent ? 'step' : undefined}>
            {content}
          </div>
        );
      })}
    </div>
  );
}
