import { createHash, randomUUID } from 'node:crypto';
import { execFileSync, spawn } from 'node:child_process';
import { lstat, mkdir, mkdtemp, readFile, rename, rm, unlink, writeFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const EXPECTED_CANDIDATE = 'one-screen-play-loop';
const EXPECTED_CRITERION = 'small-phone-no-scroll';
const MAX_SOURCE_BYTES = 1_048_576;
const MAX_REPORT_BYTES = 1_048_576;
const STATES = ['ready', 'playing', 'tap', 'done', 'more', 'error'];
export const CHILD_LAYOUT_LESSONS = Object.freeze(['meet-b', 'octave-garden']);
export const CHILD_LAYOUT_SCENARIOS = Object.freeze([
  { id: 'phone-320', width: 320, height: 568, textScale: 1, reducedMotion: false },
  { id: 'phone-391', width: 391, height: 844, textScale: 1, reducedMotion: false },
  { id: 'tablet-768', width: 768, height: 1024, textScale: 1, reducedMotion: false },
  { id: 'landscape-568', width: 568, height: 320, textScale: 1, reducedMotion: false },
  { id: 'phone-320-text-200', width: 320, height: 568, textScale: 2, reducedMotion: true },
  { id: 'phone-320-safe-area', width: 320, height: 568, textScale: 1, reducedMotion: false, safeInsets: { top: 44, right: 0, bottom: 34, left: 0 } },
]);
const SOURCE_FILES = [
  'package-lock.json',
  'package.json',
  'scripts/check-child-layout.mjs',
  'src/App.tsx',
  'src/components/ChildStage.tsx',
  'src/styles.css',
];
const CHROME_CANDIDATES = [
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/Applications/Chromium.app/Contents/MacOS/Chromium',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
];

function digest(bytes) {
  return createHash('sha256').update(bytes).digest('hex');
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function readBoundedRegularFile(filePath) {
  const stat = await lstat(filePath);
  if (!stat.isFile() || stat.isSymbolicLink() || stat.size > MAX_SOURCE_BYTES) {
    throw new Error(`layout input must be one bounded regular file: ${filePath}`);
  }
  return readFile(filePath);
}

function assertSourcesMatchCommit(root, commit, sources) {
  for (const [relative, bytes] of sources) {
    const committed = execFileSync('git', ['show', `${commit}:${relative}`], {
      cwd: root,
      encoding: 'buffer',
      maxBuffer: MAX_SOURCE_BYTES + 1,
    });
    if (!committed.equals(bytes)) throw new Error(`layout input does not match commit ${commit}: ${relative}`);
  }
}

export function validateLayoutContractSource(childSource, stylesSource) {
  const findings = [];
  const inspectableChild = childSource.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n\r]*/g, '');
  const inspectableStyles = stylesSource.replace(/\/\*[\s\S]*?\*\//g, '');
  for (const [label, pattern] of [
    ['closed child state marker', /data-child-state=\{state\}/],
    ['initial child focus', /if \(state === 'more'\) firstNoteRef\.current\?\.focus\(\);\s*else actionRef\.current\?\.focus\(\);/],
    ['dynamic viewport height', /\.child-stage\s*\{[\s\S]*height:\s*100dvh/],
    ['safe-area top', /--child-safe-top:\s*env\(safe-area-inset-top\)/],
    ['safe-area right', /--child-safe-right:\s*env\(safe-area-inset-right\)/],
    ['safe-area bottom', /--child-safe-bottom:\s*env\(safe-area-inset-bottom\)/],
    ['safe-area left', /--child-safe-left:\s*env\(safe-area-inset-left\)/],
    ['child overflow closure', /\.child-stage\s*\{[\s\S]*overflow:\s*hidden/],
    ['64 pixel child action', /\.child-stage \.button\s*\{[\s\S]*min-width:\s*64px;[\s\S]*min-height:\s*64px/],
    ['64 pixel child note action', /\.child-stage \.note-stone\s*\{[^}]*min-width:\s*64px;[^}]*min-height:\s*64px/],
    ['landscape child layout', /@media \(max-height: 400px\) and \(orientation: landscape\)/],
    ['reduced motion', /@media \(prefers-reduced-motion: reduce\)/],
  ]) {
    const source = label === 'closed child state marker' || label === 'initial child focus' ? inspectableChild : inspectableStyles;
    if (!pattern.test(source)) findings.push(`layout contract is missing ${label}`);
  }
  return findings;
}

export function validateLayoutMeasurement(measurement) {
  const findings = [];
  const prefix = `${measurement.scenario}/${measurement.lesson}/${measurement.state}`;
  if (!STATES.includes(measurement.state)) findings.push(`${prefix} is not a declared child state`);
  if (measurement.scrollWidth > measurement.viewportWidth + 1) findings.push(`${prefix} has horizontal overflow`);
  if (measurement.scrollHeight > measurement.viewportHeight + 1) findings.push(`${prefix} has document overflow`);
  if (measurement.smallestTextPx < 20) findings.push(`${prefix} has child text below 20 pixels`);
  if (measurement.smallestTargetWidth < 64 || measurement.smallestTargetHeight < 64) {
    findings.push(`${prefix} has a child action below 64 by 64 pixels`);
  }
  if (measurement.exitActionCount !== 1) findings.push(`${prefix} does not have one reachable exit action`);
  if (!measurement.actionsInsideViewport) findings.push(`${prefix} has a clipped child action`);
  if (!measurement.essentialsInsideCard) findings.push(`${prefix} clips essential child content inside the card`);
  if (!measurement.essentialsInsideSafeArea) findings.push(`${prefix} places essential child content outside the safe area`);
  if (!measurement.focusInsideChild) findings.push(`${prefix} does not move focus into child play`);
  return findings;
}

function mimeType(filePath) {
  if (filePath.endsWith('.html')) return 'text/html; charset=utf-8';
  if (filePath.endsWith('.js')) return 'text/javascript; charset=utf-8';
  if (filePath.endsWith('.css')) return 'text/css; charset=utf-8';
  if (filePath.endsWith('.svg')) return 'image/svg+xml';
  if (filePath.endsWith('.png')) return 'image/png';
  return 'application/octet-stream';
}

async function startDistServer(artifacts) {
  const server = createServer(async (request, response) => {
    try {
      const parsed = new URL(request.url ?? '/', 'http://127.0.0.1');
      const relative = decodeURIComponent(parsed.pathname === '/' ? 'index.html' : parsed.pathname.slice(1));
      if (!relative || path.isAbsolute(relative) || relative.split('/').includes('..')) throw new Error('invalid path');
      const bytes = artifacts.get(relative);
      if (!bytes) throw new Error('asset is outside the measured artifact set');
      response.writeHead(200, {
        'Cache-Control': 'no-store',
        'Content-Length': bytes.length,
        'Content-Type': mimeType(relative),
      });
      response.end(bytes);
    } catch {
      response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      response.end('not found');
    }
  });
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('layout server did not bind TCP');
  return { server, url: `http://127.0.0.1:${address.port}/` };
}

async function boundedDistFile(dist, relative) {
  if (!relative || path.isAbsolute(relative) || relative.split('/').includes('..')) throw new Error('invalid dist path');
  let candidate = dist;
  const parts = relative.split('/');
  for (const part of parts.slice(0, -1)) {
    candidate = path.join(candidate, part);
    const directory = await lstat(candidate);
    if (!directory.isDirectory() || directory.isSymbolicLink()) throw new Error(`dist path contains an invalid directory: ${relative}`);
  }
  candidate = path.join(candidate, parts.at(-1));
  const stat = await lstat(candidate);
  if (!stat.isFile() || stat.isSymbolicLink() || stat.size > MAX_REPORT_BYTES) throw new Error(`dist path contains an invalid asset: ${relative}`);
  return { candidate, stat };
}

async function collectBuiltArtifacts(root) {
  const dist = path.join(root, 'dist');
  const { candidate: indexPath } = await boundedDistFile(dist, 'index.html');
  const index = await readFile(indexPath);
  const html = index.toString('utf8');
  const references = [...html.matchAll(/(?:src|href)="\.\/([^"]+)"/g)].map((match) => match[1]);
  const critical = references.filter((reference) => reference.startsWith('assets/') && /\.(?:css|js)$/.test(reference));
  if (critical.length !== 2 || !critical.some((file) => file.endsWith('.css')) || !critical.some((file) => file.endsWith('.js'))) {
    throw new Error('built index must reference one CSS and one JavaScript asset');
  }
  const artifacts = new Map([['index.html', index]]);
  for (const relative of critical.sort()) {
    const { candidate } = await boundedDistFile(dist, relative);
    artifacts.set(relative, await readFile(candidate));
  }
  return artifacts;
}

async function findChrome() {
  for (const candidate of CHROME_CANDIDATES) {
    try {
      const stat = await lstat(candidate);
      if (stat.isFile() && !stat.isSymbolicLink()) return candidate;
    } catch (error) {
      if (!error || typeof error !== 'object' || error.code !== 'ENOENT') throw error;
    }
  }
  throw new Error('no supported local Chrome executable was found');
}

async function waitForDevToolsFile(profile, processHandle) {
  const activePort = path.join(profile, 'DevToolsActivePort');
  for (let attempt = 0; attempt < 200; attempt += 1) {
    if (processHandle.exitCode !== null) throw new Error(`Chrome exited before DevTools was ready: ${processHandle.exitCode}`);
    try {
      const lines = (await readFile(activePort, 'utf8')).trim().split('\n');
      if (/^\d+$/.test(lines[0] ?? '')) return Number(lines[0]);
    } catch (error) {
      if (!error || typeof error !== 'object' || error.code !== 'ENOENT') throw error;
    }
    await delay(25);
  }
  throw new Error('Chrome DevTools port did not become ready');
}

class CdpClient {
  constructor(socket) {
    this.socket = socket;
    this.nextId = 1;
    this.pending = new Map();
    this.events = new Map();
    socket.addEventListener('message', (event) => {
      const message = JSON.parse(String(event.data));
      if (message.id) {
        const pending = this.pending.get(message.id);
        this.pending.delete(message.id);
        if (message.error) pending?.reject(new Error(message.error.message));
        else pending?.resolve(message.result);
        return;
      }
      const waiters = this.events.get(message.method) ?? [];
      this.events.delete(message.method);
      for (const waiter of waiters) waiter(message.params);
    });
  }

  send(method, params = {}) {
    const id = this.nextId;
    this.nextId += 1;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.socket.send(JSON.stringify({ id, method, params }));
    });
  }

  waitFor(method, timeoutMs = 5_000) {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error(`timed out waiting for ${method}`)), timeoutMs);
      const waiter = (params) => {
        clearTimeout(timer);
        resolve(params);
      };
      this.events.set(method, [...(this.events.get(method) ?? []), waiter]);
    });
  }
}

