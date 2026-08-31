import type { LessonPatternStep } from '../types.ts';
import { NOTE_NAMES, type NoteName } from './recorder.ts';

export const GUIDE_BEAT_MS = 560;
export const GUIDE_GAP_MS = 70;
export const GUIDE_START_DELAY_MS = 40;
export const MIN_MADE_PATTERN_NOTES = 2;
export const MAX_MADE_PATTERN_NOTES = 4;

export interface GuideEvent {
  index: number;
  note: NoteName;
  onsetMs: number;
  releaseMs: number;
  endMs: number;
}

export type GuideStopReason = 'idle' | 'playing' | 'finished' | 'stopped' | 'hidden' | 'lesson-change' | 'complete' | 'teardown';

export interface GuidePlaybackState {
  running: boolean;
  currentIndex: number | null;
  reason: GuideStopReason;
}

export interface RhythmResult {
  kind: 'waiting' | 'matched' | 'try-again';
  expectedTaps: number;
  receivedTaps: number;
  largestDifference: number | null;
}

function assertPattern(pattern: readonly LessonPatternStep[]): void {
  if (pattern.length === 0) throw new Error('a mission pattern cannot be empty');
  if (pattern.length > 32) throw new Error('a mission pattern cannot contain more than 32 notes');
  for (const step of pattern) {
    if (!NOTE_NAMES.includes(step.note)) throw new Error(`unsupported recorder note: ${String(step.note)}`);
    if (![0.5, 1, 2, 4].includes(step.beats)) throw new Error(`unsupported beat value: ${String(step.beats)}`);
  }
}

export function createPatternSchedule(
  pattern: readonly LessonPatternStep[],
  beatMs = GUIDE_BEAT_MS,
  gapMs = GUIDE_GAP_MS,
): GuideEvent[] {
  assertPattern(pattern);
  if (!Number.isFinite(beatMs) || beatMs < 180 || beatMs > 2_000) throw new Error('beat length must be between 180 and 2000 ms');
  if (!Number.isFinite(gapMs) || gapMs < 20 || gapMs > 180) throw new Error('note gap must be between 20 and 180 ms');

  let onsetMs = 0;
  return pattern.map((step, index) => {
    const durationMs = Math.round(step.beats * beatMs);
    const releaseGapMs = Math.min(gapMs, Math.max(20, Math.floor(durationMs * 0.35)));
    const event = {
      index,
      note: step.note,
      onsetMs,
      releaseMs: onsetMs + durationMs - releaseGapMs,
      endMs: onsetMs + durationMs,
    };
    onsetMs = event.endMs;
    return event;
  });
}

export function startGuidePlayback(currentIndex: number | null = 0): GuidePlaybackState {
  return { running: true, currentIndex, reason: 'playing' };
}

export function guidePlaybackAt(schedule: readonly GuideEvent[], elapsedMs: number): GuidePlaybackState {
  if (schedule.length === 0) throw new Error('a guide schedule cannot be empty');
  if (!Number.isFinite(elapsedMs) || elapsedMs < 0) throw new Error('elapsed time must be non-negative');
  const current = schedule.find((event) => elapsedMs >= event.onsetMs && elapsedMs < event.endMs);
  if (current) return { running: true, currentIndex: current.index, reason: 'playing' };
  if (elapsedMs >= schedule.at(-1)!.endMs) return { running: false, currentIndex: null, reason: 'finished' };
  return startGuidePlayback();
}

export function stopGuidePlayback(reason: Exclude<GuideStopReason, 'idle' | 'playing' | 'finished'> = 'stopped'): GuidePlaybackState {
  return { running: false, currentIndex: null, reason };
}

export function missionScrollBehavior(prefersReducedMotion: boolean): 'auto' | 'smooth' {
  return prefersReducedMotion ? 'auto' : 'smooth';
}

export function lessonPatternNotes(pattern: readonly LessonPatternStep[]): NoteName[] {
  assertPattern(pattern);
  return [...new Set(pattern.map((step) => step.note))];
}

export function addMadePatternNote(
  pattern: readonly NoteName[],
  note: NoteName,
  allowedNotes: readonly NoteName[],
): NoteName[] {
  if (!allowedNotes.includes(note)) throw new Error(`${note} is not available in this lesson`);
  if (pattern.length >= MAX_MADE_PATTERN_NOTES) return [...pattern];
  return [...pattern, note];
}

export function removeMadePatternNote(pattern: readonly NoteName[]): NoteName[] {
  return pattern.slice(0, -1);
}

export function madePatternIsReady(pattern: readonly NoteName[], allowedNotes: readonly NoteName[]): boolean {
  return pattern.length >= MIN_MADE_PATTERN_NOTES
    && pattern.length <= MAX_MADE_PATTERN_NOTES
    && pattern.every((note) => allowedNotes.includes(note));
}

export function notesToPattern(notes: readonly NoteName[], allowedNotes: readonly NoteName[]): LessonPatternStep[] {
  if (!madePatternIsReady(notes, allowedNotes)) throw new Error('a made pattern needs two to four lesson notes');
  return notes.map((note) => ({ note, beats: 1 }));
}

export function compareRhythm(
  pattern: readonly LessonPatternStep[],
  tapTimesMs: readonly number[],
  tolerance = 0.24,
): RhythmResult {
  assertPattern(pattern);
  if (!Number.isFinite(tolerance) || tolerance < 0.1 || tolerance > 0.5) throw new Error('rhythm tolerance must be between 0.1 and 0.5');
  if (tapTimesMs.some((time, index) => !Number.isFinite(time) || time < 0 || (index > 0 && time <= tapTimesMs[index - 1]))) {
    throw new Error('tap times must be finite, non-negative and increasing');
  }
  if (tapTimesMs.length < pattern.length) {
    return { kind: 'waiting', expectedTaps: pattern.length, receivedTaps: tapTimesMs.length, largestDifference: null };
  }
  if (tapTimesMs.length > pattern.length) throw new Error('too many taps for this pattern');
  if (pattern.length === 1) {
    return { kind: 'matched', expectedTaps: 1, receivedTaps: 1, largestDifference: 0 };
  }

  const expectedIntervals = pattern.slice(0, -1).map((step) => step.beats);
  const actualIntervals = tapTimesMs.slice(1).map((time, index) => time - tapTimesMs[index]);
  const expectedTotal = expectedIntervals.reduce((sum, value) => sum + value, 0);
  const actualTotal = actualIntervals.reduce((sum, value) => sum + value, 0);
  const differences = expectedIntervals.map((interval, index) => (
    Math.abs((interval / expectedTotal) - (actualIntervals[index] / actualTotal))
  ));
  const largestDifference = Math.max(...differences);
  return {
    kind: largestDifference <= tolerance ? 'matched' : 'try-again',
    expectedTaps: pattern.length,
    receivedTaps: tapTimesMs.length,
    largestDifference,
  };
}
