import { mkdir, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { run } from 'node:test';

const outputPath = path.resolve(process.argv[2] || '.elenchus/node-test.json');
const testDirectory = path.resolve('tests');
const testFiles = (await readdir(testDirectory))
  .filter((name) => name.endsWith('.test.mjs'))
  .sort()
  .map((name) => path.join('tests', name));

const counts = {
  executed: 0,
  assertionFailures: 0,
  errors: 0,
  skipped: 0,
};
const stream = run({
  files: testFiles,
  isolation: 'none',
});
stream.on('test:pass', (data) => {
  if (data.skip || data.todo) counts.skipped += 1;
  else counts.executed += 1;
});
stream.on('test:fail', (data) => {
  counts.executed += 1;
  const wrapped = data.details?.error;
  const cause = wrapped?.cause ?? wrapped;
  if (cause?.code === 'ERR_ASSERTION' || cause?.name === 'AssertionError') {
    counts.assertionFailures += 1;
  } else {
    counts.errors += 1;
  }
});
const finished = new Promise((resolve, reject) => {
  stream.on('end', resolve);
  stream.on('error', reject);
});
stream.resume();
await finished;

const report = {
  schema: 'elenchus.node-test.v1',
  complete: true,
  ...counts,
};
await mkdir(path.dirname(outputPath), { recursive: true });
await writeFile(outputPath, `${JSON.stringify(report, null, 2)}\n`, { flag: 'w', mode: 0o600 });
console.log(`node test report: ${outputPath}`);
process.exitCode = counts.assertionFailures + counts.errors > 0 ? 1 : 0;
