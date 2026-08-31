import { centsBetween, nearestRecorderNote, RECORDER_NOTES, type NoteName } from './recorder.ts';

export interface PitchOptions {
  minimumFrequency?: number;
  maximumFrequency?: number;
  minimumRms?: number;
  yinThreshold?: number;
  minimumConfidence?: number;
}

export type PitchAnalysis =
  | { kind: 'quiet'; rms: number; confidence: 0 }
  | { kind: 'uncertain'; rms: number; confidence: number }
  | { kind: 'pitched'; rms: number; confidence: number; frequency: number };

export type PitchAssessment =
  | { kind: 'quiet' | 'uncertain'; expected: NoteName; confidence: number; rms: number }
  | { kind: 'matched' | 'near' | 'different'; expected: NoteName; heard: NoteName; cents: number; confidence: number; rms: number };

const DEFAULTS: Required<PitchOptions> = {
  minimumFrequency: 480,
  maximumFrequency: 1120,
  minimumRms: 0.012,
  yinThreshold: 0.16,
  minimumConfidence: 0.78,
};

function rootMeanSquare(samples: Float32Array): number {
  let energy = 0;
  for (const sample of samples) energy += sample * sample;
  return Math.sqrt(energy / samples.length);
}

function parabolicLag(values: Float64Array, lag: number): number {
  if (lag <= 1 || lag >= values.length - 1) return lag;
  const left = values[lag - 1];
  const centre = values[lag];
  const right = values[lag + 1];
  const denominator = 2 * (2 * centre - right - left);
  if (Math.abs(denominator) < Number.EPSILON) return lag;
  return lag + (right - left) / denominator;
}

export function analysePitch(samples: Float32Array, sampleRate: number, options: PitchOptions = {}): PitchAnalysis {
  if (!(samples instanceof Float32Array) || samples.length < 256) throw new Error('pitch analysis needs at least 256 float samples');
  if (!Number.isFinite(sampleRate) || sampleRate <= 0) throw new Error('sample rate must be positive');
  const settings = { ...DEFAULTS, ...options };
  if (settings.minimumFrequency <= 0 || settings.maximumFrequency <= settings.minimumFrequency) {
    throw new Error('pitch frequency bounds are invalid');
  }

  const rms = rootMeanSquare(samples);
  if (rms < settings.minimumRms) return { kind: 'quiet', rms, confidence: 0 };

  const minimumLag = Math.max(2, Math.floor(sampleRate / settings.maximumFrequency));
  const maximumLag = Math.min(Math.ceil(sampleRate / settings.minimumFrequency), Math.floor(samples.length / 2));
  if (minimumLag >= maximumLag) throw new Error('sample buffer is too short for the requested pitch range');

  const windowLength = samples.length - maximumLag;
  const difference = new Float64Array(maximumLag + 1);
  for (let lag = 1; lag <= maximumLag; lag += 1) {
    let sum = 0;
    for (let index = 0; index < windowLength; index += 1) {
      const delta = samples[index] - samples[index + lag];
      sum += delta * delta;
    }
    difference[lag] = sum;
  }

  const normalised = new Float64Array(maximumLag + 1);
  normalised[0] = 1;
  let runningSum = 0;
  for (let lag = 1; lag <= maximumLag; lag += 1) {
    runningSum += difference[lag];
    normalised[lag] = runningSum === 0 ? 1 : (difference[lag] * lag) / runningSum;
  }

  let selectedLag = -1;
  for (let lag = minimumLag; lag <= maximumLag; lag += 1) {
    if (normalised[lag] >= settings.yinThreshold) continue;
    selectedLag = lag;
    while (selectedLag + 1 <= maximumLag && normalised[selectedLag + 1] < normalised[selectedLag]) selectedLag += 1;
    break;
  }
  if (selectedLag === -1) {
    for (let lag = minimumLag; lag <= maximumLag; lag += 1) {
      if (selectedLag === -1 || normalised[lag] < normalised[selectedLag]) selectedLag = lag;
    }
  }

  const confidence = Math.max(0, Math.min(1, 1 - normalised[selectedLag]));
  if (confidence < settings.minimumConfidence) return { kind: 'uncertain', rms, confidence };
  const refinedLag = parabolicLag(normalised, selectedLag);
  const frequency = sampleRate / refinedLag;
  if (!Number.isFinite(frequency) || frequency < settings.minimumFrequency || frequency > settings.maximumFrequency) {
    return { kind: 'uncertain', rms, confidence };
  }
  return { kind: 'pitched', rms, confidence, frequency };
}

export function assessPitch(analysis: PitchAnalysis, expected: NoteName, toleranceCents: number): PitchAssessment {
  if (!Number.isFinite(toleranceCents) || toleranceCents <= 0 || toleranceCents > 150) {
    throw new Error('pitch tolerance must be between 0 and 150 cents');
  }
  if (analysis.kind !== 'pitched') {
    return { kind: analysis.kind, expected, confidence: analysis.confidence, rms: analysis.rms };
  }
  const nearest = nearestRecorderNote(analysis.frequency);
  const cents = centsBetween(analysis.frequency, RECORDER_NOTES[expected].frequency);
  const distance = Math.abs(cents);
  let kind: 'matched' | 'near' | 'different' = 'different';
  if (nearest.name === expected && distance <= toleranceCents) kind = 'matched';
  else if (nearest.name === expected && distance <= Math.min(150, toleranceCents + 45)) kind = 'near';
  return { kind, expected, heard: nearest.name, cents, confidence: analysis.confidence, rms: analysis.rms };
}
