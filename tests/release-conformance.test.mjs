import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';
import * as bundleCheck from '../scripts/check-bundle-budget.mjs';
import * as common from '../scripts/child-conformance-common.mjs';
import * as pagesCheck from '../scripts/check-live-pages.mjs';

const builtEntry = (asset = './assets/index-Ab_19.js') => `<!doctype html><html><head><script type="module" src="${asset}"></script></head><body><div id="root"></div></body></html>`;

test('the production JavaScript budget accepts the measured build and rejects excess', () => {
  assert.deepEqual(bundleCheck.measureJavaScriptAssets([{ name: 'index-Ab_19.js', bytes: 238_510 }]), {
    assets: [{ name: 'index-Ab_19.js', bytes: 238_510 }], totalBytes: 238_510, ceilingBytes: 300_000, withinBudget: true,
  });
  assert.equal(bundleCheck.measureJavaScriptAssets([{ name: 'index-Ab_19.js', bytes: 300_001 }]).withinBudget, false);
  assert.throws(() => bundleCheck.measureJavaScriptAssets([{ name: '../escape.js', bytes: 1 }]), /invalid JavaScript asset/);
});

test('the live entry accepts one same-site hashed artifact', () => {
  assert.deepEqual(pagesCheck.inspectPagesEntry(builtEntry()), {
    assetUrl: 'https://laurenceday.github.io/pip-recorder-garden/assets/index-Ab_19.js',
    assetName: 'index-Ab_19.js',
  });
});

test('the live entry rejects source, missing, unbounded and off-site assets', () => {
  assert.throws(() => pagesCheck.inspectPagesEntry(builtEntry('/src/main.tsx')), /repository source/);
  assert.throws(() => pagesCheck.inspectPagesEntry('<div id="root"></div>'), /one hashed JavaScript asset/);
  assert.throws(() => pagesCheck.inspectPagesEntry(builtEntry('https://example.com/assets/index-Ab_19.js')), /one hashed JavaScript asset/);
  assert.throws(() => pagesCheck.inspectPagesEntry(`${builtEntry()}${'x'.repeat(65_536)}`), /too large/);
  assert.throws(() => pagesCheck.inspectPagesEntry(builtEntry(), 'http://laurenceday.github.io/pip-recorder-garden/'), /expected HTTPS site/);
});

test('release checks reject the wrong candidate and criterion', () => {
  const good = ['--candidate', 'one-screen-play-loop', '--criterion', 'production-javascript-bytes', '--report', 'report.json'];
  assert.deepEqual(common.parseConformanceArguments(good, 'one-screen-play-loop', ['production-javascript-bytes']), { criterion: 'production-javascript-bytes', report: 'report.json' });
  assert.throws(() => common.parseConformanceArguments(good.with(1, 'another-candidate'), 'one-screen-play-loop', ['production-javascript-bytes']), /unsupported/);
  assert.throws(() => common.parseConformanceArguments(good.with(3, 'another-criterion'), 'one-screen-play-loop', ['production-javascript-bytes']), /unsupported/);
});

test('release reports bind the complete tracked build surface', () => {
  const files = common.trackedBuildFiles(process.cwd());
  for (const required of ['index.html', 'package-lock.json', 'public/social-card.png', 'src/App.tsx', 'src/main.tsx', 'src/styles.css', 'vite.config.ts']) {
    assert.ok(files.includes(required), `${required} was not bound`);
  }
  assert.equal(files.some((file) => file.startsWith('dist/')), false);
});

test('commit-bound source input rejects tampering', async () => {
  const fixture = await mkdtemp(path.join(tmpdir(), 'pip-release-source-'));
  try {
    await writeFile(path.join(fixture, 'proof.txt'), 'accepted\n');
    execFileSync('git', ['init', '-q'], { cwd: fixture });
    execFileSync('git', ['add', 'proof.txt'], { cwd: fixture });
    execFileSync('git', ['-c', 'commit.gpgsign=false', '-c', 'user.name=Proof', '-c', 'user.email=proof@example.invalid', 'commit', '-qm', 'proof'], { cwd: fixture });
    assert.equal((await common.bindCommittedFiles(fixture, ['proof.txt'])).files.get('proof.txt').toString(), 'accepted\n');
    await writeFile(path.join(fixture, 'proof.txt'), 'changed\n');
    await assert.rejects(common.bindCommittedFiles(fixture, ['proof.txt']), /does not match commit/);
  } finally {
    await rm(fixture, { recursive: true, force: true });
  }
});

test('HTTP failures and empty assets fail closed', async () => {
  await assert.rejects(pagesCheck.responseBytes(new Response('missing', { status: 404 }), 100, 'Pages asset'), /HTTP 404/);
  await assert.rejects(pagesCheck.responseBytes(new Response('', { status: 200 }), 100, 'Pages asset'), /missing or too large/);
});

test('public fetches carry a bounded abort signal and explicit redirect policy', () => {
  const options = pagesCheck.fetchOptions('text/html', 'follow');
  assert.deepEqual(options.headers, { accept: 'text/html', 'cache-control': 'no-cache' });
  assert.equal(options.redirect, 'follow');
  assert.equal(options.signal.aborted, false);
});
