import { useState } from 'react';
import { RECORDER_NOTES, type NoteName } from '../lib/recorder.ts';

interface FingeringMissionProps {
  note: NoteName;
  isLast: boolean;
  onComplete: () => void;
  onChooseAnother: () => void;
}

const HOLES = [0, 1, 2, 3, 4, 5, 6, 7] as const;

export function FingeringMission({ note, isLast, onComplete, onChooseAnother }: FingeringMissionProps) {
  const [covered, setCovered] = useState<Set<number>>(new Set());
  const target = RECORDER_NOTES[note];
  const matches = (
    covered.size === target.coveredHoles.length
    && target.coveredHoles.every((hole) => covered.has(hole))
  );

  const toggle = (hole: number) => {
    setCovered((current) => {
      const next = new Set(current);
      if (next.has(hole)) next.delete(hole);
      else next.add(hole);
      return next;
    });
  };

  return (
    <section className="mission-activity" aria-labelledby="finger-mission-title">
      <p className="eyebrow">Copy with fingers</p>
      <h3 id="finger-mission-title">Build the picture for {target.label}</h3>
      <p>Tap each hole to cover or open it. The big picture beside this card is your clue.</p>
      <div className="hole-board" aria-label={`Interactive fingering puzzle for ${target.label}`}>
        {HOLES.map((hole) => (
          <button
            className={`hole-button ${covered.has(hole) ? 'hole-button--covered' : ''}`}
            type="button"
            key={hole}
            aria-pressed={covered.has(hole)}
            aria-label={`${hole === 0 ? 'Thumb hole' : `Hole ${hole}`}: ${covered.has(hole) ? 'covered' : 'open'}`}
            onClick={() => toggle(hole)}
          >
            {hole === 0 ? 'T' : hole}
          </button>
        ))}
      </div>
      <p className="mission-feedback" aria-live="polite">
        {matches ? 'Your screen picture matches Pip’s clue.' : 'Keep looking at the clue. You can change any hole.'}
      </p>
      <div className="mission-actions">
        {matches && (
          <button className="button button--primary" type="button" onClick={onComplete}>
            {isLast ? 'Picture matched — make a tune' : 'Picture matched — next note'}
          </button>
        )}
        <button className="button button--soft" type="button" onClick={onChooseAnother}>Choose another way</button>
      </div>
    </section>
  );
}
