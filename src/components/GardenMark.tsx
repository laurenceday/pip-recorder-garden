interface GardenMarkProps {
  growth?: number;
}

export function GardenMark({ growth = 0 }: GardenMarkProps) {
  const growthStage = Math.max(0, Math.min(5, Math.round(growth)));
  return (
    <svg className={`garden-mark garden-mark--${growthStage}`} viewBox="0 0 92 92" aria-hidden="true">
      <circle cx="46" cy="46" r="44" fill="#fff8e8" />
      <path d="M26 54c0-18 11-30 27-30 12 0 21 9 21 21 0 14-10 27-28 27-11 0-20-7-20-18z" fill="#485a8f" />
      <ellipse cx="46" cy="55" rx="16" ry="18" fill="#e96d52" />
      <circle cx="58" cy="38" r="3.5" fill="#242635" />
      <path d="m72 43 12 5-12 5z" fill="#e3a12b" />
      <path d="M28 31 16 22m11 15L13 34" stroke="#485a8f" strokeWidth="6" strokeLinecap="round" />
      <path d="m29 66-9 14m30-10 1 12" stroke="#74452e" strokeWidth="4" strokeLinecap="round" />
      <path d="m20 62 50-15" stroke="#c69a61" strokeWidth="6" strokeLinecap="round" />
      <circle cx="31" cy="59" r="2" fill="#4b3627" />
      <circle cx="42" cy="56" r="2" fill="#4b3627" />
      <circle cx="53" cy="53" r="2" fill="#4b3627" />
      <g className="garden-growth">
        <path className="garden-sprout garden-sprout--1" d="M18 69c0-10 2-16 7-22M24 52c-7-1-10-5-11-10 7 0 11 3 12 8M24 57c6-3 11-2 14 1-5 5-10 5-14 2" fill="none" stroke="#4f8f55" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        <path className="garden-sprout garden-sprout--2" d="M72 72c0-9-2-15-6-21M67 56c7-1 10-5 11-9-7 0-11 3-12 8" fill="none" stroke="#4f8f55" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        <g className="garden-flower">
          <circle cx="72" cy="43" r="4" fill="#e3a12b" />
          <circle cx="67" cy="40" r="4" fill="#ee8db0" />
          <circle cx="77" cy="40" r="4" fill="#ee8db0" />
          <circle cx="69" cy="47" r="4" fill="#ee8db0" />
          <circle cx="75" cy="47" r="4" fill="#ee8db0" />
        </g>
      </g>
    </svg>
  );
}
