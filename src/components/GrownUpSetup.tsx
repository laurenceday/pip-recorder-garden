import type { ReactNode } from 'react';

interface GrownUpSetupProps {
  children: ReactNode;
  onStart: () => void;
}

export function GrownUpSetup({ children, onStart }: GrownUpSetupProps) {
  return (
    <div data-copy-role="grown-up">
      <div className="mission-actions">
        <button className="button button--primary" type="button" onClick={onStart}>Start child play</button>
      </div>
      {children}
    </div>
  );
}
