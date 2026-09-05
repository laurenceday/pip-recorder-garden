import { useEffect, useRef, useState } from 'react';
import { GardenMark } from './GardenMark.tsx';
import {
  childCopyFor,
  type ChildCopyState,
  type ChildNoteLetter,
} from '../lib/child-copy.ts';

interface ChildStageProps {
  state: ChildCopyState;
  notes: readonly ChildNoteLetter[];
  coveredHoles: readonly number[];
  movingHoles: readonly number[];
  gardenGrowth: number;
  canSpeak: boolean;
  busy: boolean;
  onAction: (choices: readonly number[]) => void;
  onBack: () => void;
  onSpeak: () => void;
}

const MIN_CHILD_MADE_NOTES = 2;
const MAX_CHILD_MADE_NOTES = 4;

export function ChildStage({ state, notes, coveredHoles, movingHoles, gardenGrowth, canSpeak, busy, onAction, onBack, onSpeak }: ChildStageProps) {
  const copy = childCopyFor(state);
  const actionRef = useRef<HTMLButtonElement>(null);
  const firstNoteRef = useRef<HTMLButtonElement>(null);
  const [madeNotes, setMadeNotes] = useState<number[]>([]);
  const [heardMade, setHeardMade] = useState(false);

  useEffect(() => {
    if (state === 'more') firstNoteRef.current?.focus();
    else actionRef.current?.focus();
  }, [state]);

  useEffect(() => {
    if (state === 'more' && madeNotes.length === MAX_CHILD_MADE_NOTES) actionRef.current?.focus();
  }, [madeNotes.length, state]);

  const chooseNote = (choice: number) => {
    if (state !== 'more') return;
    setMadeNotes((current) => current.length < MAX_CHILD_MADE_NOTES ? [...current, choice] : current);
  };

  const runAction = () => {
    if (state === 'done') setMadeNotes([]);
    if (state === 'more') setHeardMade(true);
    onAction(madeNotes);
  };

  const runBack = () => {
    if (state === 'more') setMadeNotes([]);
    onBack();
  };

  return (
    <main className="child-stage" data-child-state={state} data-copy-role="child">
      <section className="model-card" aria-live="polite">
        <div className="child-head">
          <button className="pip-help" disabled={!canSpeak || busy} onClick={onSpeak} type="button">
            <GardenMark growth={gardenGrowth + (heardMade ? 1 : 0)} />
            <span data-child-copy-id={`${state}.help`}>{copy.help}</span>
            <i aria-hidden="true" className="pip-help__sound" />
          </button>
          <h1 data-child-copy-id={`${state}.title`}>{copy.title}</h1>
        </div>
        <div aria-hidden="true" className="child-fingering">
          <i className={`${coveredHoles.includes(0) ? 'child-fingering__hole child-fingering__hole--down' : 'child-fingering__hole'}${movingHoles.includes(0) ? ' child-fingering__hole--move' : ''}`} />
          <i className={`${coveredHoles.includes(1) ? 'child-fingering__hole child-fingering__hole--down' : 'child-fingering__hole'}${movingHoles.includes(1) ? ' child-fingering__hole--move' : ''}`} />
          <i className={`${coveredHoles.includes(2) ? 'child-fingering__hole child-fingering__hole--down' : 'child-fingering__hole'}${movingHoles.includes(2) ? ' child-fingering__hole--move' : ''}`} />
          <i className={`${coveredHoles.includes(3) ? 'child-fingering__hole child-fingering__hole--down' : 'child-fingering__hole'}${movingHoles.includes(3) ? ' child-fingering__hole--move' : ''}`} />
          <i className={`${coveredHoles.includes(4) ? 'child-fingering__hole child-fingering__hole--down' : 'child-fingering__hole'}${movingHoles.includes(4) ? ' child-fingering__hole--move' : ''}`} />
          <i className={`${coveredHoles.includes(5) ? 'child-fingering__hole child-fingering__hole--down' : 'child-fingering__hole'}${movingHoles.includes(5) ? ' child-fingering__hole--move' : ''}`} />
          <i className={`${coveredHoles.includes(6) ? 'child-fingering__hole child-fingering__hole--down' : 'child-fingering__hole'}${movingHoles.includes(6) ? ' child-fingering__hole--move' : ''}`} />
          <i className={`${coveredHoles.includes(7) ? 'child-fingering__hole child-fingering__hole--down' : 'child-fingering__hole'}${movingHoles.includes(7) ? ' child-fingering__hole--move' : ''}`} />
        </div>
        <div className="pattern-strip">
          {notes.map((note, index) => (
            <button ref={index === 0 ? firstNoteRef : undefined} className="note-stone" data-child-copy-id={`all.note.${note.toLowerCase()}`} disabled={state !== 'more' || busy || madeNotes.length >= MAX_CHILD_MADE_NOTES} key={`${note}-${index}`} onClick={() => chooseNote(index)} type="button">
              {note}
            </button>
          ))}
        </div>
        <div aria-hidden="true" className="make-dots">
          <i className={madeNotes.length > 0 ? 'make-dot make-dot--on' : 'make-dot'} />
          <i className={madeNotes.length > 1 ? 'make-dot make-dot--on' : 'make-dot'} />
          <i className={madeNotes.length > 2 ? 'make-dot make-dot--on' : 'make-dot'} />
          <i className={madeNotes.length > 3 ? 'make-dot make-dot--on' : 'make-dot'} />
        </div>
        <div className="mission-actions">
          <button ref={actionRef} className={state === 'playing' ? 'button button--stop' : 'button button--primary'} data-child-copy-id={`${state}.action`} disabled={state === 'more' && (busy || madeNotes.length < MIN_CHILD_MADE_NOTES)} type="button" onClick={runAction}>
            {copy.action}
          </button>
          <button className="button button--soft" data-child-copy-id={`${state}.exit`} type="button" onClick={runBack}>
            {copy.exit}
          </button>
        </div>
      </section>
    </main>
  );
}
