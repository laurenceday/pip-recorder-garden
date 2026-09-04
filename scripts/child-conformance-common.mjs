import { createHash, randomUUID } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { lstat, mkdir, readFile, rename, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';

const MAX_INPUT_FILE_BYTES = 2_000_000;
const MAX_REPORT_BYTES = 1_048_576;

export const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex');

export function trackedBuildFiles(root) {
  const bytes = execFileSync('git', [
    'ls-files', '-z', '--',
    'index.html', 'package.json', 'package-lock.json', 'tsconfig.json', 'vite.config.ts', 'src', 'public',
  ], { cwd: root, encoding: 'buffer', maxBuffer: MAX_REPORT_BYTES + 1 });
  const files = bytes.toString('utf8').split('\0').filter(Boolean).sort();
  for (const file of files) {
    if (path.isAbsolute(file) || file !== path.posix.normalize(file) || file.startsWith('../')) throw new Error('git returned an invalid build input path');
  }
  for (const required of ['index.html', 'package-lock.json', 'package.json', 'src/main.tsx', 'tsconfig.json', 'vite.config.ts']) {
    if (!files.includes(required)) throw new Error(`tracked build input is missing: ${required}`);
  }
  return files;
}

export async function bindCommittedFiles(root, relativeFiles) {
  const commit = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim();
  if (!/^[0-9a-f]{40}$/.test(commit)) throw new Error('git did not return one commit id');
  const files = new Map();
  for (const relative of relativeFiles) {
    const target = path.join(root, relative);
    const stat = await lstat(target);
    if (!stat.isFile() || stat.isSymbolicLink() || stat.size > MAX_INPUT_FILE_BYTES) throw new Error(`conformance input must be one bounded regular file: ${relative}`);
    const bytes = await readFile(target);
    const committed = execFileSync('git', ['show', `${commit}:${relative}`], { cwd: root, encoding: 'buffer', maxBuffer: MAX_INPUT_FILE_BYTES + 1 });
    if (!bytes.equals(committed)) throw new Error(`conformance input does not match commit ${commit}: ${relative}`);
    files.set(relative, bytes);
  }
  return { commit, files, sourceSha256: Object.fromEntries(relativeFiles.map((file) => [file, sha256(files.get(file))])) };
}

export function parseConformanceArguments(argv, candidate, criteria) {
  const values = new Map();
  for (let index = 0; index < argv.length; index += 2) {
    const key = argv[index];
    const value = argv[index + 1];
    if (!['--candidate', '--criterion', '--report'].includes(key) || !value || values.has(key)) throw new Error('invalid conformance arguments');
    values.set(key, value);
  }
  if (values.size !== 3 || values.get('--candidate') !== candidate || !criteria.includes(values.get('--criterion'))) throw new Error('unsupported conformance request');
  return { criterion: values.get('--criterion'), report: values.get('--report') };
}

export async function writeConformanceReport(root, candidate, criterion, requested, report) {
  const directory = path.join(root, '.hexaemeron', 'reports', 'conformance');
  const expected = path.join(directory, `${candidate}--${criterion}.json`);
  if (path.resolve(root, requested) !== expected) throw new Error('report path is outside the declared conformance slot');
  let current = root;
  for (const part of ['.hexaemeron', 'reports', 'conformance']) {
    current = path.join(current, part);
    await mkdir(current, { recursive: false, mode: 0o700 }).catch((error) => {
      if (!error || typeof error !== 'object' || error.code !== 'EEXIST') throw error;
    });
    const stat = await lstat(current);
    if (!stat.isDirectory() || stat.isSymbolicLink()) throw new Error(`report directory must not be a symlink: ${current}`);
  }
  try {
    const stat = await lstat(expected);
    if (!stat.isFile() || stat.isSymbolicLink()) throw new Error('report output must be a regular file and not a symlink');
  } catch (error) {
    if (!error || typeof error !== 'object' || error.code !== 'ENOENT') throw error;
  }
  const bytes = `${JSON.stringify(report, null, 2)}\n`;
  if (Buffer.byteLength(bytes) > MAX_REPORT_BYTES) throw new Error('report exceeds its size limit');
  const temporary = path.join(directory, `.${path.basename(expected)}.${randomUUID()}.tmp`);
  let failure;
  try {
    await writeFile(temporary, bytes, { flag: 'wx', mode: 0o600 });
    await rename(temporary, expected);
  } catch (error) {
    failure = error;
  } finally {
    try { await unlink(temporary); } catch (error) {
      if ((!error || typeof error !== 'object' || error.code !== 'ENOENT') && !failure) failure = error;
    }
  }
  if (failure) throw failure;
}
