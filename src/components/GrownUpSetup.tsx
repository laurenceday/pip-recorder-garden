import type { ReactNode } from 'react';

interface GrownUpSetupProps {
  children: ReactNode;
  onStart: () => void;
  onStartQuiet: () => void;
}

export function GrownUpSetup({ children, onStart, onStartQuiet }: GrownUpSetupProps) {
  return (
    <div data-copy-role="grown-up">
      <div className="mission-actions">
        <button className="button button--primary" type="button" onClick={onStart}>Start child play</button>
        <button className="button button--soft" type="button" onClick={onStartQuiet}>Start quiet child play</button>
      </div>
      {children}
    </div>
  );
}