async function connectCdp(port) {
  const response = await fetch(`http://127.0.0.1:${port}/json/new?about:blank`, { method: 'PUT' });
  if (!response.ok) throw new Error(`Chrome target creation failed: ${response.status}`);
  const target = await response.json();
  const socket = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    socket.addEventListener('open', resolve, { once: true });
    socket.addEventListener('error', reject, { once: true });
  });
  return new CdpClient(socket);
}

async function stopChildProcess(processHandle) {
  if (processHandle.exitCode !== null) return;
  const exited = new Promise((resolve) => processHandle.once('exit', resolve));
  processHandle.kill('SIGTERM');
  const stopped = await Promise.race([exited.then(() => true), delay(1_000).then(() => false)]);
  if (stopped) return;
  processHandle.kill('SIGKILL');
  await exited;
}

async function evaluate(client, expression) {
  const result = await client.send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true, userGesture: true });
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.text ?? 'browser evaluation failed');
  return result.result.value;
}

async function waitForExpression(client, expression, timeoutMs = 8_000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    if (await evaluate(client, expression)) return;
    await delay(25);
  }
  throw new Error(`browser state did not arrive: ${expression}`);
}

async function navigate(client, url) {
  const loaded = client.waitFor('Page.loadEventFired');
  await client.send('Page.navigate', { url });
  await loaded;
}

