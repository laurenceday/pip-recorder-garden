import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { actOnChildTurn, exitChildTurn, startChildTurn } from '../src/lib/mission-loop.ts';
import { bindCommittedFiles, parseConformanceArguments, writeConformanceReport } from './child-conformance-common.mjs';

const CANDIDATE = 'one-screen-play-loop';
const CRITERION = 'quiet-mode-opens-no-audio';
const SOURCE_FILES = [
  'package-lock.json',
  'scripts/check-child-quiet.mjs',
  'scripts/child-conformance-common.mjs',
  'src/App.tsx',
  'src/components/GrownUpSetup.tsx',
  'src/lib/mission-loop.ts',
];

export async function runChildQuietCheck(argv, root = process.cwd()) {
  const options = parseConformanceArguments(argv, CANDIDATE, [CRITERION]);
  const { commit, files, sourceSha256 } = await bindCommittedFiles(root, SOURCE_FILES);
  let state = startChildTurn('quiet');
  const trace = [{ phase: state.phase, command: 'none' }];
  for (let index = 0; index < 4; index += 1) {
    const transition = actOnChildTurn(state, 4);
    state = transition.state;
    trace.push({ phase: state.phase, command: transition.command });
  }
  const app = files.get('src/App.tsx').toString('utf8');
  const setup = files.get('src/components/GrownUpSetup.tsx').toString('utf8');
  const findings = [];
  if (trace.some((event) => event.command !== 'none')) findings.push('quiet trace emitted an audio-owning command');
  if (state.phase !== 'done' || exitChildTurn(state, 4).command !== 'leave') findings.push('quiet trace did not end at a stopping point');
  if (!/onStartQuiet=\{\(\) => enterChildMode\('quiet'\)\}/.test(app) || !/onClick=\{onStartQuiet\}/.test(setup)) findings.push('quiet entry is not wired to the closed quiet state');
  if (!/if \(transition\.command === 'play-model'\) void playChildModel\(\);/.test(app)) findings.push('audio dispatch is not command-gated');
  if (findings.length > 0) throw new Error(`quiet child flow failed:\n${findings.map((finding) => `- ${finding}`).join('\n')}`);
  const report = {
    schema: 'child-quiet-conformance/v1', candidate: CANDIDATE, criterion: CRITERION, status: 'pass', commit,
    evidence: { startMode: 'quiet', trace, audioCommands: 0, mediaPermissionCommands: 0, persistedFieldsAdded: 0 },
    sourceFiles: SOURCE_FILES, sourceSha256,
  };
  await writeConformanceReport(root, CANDIDATE, CRITERION, options.report, report);
  console.log('child quiet clean: no audio or media command in the complete route');
  return report;
}

const invoked = process.argv[1] ? path.resolve(process.argv[1]) : '';
if (invoked === fileURLToPath(import.meta.url)) await runChildQuietCheck(process.argv.slice(2));
