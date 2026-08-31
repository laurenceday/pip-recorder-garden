import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { lstat, mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  CHILD_COPY_MANIFEST,
  CHILD_COPY_STATE_IDS,
  CHILD_LEXICON,
  validateChildCopyManifest,
} from '../src/lib/child-copy.ts';

const EXPECTED_CANDIDATE = 'one-screen-play-loop';
const EXPECTED_CRITERION = 'rendered-child-copy-approved';
const MAX_SOURCE_BYTES = 1_048_576;

function digest(text) {
  return createHash('sha256').update(text).digest('hex');
}

async function readBoundedRegularFile(filePath) {
  const stat = await lstat(filePath);
  if (!stat.isFile() || stat.isSymbolicLink() || stat.size > MAX_SOURCE_BYTES) {
    throw new Error(`copy-boundary input must be one bounded regular file: ${filePath}`);
  }
  return readFile(filePath, 'utf8');
}

function rawChildStrings(source) {
  const strings = [];
  for (const match of source.matchAll(/(?<![=])>\s*([^<>{}\s][^<>{}]*)\s*</g)) strings.push(match[1].trim());
  for (const match of source.matchAll(/\b(?:aria-label|title|alt)\s*=\s*(["'])(.*?)\1/g)) strings.push(match[2]);
  return strings;
}

export function validateChildStageSource(source) {
  const findings = [];
  if (typeof source !== 'string' || source.length === 0) return ['child stage source is missing'];
  if (!source.includes('data-copy-role="child"')) findings.push('child stage is missing its child role marker');
  if (!source.includes('childCopyFor(state)')) findings.push('child stage does not resolve copy through the closed state map');
  if (!source.includes('data-child-copy-id={`${state}.title`}')) findings.push('child title is not joined to its manifest id');
  if (!source.includes('data-child-copy-id={`${state}.action`}')) findings.push('child action is not joined to its manifest id');
  if (!source.includes('data-child-copy-id={`${state}.exit`}')) findings.push('child exit is not joined to its manifest id');
  if (!source.includes('data-child-copy-id={`all.note.${note.toLowerCase()}`}')) findings.push('child note is not joined to its manifest id');

  const imports = [...source.matchAll(/from\s+['"]([^'"]+)['"]/g)].map((match) => match[1]);
  const allowedImports = new Set(['./GardenMark.tsx', '../lib/child-copy.ts']);
  for (const imported of imports) {
    if (!allowedImports.has(imported)) findings.push(`child stage imports an undeclared render path: ${imported}`);
  }
  for (const raw of rawChildStrings(source)) findings.push(`raw child copy is outside the manifest: ${JSON.stringify(raw)}`);
  const admittedChildExpressions = new Set(['copy.title', 'note', 'copy.action', 'copy.exit']);
  for (const match of source.matchAll(/(?<![=])>\s*\{([^{}]+)\}\s*</g)) {
    const expression = match[1].trim();
    if (!admittedChildExpressions.has(expression)) findings.push(`dynamic child copy is outside the closed interface: ${expression}`);
  }
  for (const pattern of [
    ['dynamic accessible name', /\b(?:aria-label|title|alt)\s*=\s*\{/],
    ['raw HTML', /dangerouslySetInnerHTML/],
    ['prop spread', /<[^>]+\{\.\.\./],
    ['opposite copy role', /\b(?:GrownUpSetup|grown-up|adultCue|childCue|successCue|story|tips)\b/],
    ['dynamic error copy', /\b(?:error|issue|message|feedback)\b/i],
  ]) {
    if (pattern[1].test(source)) findings.push(`child stage contains ${pattern[0]}`);
  }
  if (!/interface ChildStageProps \{\s*state: ChildCopyState;\s*notes: readonly ChildNoteLetter\[\];\s*onAction: \(\) => void;\s*onBack: \(\) => void;\s*\}/.test(source)) {
    findings.push('child stage props are outside the closed state, note and action interface');
  }
  return findings;
}

export function validateRoleMountSource(appSource, grownUpSource) {
  const findings = [];
  if (!grownUpSource.includes('data-copy-role="grown-up"')) findings.push('grown-up tree is missing its role marker');
  if (grownUpSource.includes('<ChildStage')) findings.push('grown-up tree mounts the child stage');
  const childBranch = appSource.indexOf('if (childMode)');
  const childMount = appSource.indexOf('<ChildStage');
  const grownUpMount = appSource.indexOf('<GrownUpSetup');
  if (childBranch === -1 || childMount === -1 || grownUpMount === -1 || !(childBranch < childMount && childMount < grownUpMount)) {
    findings.push('App does not conditionally return the child tree before mounting the grown-up tree');
  }
  if ((appSource.match(/<ChildStage/g) ?? []).length !== 1) findings.push('App must have exactly one child-tree mount');
  if ((appSource.match(/<GrownUpSetup/g) ?? []).length !== 1) findings.push('App must have exactly one grown-up-tree mount');
  const childTag = /<ChildStage[\s\S]*?\/>/.exec(appSource)?.[0] ?? '';
  if (/\b(?:error|issue|message|lesson|copy)\s*=/.test(childTag)) findings.push('App passes open prose into the child tree');
  return findings;
}

function parseArguments(argv) {
  const values = new Map();
  for (let index = 0; index < argv.length; index += 2) {
    const name = argv[index];
    const value = argv[index + 1];
    if (!['--candidate', '--criterion', '--report'].includes(name) || !value || values.has(name)) {
      throw new Error('usage: node scripts/check-child-copy.mjs --candidate one-screen-play-loop --criterion rendered-child-copy-approved --report .hexaemeron/reports/conformance/one-screen-play-loop--rendered-child-copy-approved.json');
    }
    values.set(name, value);
  }
  if (values.size !== 3) throw new Error('candidate, criterion and report are required');
  return {
    candidate: values.get('--candidate'),
    criterion: values.get('--criterion'),
    report: values.get('--report'),
  };
}

export async function runChildCopyCheck(argv, root = process.cwd()) {
  const options = parseArguments(argv);
  if (options.candidate !== EXPECTED_CANDIDATE) throw new Error(`unsupported candidate: ${options.candidate}`);
  if (options.criterion !== EXPECTED_CRITERION) throw new Error(`unsupported criterion: ${options.criterion}`);
  const expectedReport = path.resolve(root, '.hexaemeron', 'reports', 'conformance', `${EXPECTED_CANDIDATE}--${EXPECTED_CRITERION}.json`);
  const reportPath = path.resolve(root, options.report);
  if (reportPath !== expectedReport) throw new Error('report path is outside the declared conformance slot');

  const paths = {
    app: path.join(root, 'src', 'App.tsx'),
    child: path.join(root, 'src', 'components', 'ChildStage.tsx'),
    grownUp: path.join(root, 'src', 'components', 'GrownUpSetup.tsx'),
    contract: path.join(root, 'src', 'lib', 'child-copy.ts'),
  };
  const [appSource, childSource, grownUpSource, contractSource] = await Promise.all([
    readBoundedRegularFile(paths.app),
    readBoundedRegularFile(paths.child),
    readBoundedRegularFile(paths.grownUp),
    readBoundedRegularFile(paths.contract),
  ]);
  const findings = [
    ...validateChildCopyManifest(CHILD_COPY_MANIFEST),
    ...validateChildStageSource(childSource),
    ...validateRoleMountSource(appSource, grownUpSource),
  ];
  if (findings.length > 0) throw new Error(`child copy boundary failed:\n${findings.map((finding) => `- ${finding}`).join('\n')}`);

  const commit = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim();
  if (!/^[0-9a-f]{40}$/.test(commit)) throw new Error('git did not return one commit id');
  const report = {
    schema: 'child-copy-conformance/v1',
    candidate: EXPECTED_CANDIDATE,
    criterion: EXPECTED_CRITERION,
    status: 'pass',
    commit,
    roleResult: 'separate-conditional-mounts',
    stateIds: CHILD_COPY_STATE_IDS,
    manifestEntries: CHILD_COPY_MANIFEST.length,
    lexicon: CHILD_LEXICON,
    rejectedTokens: [],
    sourceSha256: {
      app: digest(appSource),
      childStage: digest(childSource),
      grownUpSetup: digest(grownUpSource),
      contract: digest(contractSource),
    },
  };
  await mkdir(path.dirname(reportPath), { recursive: true });
  await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, { encoding: 'utf8', flag: 'w', mode: 0o600 });
  console.log(`child copy clean: ${CHILD_COPY_MANIFEST.length} manifest entries, ${CHILD_LEXICON.length} lexicon tokens, 4 declared states`);
  return report;
}

const invokedPath = process.argv[1] ? path.resolve(process.argv[1]) : '';
if (invokedPath === fileURLToPath(import.meta.url)) {
  await runChildCopyCheck(process.argv.slice(2));
}