const clickButtonExpression = (label) => `(() => {
  const button = [...document.querySelectorAll('button')].find((item) => item.textContent.trim() === ${JSON.stringify(label)});
  if (!button) return false;
  button.click();
  return true;
})()`;

async function enterChild(client, url, scenario, lesson, forceError = false, quiet = false) {
  await client.send('Emulation.setDeviceMetricsOverride', {
    width: scenario.width,
    height: scenario.height,
    deviceScaleFactor: 1,
    mobile: true,
    screenWidth: scenario.width,
    screenHeight: scenario.height,
  });
  await client.send('Emulation.setEmulatedMedia', {
    features: [{ name: 'prefers-reduced-motion', value: scenario.reducedMotion ? 'reduce' : 'no-preference' }],
  });
  await navigate(client, `${url}?layout=${scenario.id}&error=${forceError ? '1' : '0'}#${lesson}`);
  if (forceError) {
    await evaluate(client, `(() => {
      const Audio = window.AudioContext || window.webkitAudioContext;
      Audio.prototype.resume = () => Promise.reject(new Error('closed layout error state'));
      return true;
    })()`);
  }
  const startLabel = quiet ? 'Start quiet child play' : 'Start child play';
  if (!await evaluate(client, clickButtonExpression(startLabel))) throw new Error('grown-up start action was not found');
  const startState = quiet ? 'tap' : 'ready';
  await waitForExpression(client, `document.querySelector('.child-stage')?.dataset.childState === '${startState}'`);
  if (scenario.textScale !== 1) {
    await evaluate(client, `document.documentElement.style.fontSize = ${JSON.stringify(`${scenario.textScale * 100}%`)}`);
    await delay(50);
  }
  if (scenario.safeInsets) {
    await evaluate(client, `(() => {
      const stage = document.querySelector('.child-stage');
      const values = ${JSON.stringify(scenario.safeInsets)};
      for (const side of ['top', 'right', 'bottom', 'left']) stage.style.setProperty('--child-safe-' + side, values[side] + 'px');
      return true;
    })()`);
    await delay(50);
  }
}

