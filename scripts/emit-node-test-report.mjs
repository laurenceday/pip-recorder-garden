import { createHash } from 'node:crypto';
import { mkdir, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const outputPath = path.resolve(process.argv[2] || '.elenchus/node-test.json');
const testDirectory = path.resolve('tests');
const testFiles = (await readdir(testDirectory))
  .filter((name) => name.endsWith('.test.mjs'))
  .sort()
  .map((name) => path.join('tests', name));

const args = ['--experimental-strip-types', '--test', '--test-reporter=tap', ...testFiles];
const result = spawnSync(process.execPath, args, {
  cwd: process.cwd(),
  encoding: 'utf8',
  maxBuffer: 5 * 1024 * 1024,
  timeout: 60_000,
});
const stdout = result.stdout || '';
const stderr = result.stderr || '';
process.stdout.write(stdout);
process.stderr.write(stderr);

function count(label) {
  const match = new RegExp(`^# ${label} ([0-9]+)$`, 'm').exec(stdout);
  return match ? Number(match[1]) : null;
}

const report = {
  schemaVersion: 1,
  command: [process.execPath, ...args],
  exitCode: result.status,
  signal: result.signal,
  tests: count('tests'),
  passed: count('pass'),
  failed: count('fail'),
  skipped: count('skipped'),
  stdoutSha256: createHash('sha256').update(stdout).digest('hex'),
  stderrSha256: createHash('sha256').update(stderr).digest('hex'),
};
await mkdir(path.dirname(outputPath), { recursive: true });
await writeFile(outputPath, `${JSON.stringify(report, null, 2)}\n`, { flag: 'w', mode: 0o600 });
console.log(`node test report: ${outputPath}`);
if (result.error) throw result.error;
if (result.status !== 0) process.exit(result.status ?? 1);

