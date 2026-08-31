import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { assertSchemaMatchesContract, loadLessons, readJsonFileBounded, serialiseCatalogue, validateCatalog } from './lib/lesson-contract.mjs';

const projectRoot = process.cwd();
const outputPath = path.join(projectRoot, 'src', 'generated', 'lessons.json');
const schemaPath = path.join(projectRoot, 'schema', 'lesson.schema.json');
const checkOnly = process.argv.includes('--check');

const schema = await readJsonFileBounded(schemaPath);
const lessons = await loadLessons(projectRoot);
const errors = [...assertSchemaMatchesContract(schema), ...validateCatalog(lessons)];
if (errors.length) {
  for (const error of errors) process.stderr.write(`catalogue: ${error}\n`);
  process.exit(1);
}

const next = serialiseCatalogue(lessons);
if (checkOnly) {
  let current = '';
  try {
    current = await readFile(outputPath, 'utf8');
  } catch {
    process.stderr.write('catalogue: generated file is missing; run npm run generate\n');
    process.exit(1);
  }
  if (current !== next) {
    process.stderr.write('catalogue: generated file is stale; run npm run generate\n');
    process.exit(1);
  }
  process.stdout.write(`catalogue clean: ${lessons.length} lessons\n`);
} else {
  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(outputPath, next, { encoding: 'utf8', mode: 0o644 });
  process.stdout.write(`catalogue generated: ${lessons.length} lessons\n`);
}
