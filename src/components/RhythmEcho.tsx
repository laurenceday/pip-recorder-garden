import { useState } from 'react';
import { compareRhythm, type RhythmResult } from '../lib/mission-loop.ts';
import type { LessonPatternStep } from '../types.ts';

interface RhythmEchoProps {
  pattern: readonly LessonPatternStep[];
  onComplete: () => void;
  onChooseAnother: () => void;
}

export function RhythmEcho({ pattern, onComplete, onChooseAnother }: RhythmEchoProps) {
  const [tapTimes, setTapTimes] = useState<number[]>([]);
  const [result, setResult] = useState<RhythmResult>(() => compareRhythm(pattern, []));

  const reset = () => {
    setTapTimes([]);
    setResult(compareRhythm(pattern, []));
  };

  const tap = () => {
    const now = performance.now();
    const next = [...tapTimes, now];
    const nextResult = compareRhythm(pattern, next);
    setTapTimes(next);
    setResult(nextResult);
  };

  const message = result.kind === 'matched'
    ? 'Those taps have the same big rhythm shape.'
    : result.kind === 'try-again'
      ? 'That was a different shape. Clear the taps and try again, or choose another way.'
      : `Tap ${result.expectedTaps - result.receivedTaps} more ${result.expectedTaps - result.receivedTaps === 1 ? 'time' : 'times'}.`;

  return (
    <section className="mission-activity" aria-labelledby="rhythm-mission-title">
      <p className="eyebrow">Copy the rhythm</p>
      <h3 id="rhythm-mission-title">Tap Pip’s beat</h3>
      <p>Use one big button. Fast or slow is fine; Pip only compares the shape.</p>
      <button
        className="rhythm-pad"
        type="button"
        onClick={tap}
        disabled={result.kind !== 'waiting'}
        aria-label={`Tap the rhythm, ${result.receivedTaps} of ${result.expectedTaps} taps`}
      >
        <span aria-hidden="true">♪</span>
        Tap {result.receivedTaps}/{result.expectedTaps}
      </button>
      <p className="mission-feedback" aria-live="polite">{message}</p>
      <div className="mission-actions">
        {result.kind === 'matched' && <button className="button button--primary" type="button" onClick={onComplete}>Rhythm echoed — make a tune</button>}
        {result.kind !== 'waiting' && <button className="button button--soft" type="button" onClick={reset}>Clear my taps</button>}
        <button className="button button--soft" type="button" onClick={onChooseAnother}>Choose another way</button>
      </div>
    </section>
  );
}
