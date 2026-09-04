import type { LessonPatternStep } from '../types.ts';
import { NOTE_NAMES, type NoteName } from './recorder.ts';

export const GUIDE_BEAT_MS = 560;
export const GUIDE_GAP_MS = 70;
export const GUIDE_START_DELAY_MS = 40;
export const MIN_MADE_PATTERN_NOTES = 2;
export const MAX_MADE_PATTERN_NOTES = 4;

export type ChildPlayMode = 'sound' | 'quiet';
export type ChildTurnPhase = 'ready' | 'playing' | 'tap' | 'done' | 'more' | 'error';
export type ChildTurnCommand = 'none' | 'play-model' | 'stop-model' | 'leave';

export interface ChildTurnState {
  mode: ChildPlayMode;
  phase: ChildTurnPhase;
  tapIndex: number;
}

export interface ChildTurnTransition {
  state: ChildTurnState;
  command: ChildTurnCommand;
}

function assertChildTurn(state: ChildTurnState, noteCount: number): void {
  if (!['sound', 'quiet'].includes(state.mode)) throw new Error('unknown child play mode');
  if (!['ready', 'playing', 'tap', 'done', 'more', 'error'].includes(state.phase)) throw new Error('unknown child turn phase');
  if (!Number.isInteger(noteCount) || noteCount < 1 || noteCount > 32) throw new Error('child turn note count must be between 1 and 32');
  if (!Number.isInteger(state.tapIndex) || state.tapIndex < 0 || state.tapIndex > noteCount) throw new Error('child tap index is outside the turn');
}

export function startChildTurn(mode: ChildPlayMode): ChildTurnState {
  if (!['sound', 'quiet'].includes(mode)) throw new Error('unknown child play mode');
  return { mode, phase: mode === 'quiet' ? 'tap' : 'ready', tapIndex: 0 };
}

export function actOnChildTurn(state: ChildTurnState, noteCount: number): ChildTurnTransition {
  assertChildTurn(state, noteCount);
  if (state.phase === 'ready' || state.phase === 'error') {
    return { state: { ...state, phase: 'playing' }, command: 'play-model' };
  }
  if (state.phase === 'playing') {
    return { state: { ...state, phase: 'ready' }, command: 'stop-model' };
  }
  if (state.phase === 'tap') {
    const tapIndex = Math.min(noteCount, state.tapIndex + 1);
    return { state: { ...state, phase: tapIndex === noteCount ? 'done' : 'tap', tapIndex }, command: 'none' };
  }
  if (state.phase === 'done') return { state: { ...state, phase: 'more' }, command: 'none' };
  return { state, command: 'leave' };
}

export function finishChildModel(state: ChildTurnState, noteCount: number): ChildTurnState {
  assertChildTurn(state, noteCount);
  if (state.phase !== 'playing' || state.mode !== 'sound') throw new Error('only a playing sound turn can finish its model');
  return { ...state, phase: 'tap', tapIndex: 0 };
}

export function failChildModel(state: ChildTurnState, noteCount: number): ChildTurnState {
  assertChildTurn(state, noteCount);
  if (state.phase !== 'playing' || state.mode !== 'sound') throw new Error('only a playing sound turn can fail its model');
  return { ...state, phase: 'error', tapIndex: 0 };
}

export function exitChildTurn(state: ChildTurnState, noteCount: number): ChildTurnTransition {
  assertChildTurn(state, noteCount);
  if (state.phase === 'more') return { state: { ...state, phase: 'done' }, command: 'none' };
  return { state, command: 'leave' };
}

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
