import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { CHILD_COPY_STATE_IDS, childCopyFor } from '../src/lib/child-copy.ts';
import { actOnChildTurn, createPatternSchedule, exitChildTurn, finishChildModel, startChildTurn } from '../src/lib/mission-loop.ts';
import { bindCommittedFiles, parseConformanceArguments, writeConformanceReport } from './child-conformance-common.mjs';

const CANDIDATE = 'one-screen-play-loop';
const CRITERIA = ['first-response-in-one-action', 'every-child-state-one-action-exit'];
const SOURCE_FILES = [
  'content/lessons/08-two-note-echo.json',
  'package-lock.json',
  'scripts/check-child-flow.mjs',
  'scripts/child-conformance-common.mjs',
  'src/App.tsx',
  'src/components/ChildStage.tsx',
  'src/components/GrownUpSetup.tsx',
  'src/lib/child-copy.ts',
  'src/lib/mission-loop.ts',
];

function firstResponseEvidence(lesson) {
  const ready = startChildTurn('sound');
  const firstAction = actOnChildTurn(ready, lesson.pattern.length);
  const response = finishChildModel(firstAction.state, lesson.pattern.length);
  const model = createPatternSchedule(lesson.pattern).map((event) => event.note);
  if (lesson.id !== 'two-note-echo' || JSON.stringify(model) !== JSON.stringify(['B5', 'A5', 'A5', 'B5'])) throw new Error('lesson 8 model drifted');
  if (firstAction.command !== 'play-model' || response.phase !== 'tap') throw new Error('first response is not available after one action');
  return { lessonId: lesson.id, model, userActionsToModel: 1, response: response.phase, routeShelfInChildTree: false };
}

function actionExitEvidence() {
  const screens = CHILD_COPY_STATE_IDS.map((state) => ({ state, ...childCopyFor(state), learningActionCount: 1, exitCount: 1 }));
  const done = { mode: 'sound', phase: 'done', tapIndex: 4 };
  const more = actOnChildTurn(done, 4);
  const returnFromMore = exitChildTurn(more.state, 4);
  if (screens.length !== 6 || screens.some((screen) => !screen.action || !screen.exit)) throw new Error('a child screen is missing its action or exit');
  if (more.state.phase !== 'more' || more.command !== 'none' || returnFromMore.state.phase !== 'done') throw new Error('the optional activity is not bounded and reversible');
  return { screens, doneStops: exitChildTurn(done, 4).command === 'leave', moreIsOptional: true, returnFromMore: returnFromMore.state.phase };
}

export async function runChildFlowCheck(argv, root = process.cwd()) {
  const options = parseConformanceArguments(argv, CANDIDATE, CRITERIA);
  const { commit, files, sourceSha256 } = await bindCommittedFiles(root, SOURCE_FILES);
  const lesson = JSON.parse(files.get('content/lessons/08-two-note-echo.json').toString('utf8'));
  const childSource = files.get('src/components/ChildStage.tsx').toString('utf8');
  if (/GrownUpSetup|copy-choice|microphone/i.test(childSource)) throw new Error('the child tree contains the grown-up route shelf');
  const evidence = options.criterion === CRITERIA[0] ? firstResponseEvidence(lesson) : actionExitEvidence();
  const report = { schema: 'child-flow-conformance/v1', candidate: CANDIDATE, criterion: options.criterion, status: 'pass', commit, evidence, sourceFiles: SOURCE_FILES, sourceSha256 };
  await writeConformanceReport(root, CANDIDATE, options.criterion, options.report, report);
  console.log(`child flow clean: ${options.criterion}`);
  return report;
}

const invoked = process.argv[1] ? path.resolve(process.argv[1]) : '';
if (invoked === fileURLToPath(import.meta.url)) await runChildFlowCheck(process.argv.slice(2));
