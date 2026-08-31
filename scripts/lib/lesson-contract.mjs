import { lstat, readFile, readdir, realpath } from 'node:fs/promises';
import path from 'node:path';

export const NOTE_IDS = Object.freeze(['C5', 'D5', 'E5', 'F5', 'G5', 'A5', 'B5', 'C6']);
export const CHAPTERS = Object.freeze(['First sounds', 'Finger steps', 'Echoes', 'Little tunes', 'Explore']);
export const KINDS = Object.freeze(['hold', 'sequence', 'explore']);
export const ACCENTS = Object.freeze(['marigold', 'periwinkle', 'rose', 'sky', 'leaf']);
export const BEATS = Object.freeze([0.5, 1, 2, 4]);

export const LESSON_KEYS = Object.freeze([
  'schemaVersion',
  'id',
  'sourceIdeaId',
  'order',
  'title',
  'shortTitle',
  'chapter',
  'kind',
  'difficulty',
  'story',
  'childCue',
  'adultCue',
  'successCue',
  'pattern',
  'stableMs',
  'toleranceCents',
  'tips',
  'accent',
]);

const ID = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const IDEA_ID = /^idea-[0-9]{3}$/;
const UNSAFE_TEXT = /[<>`]|https?:\/\/|www\./i;

function isRecord(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function boundedString(value, minimum, maximum) {
  return typeof value === 'string' && value.length >= minimum && value.length <= maximum;
}

function safeBoundedString(value, minimum, maximum) {
  return boundedString(value, minimum, maximum)
    && !UNSAFE_TEXT.test(value)
    && ![...value].some((character) => character.codePointAt(0) < 32);
}

function integerBetween(value, minimum, maximum) {
  return Number.isInteger(value) && value >= minimum && value <= maximum;
}

export function validateLesson(value, label = 'lesson') {
  const errors = [];
  if (!isRecord(value)) {
    return [`${label} must be one object`];
  }

  const keys = Object.keys(value).sort();
  const expected = [...LESSON_KEYS].sort();
  if (keys.join('\0') !== expected.join('\0')) {
    const missing = expected.filter((key) => !keys.includes(key));
    const extra = keys.filter((key) => !expected.includes(key));
    if (missing.length) errors.push(`${label} is missing: ${missing.join(', ')}`);
    if (extra.length) errors.push(`${label} has unsupported fields: ${extra.join(', ')}`);
  }

  if (value.schemaVersion !== 1) errors.push(`${label}.schemaVersion must equal 1`);
  if (!boundedString(value.id, 3, 48) || !ID.test(value.id)) errors.push(`${label}.id must be kebab-case and 3 to 48 characters`);
  if (typeof value.sourceIdeaId !== 'string' || !IDEA_ID.test(value.sourceIdeaId)) errors.push(`${label}.sourceIdeaId must match idea-NNN`);
  if (!integerBetween(value.order, 1, 999)) errors.push(`${label}.order must be an integer from 1 to 999`);
  if (!safeBoundedString(value.title, 3, 56)) errors.push(`${label}.title must be safe plain text of 3 to 56 characters`);
  if (!safeBoundedString(value.shortTitle, 1, 22)) errors.push(`${label}.shortTitle must be safe plain text of 1 to 22 characters`);
  if (!CHAPTERS.includes(value.chapter)) errors.push(`${label}.chapter is unsupported`);
  if (!KINDS.includes(value.kind)) errors.push(`${label}.kind is unsupported`);
  if (!integerBetween(value.difficulty, 1, 5)) errors.push(`${label}.difficulty must be an integer from 1 to 5`);
  if (!safeBoundedString(value.story, 12, 180)) errors.push(`${label}.story must be safe plain text of 12 to 180 characters`);
  if (!safeBoundedString(value.childCue, 5, 130)) errors.push(`${label}.childCue must be safe plain text of 5 to 130 characters`);
  if (!safeBoundedString(value.adultCue, 8, 220)) errors.push(`${label}.adultCue must be safe plain text of 8 to 220 characters`);
  if (!safeBoundedString(value.successCue, 3, 100)) errors.push(`${label}.successCue must be safe plain text of 3 to 100 characters`);

  if (!Array.isArray(value.pattern) || value.pattern.length < 1 || value.pattern.length > 16) {
    errors.push(`${label}.pattern must contain 1 to 16 notes`);
  } else {
    value.pattern.forEach((event, index) => {
      const eventLabel = `${label}.pattern[${index}]`;
      if (!isRecord(event) || Object.keys(event).sort().join(',') !== 'beats,note') {
        errors.push(`${eventLabel} must contain only note and beats`);
        return;
      }
      if (!NOTE_IDS.includes(event.note)) errors.push(`${eventLabel}.note is unsupported`);
      if (!BEATS.includes(event.beats)) errors.push(`${eventLabel}.beats is unsupported`);
    });
  }

  if (!integerBetween(value.stableMs, 350, 1500)) errors.push(`${label}.stableMs must be an integer from 350 to 1500`);
  if (!integerBetween(value.toleranceCents, 40, 150)) errors.push(`${label}.toleranceCents must be an integer from 40 to 150`);
  if (!Array.isArray(value.tips) || value.tips.length < 1 || value.tips.length > 3) {
    errors.push(`${label}.tips must contain 1 to 3 strings`);
  } else {
    value.tips.forEach((tip, index) => {
      if (!safeBoundedString(tip, 4, 110)) errors.push(`${label}.tips[${index}] must be safe plain text of 4 to 110 characters`);
    });
  }
  if (!ACCENTS.includes(value.accent)) errors.push(`${label}.accent is unsupported`);

  return errors;
}

export function validateCatalog(lessons, { minimumLessons = 12 } = {}) {
  const errors = [];
  if (!Array.isArray(lessons) || lessons.length < minimumLessons || lessons.length > 200) {
    return [`catalogue must contain ${minimumLessons} to 200 lessons`];
  }

  const seenIds = new Set();
  const seenIdeas = new Set();
  const seenOrders = new Set();
  let previousOrder = 0;
  let previousDifficulty = 0;

  lessons.forEach((lesson, index) => {
    errors.push(...validateLesson(lesson, `lessons[${index}]`));
    if (!isRecord(lesson)) return;
    if (seenIds.has(lesson.id)) errors.push(`duplicate lesson id: ${lesson.id}`);
    if (seenIdeas.has(lesson.sourceIdeaId)) errors.push(`duplicate source idea: ${lesson.sourceIdeaId}`);
    if (seenOrders.has(lesson.order)) errors.push(`duplicate lesson order: ${lesson.order}`);
    seenIds.add(lesson.id);
    seenIdeas.add(lesson.sourceIdeaId);
    seenOrders.add(lesson.order);
    if (typeof lesson.order === 'number' && lesson.order <= previousOrder) errors.push('lessons must be sorted by ascending order');
    if (typeof lesson.difficulty === 'number' && lesson.difficulty < previousDifficulty) errors.push('lesson difficulty must not decrease as order rises');
    previousOrder = lesson.order;
    previousDifficulty = lesson.difficulty;
  });

  return errors;
}

export function assertSchemaMatchesContract(schema) {
  const errors = [];
  if (!isRecord(schema) || schema.type !== 'object' || schema.additionalProperties !== false) {
    errors.push('schema must describe one closed object');
  }
  const required = Array.isArray(schema?.required) ? [...schema.required].sort() : [];
  const properties = isRecord(schema?.properties) ? Object.keys(schema.properties).sort() : [];
  const expected = [...LESSON_KEYS].sort();
  if (required.join('\0') !== expected.join('\0')) errors.push('schema required fields drift from the validator');
  if (properties.join('\0') !== expected.join('\0')) errors.push('schema properties drift from the validator');
  return errors;
}

export async function readJsonFileBounded(filePath, maximumBytes = 65_536) {
  const stat = await lstat(filePath);
  if (!stat.isFile() || stat.isSymbolicLink() || stat.size > maximumBytes) {
    throw new Error(`${filePath} must be one regular file no larger than ${maximumBytes} bytes`);
  }
  const bytes = await readFile(filePath);
  if (bytes.includes(0)) throw new Error(`${filePath} contains a NUL byte`);
  try {
    return JSON.parse(bytes.toString('utf8'));
  } catch (error) {
    throw new Error(`${filePath} is not valid JSON: ${error instanceof Error ? error.message : String(error)}`);
  }
}

export async function loadLessons(projectRoot) {
  const lessonRoot = path.join(projectRoot, 'content', 'lessons');
  const canonicalRoot = await realpath(lessonRoot);
  const entries = await readdir(canonicalRoot, { withFileTypes: true });
  const names = entries
    .filter((entry) => entry.name.endsWith('.json'))
    .map((entry) => {
      if (!entry.isFile() || entry.isSymbolicLink()) throw new Error(`${entry.name} is not a regular lesson file`);
      return entry.name;
    })
    .sort();
  if (names.length > 200) throw new Error('lesson directory exceeds the 200-file limit');

  const lessons = [];
  for (const name of names) {
    const filePath = path.join(canonicalRoot, name);
    const resolved = await realpath(filePath);
    if (path.dirname(resolved) !== canonicalRoot) throw new Error(`${name} escapes the lesson directory`);
    const lesson = await readJsonFileBounded(resolved);
    lessons.push(lesson);
  }
  lessons.sort((left, right) => left.order - right.order || left.id.localeCompare(right.id));
  return lessons;
}

export function serialiseCatalogue(lessons) {
  return `${JSON.stringify({ schemaVersion: 1, lessons }, null, 2)}\n`;
}
