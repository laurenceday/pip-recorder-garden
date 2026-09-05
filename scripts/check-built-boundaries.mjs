import { lstat, readFile, readdir } from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();
const distRoot = path.join(root, 'dist');
const indexPath = path.join(distRoot, 'index.html');
const indexStat = await lstat(indexPath);
if (!indexStat.isFile() || indexStat.isSymbolicLink() || indexStat.size > 1_048_576) {
  throw new Error('built index must be one bounded regular file');
}
const index = await readFile(indexPath, 'utf8');
if (/<(?:script|link)\b[^>]*(?:src|href)=["']\/(?!\/)/i.test(index)) {
  throw new Error('built scripts and styles must use repository-relative asset paths');
}
if (!/<link rel="manifest" href="\.\/manifest\.webmanifest" \/>/.test(index)) {
  throw new Error('built index lost its local install manifest');
}

const serviceWorkerPath = path.join(distRoot, 'sw.js');
const serviceWorkerStat = await lstat(serviceWorkerPath);
if (!serviceWorkerStat.isFile() || serviceWorkerStat.isSymbolicLink() || serviceWorkerStat.size > 65_536) {
  throw new Error('built service worker must be one bounded regular file');
}
const serviceWorker = await readFile(serviceWorkerPath, 'utf8');
if (/https?:\/\//i.test(serviceWorker)
  || !serviceWorker.includes("url.origin !== APP_ROOT.origin")
  || !serviceWorker.includes("!url.pathname.startsWith(APP_ROOT.pathname)")) {
  throw new Error('built offline cache escaped its same-site app scope');
}

const manifestPath = path.join(distRoot, 'manifest.webmanifest');
const manifestStat = await lstat(manifestPath);
if (!manifestStat.isFile() || manifestStat.isSymbolicLink() || manifestStat.size > 16_384) {
  throw new Error('built install manifest must be one bounded regular file');
}
const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
if (manifest.name !== 'Pip' || manifest.start_url !== './' || manifest.scope !== './' || manifest.display !== 'standalone') {
  throw new Error('built install manifest is outside the local Pip app boundary');
}

const assetRoot = path.join(distRoot, 'assets');
const entries = await readdir(assetRoot, { withFileTypes: true });
const javaScriptNames = entries.filter((entry) => entry.name.endsWith('.js')).map((entry) => entry.name);
if (javaScriptNames.length < 1 || javaScriptNames.length > 50) {
  throw new Error('built JavaScript asset count is outside the 1 to 50 file boundary');
}

const javaScript = [];
for (const name of javaScriptNames) {
  const filePath = path.join(assetRoot, name);
  const stat = await lstat(filePath);
  if (!stat.isFile() || stat.isSymbolicLink() || stat.size > 2_000_000) {
    throw new Error(`built JavaScript must be one bounded regular file: ${name}`);
  }
  javaScript.push(await readFile(filePath, 'utf8'));
}
const bundle = javaScript.join('\n');
for (const [label, pattern] of [
  ['audio recording', /\bMediaRecorder\b/],
  ['outbound fetch', /\bfetch\s*\(/],
  ['XML HTTP', /\bXMLHttpRequest\b/],
  ['web socket', /\bWebSocket\b/],
  ['event stream', /\bEventSource\b/],
  ['beacon', /\bsendBeacon\b/],
]) {
  if (pattern.test(bundle)) throw new Error(`built child-facing runtime unexpectedly contains ${label}`);
}
if (!bundle.includes('getUserMedia')) throw new Error('built runtime lost its explicit microphone capability');

console.log(`built boundaries clean: ${javaScriptNames.length} JavaScript asset(s)`);
