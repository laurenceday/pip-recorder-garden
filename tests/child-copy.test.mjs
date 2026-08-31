import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { copyFile, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';
import {
  CHILD_COPY_MANIFEST,
  CHILD_COPY_STATE_IDS,
  CHILD_LEXICON,
  childCopyTokens,
  childNoteLetters,
  rejectedChildCopyTokens,
  validateChildCopyManifest,
} from '../src/lib/child-copy.ts';
import { runChildCopyCheck, validateChildStageSource, validateRoleMountSource } from '../scripts/check-child-copy.mjs';

const root = process.cwd();
const checkerArguments = [
  '--candidate', 'one-screen-play-loop',
  '--criterion', 'rendered-child-copy-approved',
  '--report', '.hexaemeron/reports/conformance/one-screen-play-loop--rendered-child-copy-approved.json',
];
const fixtureFiles = [
  'src/App.tsx',
  'src/components/ChildStage.tsx',
  'src/components/GardenMark.tsx',
  'src/components/GrownUpSetup.tsx',
  'src/lib/child-copy.ts',
  'src/styles.css',
];

async function withCommittedFixture(beforeCommit, afterCommit, callback) {
  const fixture = await mkdtemp(path.join(tmpdir(), 'pip-child-copy-'));
  try {
    for (const file of fixtureFiles) {
      const target = path.join(fixture, file);
      await mkdir(path.dirname(target), { recursive: true });
      await copyFile(path.join(root, file), target);
    }
    if (beforeCommit) await beforeCommit(fixture);
    execFileSync('git', ['init', '-q'], { cwd: fixture });
    execFileSync('git', ['add', '.'], { cwd: fixture });
    execFileSync('git', [
      '-c', 'commit.gpgsign=false',
      '-c', 'user.name=Copy boundary test',
      '-c', 'user.email=copy-boundary@example.invalid',
      'commit', '-qm', 'fixture',
    ], { cwd: fixture });
    if (afterCommit) await afterCommit(fixture);
    return await callback(fixture);
  } finally {
    await rm(fixture, { recursive: true, force: true });
  }
}

test('the child lexicon is deliberately tiny and the checked manifest is exhaustive', () => {
  assert.deepEqual(CHILD_LEXICON, ['a', 'b', 'back', 'c', 'd', 'done', 'e', 'f', 'g', 'pip', 'play', 'stop', 'try']);
  assert.deepEqual(CHILD_COPY_STATE_IDS, ['ready', 'playing', 'done', 'error']);
  assert.equal(CHILD_COPY_MANIFEST.length, 19);
  assert.deepEqual(validateChildCopyManifest(CHILD_COPY_MANIFEST), []);
  assert.equal(new Set(CHILD_COPY_MANIFEST.map((entry) => entry.id)).size, CHILD_COPY_MANIFEST.length);
});

test('every manifest string is admitted by the closed lexicon', () => {
  for (const entry of CHILD_COPY_MANIFEST) {
    assert.deepEqual(rejectedChildCopyTokens(entry.text), [], entry.id);
    assert.ok(childCopyTokens(entry.text).length >= 1);
  }
  assert.deepEqual(rejectedChildCopyTokens('Recorder'), ['recorder']);
});

test('punctuation and Unicode cannot disguise child tokens', () => {
  for (const text of ['Play!', 'Pip’s', 'Pip\u200b', 'Play  Stop', ' Play', 'Stop ']) {
    assert.throws(() => childCopyTokens(text), /unsupported characters or spacing/);
  }
});

test('dynamic note labels collapse to one admitted letter and reject open input', () => {
  assert.deepEqual(childNoteLetters(['C5', 'C6', 'B5', 'A5']), ['C', 'C', 'B', 'A']);
  for (const note of ['low C', 'H5', 'A', '<b>A</b>']) assert.throws(() => childNoteLetters([note]), /unknown child note/);
});

test('the manifest rejects omissions, duplicates and unenumerated states', () => {
  const missing = structuredClone(CHILD_COPY_MANIFEST).slice(1);
  assert.match(validateChildCopyManifest(missing).join('\n'), /exhaustive declared states/);
  const duplicate = [...structuredClone(CHILD_COPY_MANIFEST), structuredClone(CHILD_COPY_MANIFEST[0])];
  assert.match(validateChildCopyManifest(duplicate).join('\n'), /duplicates/);
  const unenumerated = structuredClone(CHILD_COPY_MANIFEST);
  unenumerated[0].state = 'surprise';
  assert.match(validateChildCopyManifest(unenumerated).join('\n'), /unenumerated state/);
});

test('the child component refuses raw and dynamic accessible copy', async () => {
  const source = await readFile(path.join(root, 'src', 'components', 'ChildStage.tsx'), 'utf8');
  assert.deepEqual(validateChildStageSource(source), []);
  assert.match(validateChildStageSource(`${source}\n<button aria-label="Recorder" />`).join('\n'), /raw child copy/);
  assert.match(validateChildStageSource(`${source}\n<button aria-label={errorMessage} />`).join('\n'), /dynamic child copy|dynamic error copy/);
  assert.match(validateChildStageSource(`${source}\n<p>{lesson.title}</p>`).join('\n'), /dynamic child copy/);
  assert.match(validateChildStageSource(`${source}\n<p>{'Recorder'}</p>`).join('\n'), /dynamic child copy/);
  for (const bypass of [
    '<input placeholder="Recorder" />',
    '<input value="Recorder" />',
    '<button children="Recorder" />',
    '<div aria-description="Recorder" />',
  ]) {
    assert.match(validateChildStageSource(`${source}\n${bypass}`).join('\n'), /raw child copy/);
  }
});

test('the child component refuses opposite-role copy and undeclared imports', async () => {
  const source = await readFile(path.join(root, 'src', 'components', 'ChildStage.tsx'), 'utf8');
  assert.match(validateChildStageSource(`${source}\n<GrownUpSetup />`).join('\n'), /opposite copy role/);
  assert.match(validateChildStageSource(`${source}\nimport { LessonTrail } from './LessonTrail.tsx';`).join('\n'), /undeclared render path/);
});

test('App conditionally mounts one child tree or one grown-up tree', async () => {
  const [app, grownUp] = await Promise.all([
    readFile(path.join(root, 'src', 'App.tsx'), 'utf8'),
    readFile(path.join(root, 'src', 'components', 'GrownUpSetup.tsx'), 'utf8'),
  ]);
  assert.deepEqual(validateRoleMountSource(app, grownUp), []);
  assert.match(validateRoleMountSource(app.replace('if (childMode)', 'if (false)'), grownUp).join('\n'), /return only the child tree/);
  assert.match(validateRoleMountSource(app.replace('notes={childNotes}', 'message={guideIssue}'), grownUp).join('\n'), /closed child interface/);
  const fakeConditional = 'function App() { if (childMode) {} <ChildStage state={state} notes={notes} onAction={run} onBack={back} />; return <GrownUpSetup />; }';
  assert.match(validateRoleMountSource(fakeConditional, grownUp).join('\n'), /return only the child tree/);
});

test('the copy gate follows imported child components', async () => {
  await withCommittedFixture(async (fixture) => {
    const file = path.join(fixture, 'src', 'components', 'GardenMark.tsx');
    const source = await readFile(file, 'utf8');
    await writeFile(file, source.replace('<circle', '<text x="1" y="10">Recorder</text>\n      <circle'));
  }, null, async (fixture) => {
    await assert.rejects(runChildCopyCheck(checkerArguments, fixture), /GardenMark\.tsx contains raw child copy/);
  });
});

test('the copy gate refuses generated CSS copy', async () => {
  await withCommittedFixture(async (fixture) => {
    const file = path.join(fixture, 'src', 'styles.css');
    const source = await readFile(file, 'utf8');
    await writeFile(file, `${source}\n.child-stage::before { content: "Recorder"; }\n`);
  }, null, async (fixture) => {
    await assert.rejects(runChildCopyCheck(checkerArguments, fixture), /stylesheet contains generated copy/);
  });
});

test('the conformance report refuses source bytes outside its named commit', async () => {
  await withCommittedFixture(null, async (fixture) => {
    const file = path.join(fixture, 'src', 'App.tsx');
    const source = await readFile(file, 'utf8');
    await writeFile(file, `${source}\n// dirty source specimen\n`);
  }, async (fixture) => {
    await assert.rejects(runChildCopyCheck(checkerArguments, fixture), /does not match commit/);
  });
});

test('a clean report digests the complete child render surface', async () => {
  await withCommittedFixture(null, null, async (fixture) => {
    const report = await runChildCopyCheck(checkerArguments, fixture);
    assert.deepEqual(report.sourceFiles, [
      'src/App.tsx',
      'src/components/ChildStage.tsx',
      'src/components/GardenMark.tsx',
      'src/components/GrownUpSetup.tsx',
      'src/lib/child-copy.ts',
      'src/styles.css',
    ]);
    assert.deepEqual(Object.keys(report.sourceSha256), report.sourceFiles);
  });
});