async function measure(client, scenario, lesson, state) {
  const safeInsets = scenario.safeInsets ?? { top: 0, right: 0, bottom: 0, left: 0 };
  const value = await evaluate(client, `(() => {
    const stage = document.querySelector('.child-stage');
    const card = stage.querySelector('.model-card');
    const textNodes = [...stage.querySelectorAll('h1, .note-stone, .mission-actions button')];
    const actions = [...stage.querySelectorAll('button:not(:disabled)')];
    const rects = actions.map((item) => item.getBoundingClientRect());
    const essentialRects = [...stage.querySelectorAll('.garden-mark, h1, .note-stone, .mission-actions button')].map((item) => item.getBoundingClientRect());
    const cardRect = card.getBoundingClientRect();
    const safe = ${JSON.stringify(safeInsets)};
    return {
      viewportWidth: window.innerWidth,
      viewportHeight: window.innerHeight,
      scrollWidth: Math.max(document.documentElement.scrollWidth, document.body.scrollWidth),
      scrollHeight: Math.max(document.documentElement.scrollHeight, document.body.scrollHeight),
      smallestTextPx: Math.min(...textNodes.map((item) => Number.parseFloat(getComputedStyle(item).fontSize))),
      smallestTargetWidth: Math.min(...rects.map((rect) => rect.width)),
      smallestTargetHeight: Math.min(...rects.map((rect) => rect.height)),
      exitActionCount: stage.querySelectorAll('.mission-actions .button--soft').length,
      actionsInsideViewport: rects.every((rect) => rect.left >= -0.5 && rect.top >= -0.5 && rect.right <= innerWidth + 0.5 && rect.bottom <= innerHeight + 0.5),
      essentialsInsideCard: essentialRects.every((rect) => rect.width > 0 && rect.height > 0 && rect.left >= cardRect.left - 0.5 && rect.top >= cardRect.top - 0.5 && rect.right <= cardRect.right + 0.5 && rect.bottom <= cardRect.bottom + 0.5),
      essentialsInsideSafeArea: essentialRects.every((rect) => rect.left >= safe.left - 0.5 && rect.top >= safe.top - 0.5 && rect.right <= innerWidth - safe.right + 0.5 && rect.bottom <= innerHeight - safe.bottom + 0.5),
      focusInsideChild: stage.contains(document.activeElement),
    };
  })()`);
  return { scenario: scenario.id, lesson, state, ...value };
}

