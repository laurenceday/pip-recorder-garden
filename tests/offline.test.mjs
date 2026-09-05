import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';

const root = process.cwd();

test('offline installation is production-only and remains inside the app path', async () => {
  const [registration, worker, manifest] = await Promise.all([
    readFile(path.join(root, 'src', 'register-service-worker.ts'), 'utf8'),
    readFile(path.join(root, 'public', 'sw.js'), 'utf8'),
    readFile(path.join(root, 'public', 'manifest.webmanifest'), 'utf8').then(JSON.parse),
  ]);
  assert.match(registration, /import\.meta\.env\.PROD/);
  assert.match(registration, /register\('\.\/sw\.js', \{ scope: '\.\/' \}\)/);
  assert.doesNotMatch(registration, /\bfetch\s*\(/);
  assert.match(worker, /url\.origin !== APP_ROOT\.origin/);
  assert.match(worker, /!url\.pathname\.startsWith\(APP_ROOT\.pathname\)/);
  assert.doesNotMatch(worker, /https?:\/\//i);
  assert.deepEqual({ name: manifest.name, startUrl: manifest.start_url, scope: manifest.scope, display: manifest.display }, {
    name: 'Pip', startUrl: './', scope: './', display: 'standalone',
  });
});
