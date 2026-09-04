import { lstat, readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { bindCommittedFiles, sha256, parseConformanceArguments, writeConformanceReport } from './child-conformance-common.mjs';

const CANDIDATE = 'one-screen-play-loop';
const CRITERION = 'production-javascript-bytes';
export const JAVASCRIPT_CEILING_BYTES = 300_000;
const SOURCE_FILES = ['package-lock.json', 'package.json', 'scripts/check-bundle-budget.mjs', 'scripts/child-conformance-common.mjs', 'vite.config.ts'];

export function measureJavaScriptAssets(assets, ceiling = JAVASCRIPT_CEILING_BYTES) {
  if (!Number.isInteger(ceiling) || ceiling < 1) throw new Error('bundle ceiling must be a positive integer');
  if (!Array.isArray(assets) || assets.length < 1) throw new Error('at least one JavaScript asset is required');
  const totalBytes = assets.reduce((sum, asset) => {
    if (!asset || typeof asset.name !== 'string' || !/^index-[A-Za-z0-9_-]+\.js$/.test(asset.name) || !Number.isInteger(asset.bytes) || asset.bytes < 1) throw new Error('invalid JavaScript asset measurement');
    return sum + asset.bytes;
  }, 0);
  return { assets, totalBytes, ceilingBytes: ceiling, withinBudget: totalBytes <= ceiling };
}

async function collectJavaScript(root) {
  const directory = path.join(root, 'dist', 'assets');
  const directoryStat = await lstat(directory);
  if (!directoryStat.isDirectory() || directoryStat.isSymbolicLink()) throw new Error('dist assets must be one real directory');
  const names = (await readdir(directory)).filter((name) => name.endsWith('.js')).sort();
  const assets = [];
  for (const name of names) {
    const target = path.join(directory, name);
    const stat = await lstat(target);
    if (!stat.isFile() || stat.isSymbolicLink() || stat.size > 1_048_576) throw new Error(`invalid built JavaScript asset: ${name}`);
    const bytes = await readFile(target);
    assets.push({ name, bytes: stat.size, sha256: sha256(bytes) });
  }
  return measureJavaScriptAssets(assets);
}

export async function runBundleBudgetCheck(argv, root = process.cwd()) {
  const options = parseConformanceArguments(argv, CANDIDATE, [CRITERION]);
  const { commit, sourceSha256 } = await bindCommittedFiles(root, SOURCE_FILES);
  const evidence = await collectJavaScript(root);
  if (!evidence.withinBudget) throw new Error(`production JavaScript is ${evidence.totalBytes} bytes, above ${evidence.ceilingBytes}`);
  const report = { schema: 'bundle-budget-conformance/v1', candidate: CANDIDATE, criterion: CRITERION, status: 'pass', commit, evidence, sourceFiles: SOURCE_FILES, sourceSha256 };
  await writeConformanceReport(root, CANDIDATE, CRITERION, options.report, report);
  console.log(`bundle budget clean: ${evidence.totalBytes} of ${evidence.ceilingBytes} bytes`);
  return report;
}

const invoked = process.argv[1] ? path.resolve(process.argv[1]) : '';
if (invoked === fileURLToPath(import.meta.url)) await runBundleBudgetCheck(process.argv.slice(2));
