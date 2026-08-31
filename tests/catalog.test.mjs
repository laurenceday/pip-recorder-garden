import assert from 'node:assert/strict';
import path from 'node:path';
import test from 'node:test';
import { assertSchemaMatchesContract, loadLessons, readJsonFileBounded, validateCatalog, validateLesson } from '../scripts/lib/lesson-contract.mjs';

const root = process.cwd();

test('the checked catalogue contains twelve ordered lessons', async () => {
  const lessons = await loadLessons(root);
  assert.equal(lessons.length, 12);
  assert.deepEqual(validateCatalog(lessons), []);
  assert.deepEqual(lessons.map((lesson) => lesson.order), [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
  assert.deepEqual(lessons.map((lesson) => lesson.difficulty), [1, 1, 1, 2, 2, 2, 3, 3, 3, 4, 4, 5]);
});

test('the JSON Schema and executable validator require the same fields', async () => {
  const schema = await readJsonFileBounded(path.join(root, 'schema', 'lesson.schema.json'));
  assert.deepEqual(assertSchemaMatchesContract(schema), []);
});

test('the validator refuses missing and additional lesson fields', async () => {
  const [lesson] = await loadLessons(root);
  const missing = structuredClone(lesson);
  delete missing.title;
  assert.match(validateLesson(missing).join('\n'), /missing: title/);
  const extra = { ...lesson, html: '<script>no</script>' };
  assert.match(validateLesson(extra).join('\n'), /unsupported fields: html/);
});

test('the catalogue refuses duplicate order, id, and source idea', async () => {
  const lessons = await loadLessons(root);
  const duplicate = structuredClone(lessons[0]);
  const errors = validateCatalog([...lessons, duplicate].sort((left, right) => left.order - right.order));
  assert.ok(errors.some((error) => error.includes('duplicate lesson id')));
  assert.ok(errors.some((error) => error.includes('duplicate source idea')));
  assert.ok(errors.some((error) => error.includes('duplicate lesson order')));
});
