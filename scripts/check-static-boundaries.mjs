import { lstat, readdir, readFile } from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();
const sourceRoot = path.join(root, 'src');

async function sourceFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const absolute = path.join(directory, entry.name);
    const relative = path.relative(root, absolute).split(path.sep).join('/');
    const stat = await lstat(absolute);
    if (stat.isSymbolicLink()) throw new Error(`runtime source must not contain symlinks: ${relative}`);
    if (entry.isDirectory()) files.push(...await sourceFiles(absolute));
    else if (entry.isFile() && /\.(?:ts|tsx|css|json)$/.test(entry.name)) files.push(relative);
  }
  return files;
}

const files = await sourceFiles(sourceRoot);
const contents = new Map();
for (const file of files) contents.set(file, await readFile(path.join(root, file), 'utf8'));
const joined = [...contents.entries()].map(([file, text]) => `\nFILE ${file}\n${text}`).join('');

const forbiddenRuntimeAPIs = [
  ['audio recording', /\bMediaRecorder\b/],
  ['outbound fetch', /\bfetch\s*\(/],
  ['XML HTTP', /\bXMLHttpRequest\b/],
  ['web socket', /\bWebSocket\b/],
  ['event stream', /\bEventSource\b/],
  ['beacon', /\bsendBeacon\b/],
  ['indexed database', /\bindexedDB\b/],
  ['service worker', /\bserviceWorker\b/],
];
for (const [label, pattern] of forbiddenRuntimeAPIs) {
  if (pattern.test(joined)) throw new Error(`child-facing runtime unexpectedly contains ${label}`);
}

for (const [file, text] of contents) {
  if (text.includes('getUserMedia') && file !== 'src/hooks/useMicrophoneScoring.ts') {
    throw new Error(`microphone access escaped its boundary: ${file}`);
  }
  if (text.includes('localStorage') && file !== 'src/hooks/useProgress.ts') {
    throw new Error(`local storage escaped its boundary: ${file}`);
  }
  if (text.includes('context.destination') && file !== 'src/hooks/useGuideTone.ts') {
    throw new Error(`audible output escaped the guide-tone boundary: ${file}`);
  }
}

const microphone = contents.get('src/hooks/useMicrophoneScoring.ts') ?? '';
for (const required of [
  'source.connect(analyser)',
  'getTracks().forEach((track) => track.stop())',
  'context.close()',
  "document.visibilityState === 'hidden'",
  "window.isSecureContext",
]) {
  if (!microphone.includes(required)) throw new Error(`microphone lifecycle is missing: ${required}`);
}
if (microphone.includes('analyser.connect') || microphone.includes('source.connect(context.destination)')) {
  throw new Error('the microphone graph must not connect to audible output');
}
if (!/catch \(error\) \{\s*if \(run !== runRef\.current\) return;/.test(microphone)) {
  throw new Error('a cancelled microphone request must not publish stale state');
}

const app = contents.get('src/App.tsx') ?? '';
if (!app.includes('tone.stop();\n    void microphone.start()')) throw new Error('starting the microphone must stop the guide tone first');
if (!app.includes('microphone.stop();\n    void tone.play(expected)')) throw new Error('playing a guide tone must stop the microphone first');

console.log(`static boundaries clean: ${files.length} runtime source files`);