async function replayScenario(client, url, scenario) {
  const measurements = [];
  await enterChild(client, url, scenario, CHILD_LAYOUT_LESSONS[0]);
  measurements.push(await measure(client, scenario, CHILD_LAYOUT_LESSONS[0], 'ready'));
  if (!await evaluate(client, clickButtonExpression('Play'))) throw new Error('child play action was not found');
  await waitForExpression(client, "document.querySelector('.child-stage')?.dataset.childState === 'playing'");
  measurements.push(await measure(client, scenario, CHILD_LAYOUT_LESSONS[0], 'playing'));
  await waitForExpression(client, "document.querySelector('.child-stage')?.dataset.childState === 'tap'");
  measurements.push(await measure(client, scenario, CHILD_LAYOUT_LESSONS[0], 'tap'));
  if (!await evaluate(client, clickButtonExpression('Tap'))) throw new Error('child tap action was not found');
  await waitForExpression(client, "document.querySelector('.child-stage')?.dataset.childState === 'done'");
  measurements.push(await measure(client, scenario, CHILD_LAYOUT_LESSONS[0], 'done'));
  if (!await evaluate(client, clickButtonExpression('More'))) throw new Error('child more action was not found');
  await waitForExpression(client, "document.querySelector('.child-stage')?.dataset.childState === 'more'");
  measurements.push(await measure(client, scenario, CHILD_LAYOUT_LESSONS[0], 'more'));

  await enterChild(client, url, scenario, CHILD_LAYOUT_LESSONS[0], true);
  if (!await evaluate(client, clickButtonExpression('Play'))) throw new Error('child error probe action was not found');
  await waitForExpression(client, "document.querySelector('.child-stage')?.dataset.childState === 'error'");
  measurements.push(await measure(client, scenario, CHILD_LAYOUT_LESSONS[0], 'error'));

  await enterChild(client, url, scenario, CHILD_LAYOUT_LESSONS[1]);
  measurements.push(await measure(client, scenario, CHILD_LAYOUT_LESSONS[1], 'ready'));
  await enterChild(client, url, scenario, CHILD_LAYOUT_LESSONS[1], false, true);
  for (let index = 0; index < 8; index += 1) {
    if (!await evaluate(client, clickButtonExpression('Tap'))) throw new Error('largest lesson tap action was not found');
  }
  await waitForExpression(client, "document.querySelector('.child-stage')?.dataset.childState === 'done'");
  if (!await evaluate(client, clickButtonExpression('More'))) throw new Error('largest lesson more action was not found');
  await waitForExpression(client, "document.querySelector('.child-stage')?.dataset.childState === 'more'");
  measurements.push(await measure(client, scenario, CHILD_LAYOUT_LESSONS[1], 'more'));
  return measurements;
}

async function writeReportSafely(root, reportPath, bytes) {
  let directory = root;
  for (const part of ['.hexaemeron', 'reports', 'conformance']) {
    directory = path.join(directory, part);
    try {
      await mkdir(directory, { mode: 0o700 });
    } catch (error) {
      if (!error || typeof error !== 'object' || error.code !== 'EEXIST') throw error;
    }
    const stat = await lstat(directory);
    if (!stat.isDirectory() || stat.isSymbolicLink()) throw new Error(`layout report directory must not be a symlink: ${directory}`);
  }
  try {
    const stat = await lstat(reportPath);
    if (!stat.isFile() || stat.isSymbolicLink()) throw new Error('layout report output must be a regular file and not a symlink');
  } catch (error) {
    if (!error || typeof error !== 'object' || error.code !== 'ENOENT') throw error;
  }
  const temporary = path.join(directory, `.${path.basename(reportPath)}.${randomUUID()}.tmp`);
  let operationError;
  try {
    await writeFile(temporary, bytes, { encoding: 'utf8', flag: 'wx', mode: 0o600 });
    await rename(temporary, reportPath);
  } catch (error) {
    operationError = error;
  } finally {
    try { await unlink(temporary); } catch (error) {
      if ((!error || typeof error !== 'object' || error.code !== 'ENOENT') && !operationError) operationError = error;
    }
  }
  if (operationError) throw operationError;
}

function parseArguments(argv) {
  const values = new Map();
  for (let index = 0; index < argv.length; index += 2) {
    const name = argv[index];
    const value = argv[index + 1];
    if (!['--candidate', '--criterion', '--report'].includes(name) || !value || values.has(name)) throw new Error('invalid child layout arguments');
    values.set(name, value);
  }
  if (values.size !== 3) throw new Error('candidate, criterion and report are required');
  return { candidate: values.get('--candidate'), criterion: values.get('--criterion'), report: values.get('--report') };
}

