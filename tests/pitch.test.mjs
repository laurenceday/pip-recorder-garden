import assert from 'node:assert/strict';
import test from 'node:test';
import { advanceSequence, createSequenceState, sequenceProgress } from '../src/lib/lesson-state.ts';
import { analysePitch, assessPitch } from '../src/lib/pitch.ts';
import { centsBetween, nearestRecorderNote, NOTE_NAMES, RECORDER_NOTES } from '../src/lib/recorder.ts';

const SAMPLE_RATE = 48_000;
const SAMPLE_COUNT = 4096;

function sine(frequency, amplitude = 0.25, harmonics = []) {
  const samples = new Float32Array(SAMPLE_COUNT);
  for (let index = 0; index < samples.length; index += 1) {
    const time = index / SAMPLE_RATE;
    let value = amplitude * Math.sin(2 * Math.PI * frequency * time + 0.37);
    for (const [multiple, strength] of harmonics) {
      value += amplitude * strength * Math.sin(2 * Math.PI * frequency * multiple * time + 0.13 * multiple);
    }
    samples[index] = value;
  }
  return samples;
}

function seededNoise(amplitude = 0.18) {
  let seed = 0x5eed1234;
  const samples = new Float32Array(SAMPLE_COUNT);
  for (let index = 0; index < samples.length; index += 1) {
    seed = (1664525 * seed + 1013904223) >>> 0;
    samples[index] = (((seed / 0xffffffff) * 2) - 1) * amplitude;
  }
  return samples;
}

test('the C recorder model contains the exact Baroque natural-octave fingerings', () => {
  assert.deepEqual(NOTE_NAMES, ['C5', 'D5', 'E5', 'F5', 'G5', 'A5', 'B5', 'C6']);
  assert.deepEqual(RECORDER_NOTES.C5.coveredHoles, [0, 1, 2, 3, 4, 5, 6, 7]);
  assert.deepEqual(RECORDER_NOTES.F5.coveredHoles, [0, 1, 2, 3, 4, 6, 7]);
  assert.deepEqual(RECORDER_NOTES.B5.coveredHoles, [0, 1]);
  assert.deepEqual(RECORDER_NOTES.C6.coveredHoles, [0, 2]);
});

test('frequency helpers identify notes and signed cents', () => {
  assert.equal(nearestRecorderNote(880).name, 'A5');
  assert.ok(Math.abs(centsBetween(440, 880) + 1200) < 0.0001);
  assert.throws(() => centsBetween(0, 880), /positive finite/);
});

for (const name of NOTE_NAMES) {
  test(`YIN-style analysis finds a synthetic ${name}`, () => {
    const note = RECORDER_NOTES[name];
    const analysis = analysePitch(sine(note.frequency, 0.22, [[2, 0.18], [3, 0.08]]), SAMPLE_RATE);
    assert.equal(analysis.kind, 'pitched');
    assert.ok(analysis.confidence > 0.9);
    assert.ok(Math.abs(centsBetween(analysis.frequency, note.frequency)) < 4);
  });
}

test('analysis separates silence and unpitched noise from a confident note', () => {
  assert.equal(analysePitch(new Float32Array(SAMPLE_COUNT), SAMPLE_RATE).kind, 'quiet');
  assert.equal(analysePitch(seededNoise(), SAMPLE_RATE).kind, 'uncertain');
});

test('assessment never accepts an adjacent note merely because tolerance is generous', () => {
  const exactHighC = { kind: 'pitched', frequency: RECORDER_NOTES.C6.frequency, confidence: 0.99, rms: 0.2 };
  assert.equal(assessPitch(exactHighC, 'B5', 120).kind, 'different');
  assert.equal(assessPitch(exactHighC, 'C6', 120).kind, 'matched');
});

test('sequence state requires stable sound and a release between repeated notes', () => {
  const pattern = [{ note: 'B5', beats: 1 }, { note: 'B5', beats: 1 }];
  let state = createSequenceState();
  for (const atMs of [0, 100, 200, 300, 400]) {
    state = advanceSequence(state, { atMs, kind: 'matched', heard: 'B5' }, pattern, 400);
  }
  assert.equal(state.index, 1);
  assert.equal(state.awaitingRelease, true);
  state = advanceSequence(state, { atMs: 500, kind: 'matched', heard: 'B5' }, pattern, 400);
  assert.equal(state.awaitingRelease, true);
  state = advanceSequence(state, { atMs: 550, kind: 'quiet' }, pattern, 400);
  state = advanceSequence(state, { atMs: 650, kind: 'quiet' }, pattern, 400);
  assert.equal(state.awaitingRelease, false);
  for (const atMs of [750, 850, 950, 1050, 1150]) {
    state = advanceSequence(state, { atMs, kind: 'matched', heard: 'B5' }, pattern, 400);
  }
  assert.equal(state.completed, true);
  assert.equal(sequenceProgress(state, pattern.length, 400), 1);
});

test('sequence state resets a partial hold after uncertainty or a suspended-tab gap', () => {
  const pattern = [{ note: 'A5', beats: 1 }];
  let state = createSequenceState();
  state = advanceSequence(state, { atMs: 0, kind: 'matched', heard: 'A5' }, pattern, 300);
  state = advanceSequence(state, { atMs: 150, kind: 'matched', heard: 'A5' }, pattern, 300);
  assert.ok(state.heldMs > 0);
  state = advanceSequence(state, { atMs: 200, kind: 'uncertain' }, pattern, 300);
  assert.equal(state.heldMs, 0);
  state = advanceSequence(state, { atMs: 1000, kind: 'matched', heard: 'A5' }, pattern, 300);
  assert.equal(state.heldMs, 0);
});

