import { useState } from 'react';
import {
  addMadePatternNote,
  madePatternIsReady,
  MAX_MADE_PATTERN_NOTES,
  removeMadePatternNote,
} from '../lib/mission-loop.ts';
import { RECORDER_NOTES, type NoteName } from '../lib/recorder.ts';

interface PatternMakerProps {
  allowedNotes: readonly NoteName[];
  playing: boolean;
  activeIndex: number | null;
  guideIssue: string | null;
  onHear: (notes: readonly NoteName[]) => void;
  onStop: () => void;
  onComplete: () => void;
}

export function PatternMaker({ allowedNotes, playing, activeIndex, guideIssue, onHear, onStop, onComplete }: PatternMakerProps) {
  const [notes, setNotes] = useState<NoteName[]>([]);
  const ready = madePatternIsReady(notes, allowedNotes);

  return (
    <section className="pattern-maker" aria-labelledby="pattern-maker-title">
      <div>
        <p className="eyebrow">Make one tiny tune</p>
        <h2 id="pattern-maker-title">Choose 2, 3 or 4 notes</h2>
        <p>Only this lesson’s notes are here. Your tune stays on this screen and disappears when you leave.</p>
      </div>
      <div className="made-pattern" aria-label={`Made pattern with ${notes.length} notes`}>
        {Array.from({ length: MAX_MADE_PATTERN_NOTES }, (_, index) => {
          const note = notes[index];
          return (
            <span className={`${note ? 'made-note' : 'made-note made-note--empty'} ${playing && activeIndex === index ? 'made-note--current' : ''}`} key={index}>
              {note ? RECORDER_NOTES[note].label : '·'}
            </span>
          );
        })}
      </div>
      {guideIssue && <output className="mission-feedback">{guideIssue}</output>}
      <div className="maker-note-buttons" aria-label="Notes available in this lesson">
        {allowedNotes.map((note) => (
          <button
            className="note-choice"
            type="button"
            key={note}
            disabled={playing || notes.length >= MAX_MADE_PATTERN_NOTES}
            onClick={() => setNotes((current) => addMadePatternNote(current, note, allowedNotes))}
          >
            Add {RECORDER_NOTES[note].label}
          </button>
        ))}
      </div>
      <div className="mission-actions">
        <button className="button button--soft" type="button" disabled={notes.length === 0 || playing} onClick={() => setNotes(removeMadePatternNote)}>Undo one</button>
        {!ready && (
          <button className="button button--soft" type="button" onClick={onComplete}>Finish without a tune</button>
        )}
        {playing ? (
          <button className="button button--stop" type="button" onClick={onStop}>Stop my tune</button>
        ) : (
          <button className="button button--tone" type="button" disabled={!ready} onClick={() => onHear(notes)}>Hear my tune</button>
        )}
        <button className="button button--primary" type="button" disabled={!ready || playing} onClick={onComplete}>Finish this turn</button>
      </div>
    </section>
  );
}
