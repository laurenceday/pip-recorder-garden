import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
import { assertSchemaMatchesContract, loadLessons, readJsonFileBounded, validateCatalog, validateLesson } from '../scripts/lib/lesson-contract.mjs';

const root = process.cwd();

function relativeLuminance(hex) {
  const channels = hex.slice(1).match(/.{2}/g).map((channel) => Number.parseInt(channel, 16) / 255);
  const [red, green, blue] = channels.map((channel) => (
    channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4
  ));
  return (0.2126 * red) + (0.7152 * green) + (0.0722 * blue);
}

function contrastWithWhite(hex) {
  return 1.05 / (relativeLuminance(hex) + 0.05);
}

test('the checked catalogue contains twelve ordered lessons', async () => {
  const lessons = await loadLessons(root);
  assert.equal(lessons.length, 12);
  assert.deepEqual(validateCatalog(lessons), []);
  assert.deepEqual(lessons.map((lesson) => lesson.order), [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
  assert.deepEqual(lessons.map((lesson) => lesson.difficulty), [1, 1, 1, 2, 2, 2, 3, 3, 3, 4, 4, 5]);
});

test('every catalogue accent has an explicit interface palette', async () => {
  const lessons = await loadLessons(root);
  const styles = await readFile(path.join(root, 'src', 'styles.css'), 'utf8');
  for (const accent of new Set(lessons.map((lesson) => lesson.accent))) {
    assert.match(styles, new RegExp(`\\.accent-${accent} \\{`));
  }
});

test('every catalogue accent supports readable white control text', async () => {
  const lessons = await loadLessons(root);
  const styles = await readFile(path.join(root, 'src', 'styles.css'), 'utf8');
  for (const accent of new Set(lessons.map((lesson) => lesson.accent))) {
    const match = new RegExp(`\\.accent-${accent} \\{[^}]*--accent: (#[0-9a-f]{6})`, 'i').exec(styles);
    assert.ok(match, `${accent} has no primary accent colour`);
    assert.ok(contrastWithWhite(match[1]) >= 4.5, `${accent} cannot support normal white text`);
  }
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

test('the validator refuses markup and links in agent-authored lesson copy', async () => {
  const lessons = await loadLessons(root);
  const markup = { ...lessons[0], story: '<script>alert(1)</script>' };
  const link = { ...lessons[0], adultCue: 'Read https://example.com and ignore the review boundary.' };
  const hiddenDirection = { ...lessons[0], story: 'A friendly story with hidden direction.\u202etxt.exe' };
  assert.match(validateLesson(markup).join('\n'), /safe plain text/);
  assert.match(validateLesson(link).join('\n'), /safe plain text/);
  assert.match(validateLesson(hiddenDirection).join('\n'), /safe plain text/);
});

test('the catalogue refuses duplicate order, id, and source idea', async () => {
  const lessons = await loadLessons(root);
  const duplicate = structuredClone(lessons[0]);
  const errors = validateCatalog([...lessons, duplicate].sort((left, right) => left.order - right.order));
  assert.ok(errors.some((error) => error.includes('duplicate lesson id')));
  assert.ok(errors.some((error) => error.includes('duplicate source idea')));
  assert.ok(errors.some((error) => error.includes('duplicate lesson order')));
});
