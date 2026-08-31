import { RECORDER_NOTES, type NoteName } from '../lib/recorder.ts';

interface FingeringDiagramProps {
  note: NoteName;
  compact?: boolean;
}

export function FingeringDiagram({ note, compact = false }: FingeringDiagramProps) {
  const fingering = RECORDER_NOTES[note];
  const covered = new Set(fingering.coveredHoles);
  const holeClass = (hole: number) => covered.has(hole) ? 'recorder-hole recorder-hole--covered' : 'recorder-hole';

  return (
    <figure className={`fingering ${compact ? 'fingering--compact' : ''}`} aria-label={`${fingering.label} fingering. ${fingering.fingeringText}`}>
      <svg viewBox="0 0 220 420" aria-hidden="true">
        <path className="recorder-body" d="M80 20h60l-6 48-8 17v260l12 46H82l12-46V85l-8-17z" />
        <path className="recorder-window" d="M96 40h28l-3 24H99z" />
        <text className="hole-number thumb-number" x="35" y="113">T</text>
        <circle className={holeClass(0)} cx="57" cy="106" r="12" />
        {[1, 2, 3, 4, 5].map((hole) => {
          const y = 112 + (hole - 1) * 42;
          return (
            <g key={hole}>
              <text className="hole-number" x="72" y={y + 5}>{hole}</text>
              <circle className={holeClass(hole)} cx="110" cy={y} r="12" />
            </g>
          );
        })}
        {[6, 7].map((hole) => {
          const y = 322 + (hole - 6) * 42;
          return (
            <g key={hole}>
              <text className="hole-number" x="72" y={y + 5}>{hole}</text>
              <circle className={holeClass(hole)} cx="102" cy={y} r="8" />
              <circle className={holeClass(hole)} cx="120" cy={y} r="8" />
            </g>
          );
        })}
      </svg>
      <figcaption>
        <strong>{fingering.label}</strong>
        <span>{fingering.fingeringText}</span>
        <small><i className="hole-key hole-key--covered" /> covered <i className="hole-key" /> open</small>
      </figcaption>
    </figure>
  );
}
