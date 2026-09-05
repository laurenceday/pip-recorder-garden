import type { ReactNode } from 'react';

interface GrownUpSetupProps {
  children: ReactNode;
  onStart: () => void;
  onStartQuiet: () => void;
  summary: ChildSessionSummary | null;
}

export interface ChildSessionSummary {
  mode: 'sound' | 'quiet';
  taps: number;
  madeTunes: number;
  usedPipHelp: boolean;
}

export function GrownUpSetup({ children, onStart, onStartQuiet, summary }: GrownUpSetupProps) {
  return (
    <div data-copy-role="grown-up">
      <aside className="grown-up-launch" aria-labelledby="grown-up-launch-title">
        <div>
          <p className="eyebrow">Grown-up start</p>
          <h2 id="grown-up-launch-title">One small musical turn</h2>
          <p>Pip plays. Your child copies with taps, sees each finger move, then makes a tiny tune. There is no score and no wrong answer.</p>
        </div>
        <div className="grown-up-launch__actions">
          <button className="button button--primary" type="button" onClick={onStart}>Start with sound</button>
          <button className="button button--soft" type="button" onClick={onStartQuiet}>Start without sound</button>
        </div>
        <details>
          <summary>Before microphone play</summary>
          <ul>
            <li>Use a quiet room.</li>
            <li>Keep the recorder about an arm away.</li>
            <li>Ask for gentle air, never harder blowing for the app.</li>
          </ul>
        </details>
        {summary && (
          <div className="grown-up-recap" aria-live="polite">
            <strong>Last child turn</strong>
            <span>{summary.mode === 'sound' ? 'Sound' : 'Quiet'} · {summary.taps} taps · {summary.madeTunes} tiny tunes{summary.usedPipHelp ? ' · Pip helped' : ''}</span>
          </div>
        )}
      </aside>
      {children}
    </div>
  );
}
