import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
import * as childCopy from '../src/lib/child-copy.ts';
import * as missionLoop from '../src/lib/mission-loop.ts';

const root = process.cwd();

test('one sound action starts the model and its natural end opens the response', () => {
  const ready = missionLoop.startChildTurn('sound');
  assert.deepEqual(ready, { mode: 'sound', phase: 'ready', tapIndex: 0 });
  const model = missionLoop.actOnChildTurn(ready, 4);
  assert.deepEqual(model, {
    state: { mode: 'sound', phase: 'playing', tapIndex: 0 },
    command: 'play-model',
  });
  assert.deepEqual(missionLoop.finishChildModel(model.state, 4), {
    mode: 'sound', phase: 'tap', tapIndex: 0,
  });
});

test('the exact lesson 8 model is B A A B before four response taps', () => {
  const pattern = [
    { note: 'B5', beats: 1 },
    { note: 'A5', beats: 1 },
    { note: 'A5', beats: 1 },
    { note: 'B5', beats: 1 },
  ];
  assert.deepEqual(missionLoop.createPatternSchedule(pattern).map((event) => event.note), ['B5', 'A5', 'A5', 'B5']);
  let state = missionLoop.finishChildModel(missionLoop.actOnChildTurn(missionLoop.startChildTurn('sound'), 4).state, 4);
  const phases = [state.phase];
  for (let index = 0; index < 4; index += 1) {
    const transition = missionLoop.actOnChildTurn(state, 4);
    assert.equal(transition.command, 'none');
    state = transition.state;
    phases.push(state.phase);
  }
  assert.deepEqual(phases, ['tap', 'tap', 'tap', 'tap', 'done']);
});

test('quiet play reaches done without any audio command', () => {
  let state = missionLoop.startChildTurn('quiet');
  assert.equal(state.phase, 'tap');
  const commands = [];
  for (let index = 0; index < 3; index += 1) {
    const transition = missionLoop.actOnChildTurn(state, 3);
    commands.push(transition.command);
    state = transition.state;
  }
  assert.deepEqual(commands, ['none', 'none', 'none']);
  assert.equal(state.phase, 'done');
});

test('Done stops and More is bounded, optional and reversible', () => {
  const done = { mode: 'sound', phase: 'done', tapIndex: 4 };
  assert.deepEqual(missionLoop.exitChildTurn(done, 4), { state: done, command: 'leave' });
  const more = missionLoop.actOnChildTurn(done, 4);
  assert.deepEqual(more, {
    state: { mode: 'sound', phase: 'more', tapIndex: 4 },
    command: 'none',
  });
  assert.deepEqual(missionLoop.exitChildTurn(more.state, 4), { state: done, command: 'none' });
  assert.equal(missionLoop.actOnChildTurn(more.state, 4).command, 'leave');
});

test('every child screen has one learning action and one exit in the closed lexicon', () => {
  for (const state of childCopy.CHILD_COPY_STATE_IDS) {
    const copy = childCopy.childCopyFor(state);
    assert.deepEqual(Object.keys(copy), ['title', 'action', 'exit']);
    for (const value of Object.values(copy)) assert.deepEqual(childCopy.rejectedChildCopyTokens(value), []);
  }
});

test('the UI dispatches audio only for the sound-model command', async () => {
  const app = await readFile(path.join(root, 'src', 'App.tsx'), 'utf8');
  assert.match(app, /if \(transition\.command === 'play-model'\) void playChildModel\(\);/);
  assert.match(app, /if \(transition\.command === 'stop-model'\) tone\.stop\('stopped'\);/);
  assert.match(app, /onStartQuiet=\{\(\) => enterChildMode\('quiet'\)\}/);
  assert.equal((app.match(/tone\.playPattern\(/g) ?? []).length, 3);
});