export async function runChildLayoutCheck(argv, root = process.cwd()) {
  const options = parseArguments(argv);
  if (options.candidate !== EXPECTED_CANDIDATE) throw new Error(`unsupported candidate: ${options.candidate}`);
  if (options.criterion !== EXPECTED_CRITERION) throw new Error(`unsupported criterion: ${options.criterion}`);
  const expectedReport = path.resolve(root, '.hexaemeron', 'reports', 'conformance', `${EXPECTED_CANDIDATE}--${EXPECTED_CRITERION}.json`);
  const reportPath = path.resolve(root, options.report);
  if (reportPath !== expectedReport) throw new Error('report path is outside the declared layout slot');

  const sources = new Map(await Promise.all(SOURCE_FILES.map(async (relative) => [relative, await readBoundedRegularFile(path.join(root, relative))])));
  const childSource = sources.get('src/components/ChildStage.tsx').toString('utf8');
  const stylesSource = sources.get('src/styles.css').toString('utf8');
  const contractFindings = validateLayoutContractSource(childSource, stylesSource);
  if (contractFindings.length > 0) throw new Error(`child layout contract failed:\n${contractFindings.map((finding) => `- ${finding}`).join('\n')}`);
  const commit = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim();
  if (!/^[0-9a-f]{40}$/.test(commit)) throw new Error('git did not return one commit id');
  assertSourcesMatchCommit(root, commit, sources);
  const artifacts = await collectBuiltArtifacts(root);

  const chrome = await findChrome();
  const profile = await mkdtemp(path.join(tmpdir(), 'pip-child-layout-'));
  const { server, url } = await startDistServer(artifacts);
  const chromeProcess = spawn(chrome, [
    '--headless=new',
    '--remote-debugging-port=0',
    `--user-data-dir=${profile}`,
    '--no-first-run',
    '--no-default-browser-check',
    '--disable-background-networking',
    '--disable-component-update',
    '--disable-sync',
    '--metrics-recording-only',
    '--mute-audio',
    'about:blank',
  ], { stdio: 'ignore', shell: false });
  let client;
  try {
    const port = await waitForDevToolsFile(profile, chromeProcess);
    client = await connectCdp(port);
    await client.send('Page.enable');
    await client.send('Runtime.enable');
    const browserVersion = await client.send('Browser.getVersion');
    const measurements = [];
    for (const scenario of CHILD_LAYOUT_SCENARIOS) measurements.push(...await replayScenario(client, url, scenario));
    const findings = measurements.flatMap(validateLayoutMeasurement);
    if (findings.length > 0) throw new Error(`child layout measurements failed:\n${findings.map((finding) => `- ${finding}`).join('\n')}`);
    const report = {
      schema: 'child-layout-conformance/v1',
      candidate: EXPECTED_CANDIDATE,
      criterion: EXPECTED_CRITERION,
      status: 'pass',
      commit,
      chrome: { executable: path.basename(chrome), product: browserVersion.product, protocolVersion: browserVersion.protocolVersion },
      states: STATES,
      lessons: CHILD_LAYOUT_LESSONS,
      scenarios: CHILD_LAYOUT_SCENARIOS,
      measurements,
      sourceFiles: SOURCE_FILES,
      sourceSha256: Object.fromEntries(SOURCE_FILES.map((file) => [file, digest(sources.get(file))])),
      artifactFiles: [...artifacts.keys()],
      artifactSha256: Object.fromEntries([...artifacts].map(([file, bytes]) => [file, digest(bytes)])),
    };
    const bytes = `${JSON.stringify(report, null, 2)}\n`;
    if (Buffer.byteLength(bytes) > MAX_REPORT_BYTES) throw new Error('layout report exceeds its size limit');
    await writeReportSafely(root, reportPath, bytes);
    console.log(`child layout clean: ${measurements.length} state and viewport measurements`);
    return report;
  } finally {
    client?.socket.close();
    await stopChildProcess(chromeProcess);
    server.closeAllConnections();
    await new Promise((resolve) => server.close(resolve));
    await rm(profile, { recursive: true, force: true });
  }
}

const invokedPath = process.argv[1] ? path.resolve(process.argv[1]) : '';
if (invokedPath === fileURLToPath(import.meta.url)) await runChildLayoutCheck(process.argv.slice(2));
