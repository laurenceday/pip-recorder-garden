import assert from 'node:assert/strict';
import test from 'node:test';
import { parseCompletedLessons, serialiseCompletedLessons } from '../src/lib/progress.ts';

const validIds = new Set(['meet-b', 'meet-a', 'meet-g']);

test('saved progress keeps only known lesson IDs and no child data', () => {
  const parsed = parseCompletedLessons(JSON.stringify(['meet-b', 'unknown', 'meet-b', 42, { name: 'child' }]), validIds);
  assert.deepEqual([...parsed], ['meet-b']);
  assert.equal(serialiseCompletedLessons(new Set(['meet-g', 'meet-b'])), '["meet-b","meet-g"]');
});

test('saved progress fails closed on malformed or oversized values', () => {
  assert.equal(parseCompletedLessons('{no', validIds).size, 0);
  assert.equal(parseCompletedLessons(JSON.stringify(Array.from({ length: 201 }, () => 'meet-b')), validIds).size, 0);
  assert.equal(parseCompletedLessons('x'.repeat(16_385), validIds).size, 0);
});

