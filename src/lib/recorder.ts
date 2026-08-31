export const NOTE_NAMES = ['C5', 'D5', 'E5', 'F5', 'G5', 'A5', 'B5', 'C6'] as const;

export type NoteName = (typeof NOTE_NAMES)[number];

export interface RecorderNote {
  name: NoteName;
  label: string;
  frequency: number;
  coveredHoles: readonly number[];
  fingeringText: string;
}

const NOTES: readonly RecorderNote[] = [
  { name: 'C5', label: 'low C', frequency: 523.2511, coveredHoles: [0, 1, 2, 3, 4, 5, 6, 7], fingeringText: 'Thumb and holes 1 to 7 covered.' },
  { name: 'D5', label: 'D', frequency: 587.3295, coveredHoles: [0, 1, 2, 3, 4, 5, 6], fingeringText: 'Thumb and holes 1 to 6 covered; hole 7 open.' },
  { name: 'E5', label: 'E', frequency: 659.2551, coveredHoles: [0, 1, 2, 3, 4, 5], fingeringText: 'Thumb and holes 1 to 5 covered; holes 6 and 7 open.' },
  { name: 'F5', label: 'Baroque F', frequency: 698.4565, coveredHoles: [0, 1, 2, 3, 4, 6, 7], fingeringText: 'Thumb and holes 1, 2, 3, 4, 6 and 7 covered; hole 5 open.' },
  { name: 'G5', label: 'G', frequency: 783.9909, coveredHoles: [0, 1, 2, 3], fingeringText: 'Thumb and holes 1, 2 and 3 covered.' },
  { name: 'A5', label: 'A', frequency: 880, coveredHoles: [0, 1, 2], fingeringText: 'Thumb and holes 1 and 2 covered.' },
  { name: 'B5', label: 'B', frequency: 987.7666, coveredHoles: [0, 1], fingeringText: 'Thumb and hole 1 covered.' },
  { name: 'C6', label: 'high C', frequency: 1046.5023, coveredHoles: [0, 2], fingeringText: 'Thumb and hole 2 covered; hole 1 open.' },
] as const;

export const RECORDER_NOTES: Readonly<Record<NoteName, RecorderNote>> = Object.freeze(
  Object.fromEntries(NOTES.map((note) => [note.name, Object.freeze(note)])) as Record<NoteName, RecorderNote>,
);

export function centsBetween(frequency: number, targetFrequency: number): number {
  if (!Number.isFinite(frequency) || !Number.isFinite(targetFrequency) || frequency <= 0 || targetFrequency <= 0) {
    throw new Error('frequencies must be positive finite numbers');
  }
  return 1200 * Math.log2(frequency / targetFrequency);
}

export function nearestRecorderNote(frequency: number): RecorderNote {
  if (!Number.isFinite(frequency) || frequency <= 0) throw new Error('frequency must be a positive finite number');
  return NOTES.reduce((nearest, candidate) => (
    Math.abs(centsBetween(frequency, candidate.frequency)) < Math.abs(centsBetween(frequency, nearest.frequency))
      ? candidate
      : nearest
  ));
}

