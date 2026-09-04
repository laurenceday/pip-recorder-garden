import { useEffect, useRef } from 'react';
import { GardenMark } from './GardenMark.tsx';
import {
  childCopyFor,
  type ChildCopyState,
  type ChildNoteLetter,
} from '../lib/child-copy.ts';

interface ChildStageProps {
  state: ChildCopyState;
  notes: readonly ChildNoteLetter[];
  onAction: () => void;
  onBack: () => void;
}

export function ChildStage({ state, notes, onAction, onBack }: ChildStageProps) {
  const copy = childCopyFor(state);
  const actionRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    actionRef.current?.focus();
  }, []);

  return (
    <main className="child-stage" data-child-state={state} data-copy-role="child">
      <section className="model-card" aria-live="polite">
        <GardenMark />
        <h1 data-child-copy-id={`${state}.title`}>{copy.title}</h1>
        <div className="pattern-strip">
          {notes.map((note, index) => (
            <span className="note-stone" data-child-copy-id={`all.note.${note.toLowerCase()}`} key={`${note}-${index}`}>
              {note}
            </span>
          ))}
        </div>
        <div className="mission-actions">
          <button ref={actionRef} className={state === 'playing' ? 'button button--stop' : 'button button--primary'} data-child-copy-id={`${state}.action`} type="button" onClick={onAction}>
            {copy.action}
          </button>
          <button className="button button--soft" data-child-copy-id={`${state}.exit`} type="button" onClick={onBack}>
            {copy.exit}
          </button>
        </div>
      </section>
    </main>
  );
}
