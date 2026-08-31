import type { NoteName } from './recorder.ts';

export interface PatternStep {
  note: NoteName;
  beats: number;
}

export interface SequenceObservation {
  atMs: number;
  kind: 'quiet' | 'uncertain' | 'matched' | 'near' | 'different';
  heard?: NoteName;
}

export interface SequenceState {
  index: number;
  heldMs: number;
  releaseMs: number;
  awaitingRelease: boolean;
  completed: boolean;
  lastAtMs: number | null;
}

export function createSequenceState(): SequenceState {
  return {
    index: 0,
    heldMs: 0,
    releaseMs: 0,
    awaitingRelease: false,
    completed: false,
    lastAtMs: null,
  };
}

export function advanceSequence(
  state: SequenceState,
  observation: SequenceObservation,
  pattern: readonly PatternStep[],
  requiredHoldMs: number,
  requiredReleaseMs = 90,
): SequenceState {
  if (pattern.length === 0) throw new Error('a lesson pattern cannot be empty');
  if (!Number.isFinite(observation.atMs) || observation.atMs < 0) throw new Error('observation time must be non-negative');
  if (!Number.isFinite(requiredHoldMs) || requiredHoldMs < 100) throw new Error('required hold must be at least 100 ms');
  if (!Number.isFinite(requiredReleaseMs) || requiredReleaseMs < 40) throw new Error('required release must be at least 40 ms');
  if (state.completed) return state;

  const elapsed = state.lastAtMs === null ? 0 : observation.atMs - state.lastAtMs;
  if (elapsed < 0) throw new Error('observation times must not go backwards');
  const contiguousElapsed = elapsed <= 250 ? elapsed : 0;
  const target = pattern[state.index].note;
  const matchesTarget = observation.kind === 'matched' && observation.heard === target;

  if (state.awaitingRelease) {
    const releaseMs = matchesTarget ? 0 : state.releaseMs + contiguousElapsed;
    if (releaseMs < requiredReleaseMs) {
      return { ...state, heldMs: 0, releaseMs, lastAtMs: observation.atMs };
    }
    return { ...state, heldMs: 0, releaseMs, awaitingRelease: false, lastAtMs: observation.atMs };
  }

  const heldMs = matchesTarget ? state.heldMs + contiguousElapsed : 0;
  if (heldMs < requiredHoldMs) {
    return { ...state, heldMs, releaseMs: 0, lastAtMs: observation.atMs };
  }

  if (state.index === pattern.length - 1) {
    return { ...state, heldMs: requiredHoldMs, completed: true, lastAtMs: observation.atMs };
  }

  const nextIndex = state.index + 1;
  return {
    index: nextIndex,
    heldMs: 0,
    releaseMs: 0,
    awaitingRelease: pattern[nextIndex].note === target,
    completed: false,
    lastAtMs: observation.atMs,
  };
}

export function sequenceProgress(state: SequenceState, patternLength: number, requiredHoldMs: number): number {
  if (patternLength <= 0 || requiredHoldMs <= 0) return 0;
  if (state.completed) return 1;
  const partial = Math.max(0, Math.min(1, state.heldMs / requiredHoldMs));
  return Math.max(0, Math.min(1, (state.index + partial) / patternLength));
}
