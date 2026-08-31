import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';

const root = process.cwd();

test('microphone resources belong to the stop path before audio-context resume can yield', async () => {
  const source = await readFile(path.join(root, 'src', 'hooks', 'useMicrophoneScoring.ts'), 'utf8');
  const streamOwnership = source.indexOf('streamRef.current = stream');
  const contextOwnership = source.indexOf('contextRef.current = context');
  const contextResume = source.indexOf('await context.resume()');

  assert.notEqual(streamOwnership, -1);
  assert.notEqual(contextOwnership, -1);
  assert.notEqual(contextResume, -1);
  assert.ok(streamOwnership < contextResume, 'Stop must own the stream before resume yields');
  assert.ok(contextOwnership < contextResume, 'Stop must own the audio context before resume yields');
  assert.match(source, /await context\.resume\(\);\s*if \(run !== runRef\.current\) return;/);
});

test('the production build checks the emitted child-facing runtime without a preload fetch shim', async () => {
  const [viteConfig, packageJson, builtBoundary] = await Promise.all([
    readFile(path.join(root, 'vite.config.ts'), 'utf8'),
    readFile(path.join(root, 'package.json'), 'utf8'),
    readFile(path.join(root, 'scripts', 'check-built-boundaries.mjs'), 'utf8').catch((error) => {
      if (error?.code === 'ENOENT') return '';
      throw error;
    }),
  ]);
  const scripts = JSON.parse(packageJson).scripts;

  assert.match(viteConfig, /modulePreload:\s*\{\s*polyfill:\s*false\s*\}/);
  assert.equal(scripts.postbuild, 'node scripts/check-built-boundaries.mjs');
  for (const capability of ['MediaRecorder', 'fetch', 'XMLHttpRequest', 'WebSocket', 'EventSource', 'sendBeacon']) {
    assert.match(builtBoundary, new RegExp(capability));
  }
});
