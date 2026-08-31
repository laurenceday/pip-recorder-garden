import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
import {
  addMadePatternNote,
  compareRhythm,
  createPatternSchedule,
  guidePlaybackAt,
  lessonPatternNotes,
  madePatternIsReady,
  notesToPattern,
  removeMadePatternNote,
  startGuidePlayback,
  stopGuidePlayback,
} from '../src/lib/mission-loop.ts';

const root = process.cwd();
const lessonDirectory = path.join(root, 'content', 'lessons');
const catalogue = {
  lessons: (await Promise.all(
    (await readdir(lessonDirectory))
      .filter((name) => name.endsWith('.json'))
      .map(async (name) => JSON.parse(await readFile(path.join(lessonDirectory, name), 'utf8'))),
  )).sort((left, right) => left.order - right.order),
};
const lessonEight = catalogue.lessons.find((lesson) => lesson.id === 'two-note-echo');

test('the lesson 8 guide schedules the complete B A A B model', () => {
  const schedule = createPatternSchedule(lessonEight.pattern);
  assert.deepEqual(schedule.map(({ note, onsetMs, releaseMs, endMs }) => ({ note, onsetMs, releaseMs, endMs })), [
    { note: 'B5', onsetMs: 0, releaseMs: 490, endMs: 560 },
    { note: 'A5', onsetMs: 560, releaseMs: 1050, endMs: 1120 },
    { note: 'A5', onsetMs: 1120, releaseMs: 1610, endMs: 1680 },
    { note: 'B5', onsetMs: 1680, releaseMs: 2170, endMs: 2240 },
  ]);
});

test('guide scheduling preserves beat durations and a release before every next onset', () => {
  const schedule = createPatternSchedule([
    { note: 'B5', beats: 0.5 },
    { note: 'A5', beats: 2 },
    { note: 'G5', beats: 4 },
  ]);
  assert.deepEqual(schedule.map((event) => event.endMs - event.onsetMs), [280, 1120, 2240]);
  for (let index = 0; index < schedule.length - 1; index += 1) {
    assert.ok(schedule[index].releaseMs < schedule[index + 1].onsetMs);
  }
});

test('guide playback exposes pulse, natural finish, user stop and teardown states', () => {
  const schedule = createPatternSchedule(lessonEight.pattern);
  assert.deepEqual(startGuidePlayback(), { running: true, currentIndex: 0, reason: 'playing' });
  assert.deepEqual(guidePlaybackAt(schedule, 560), { running: true, currentIndex: 1, reason: 'playing' });
  assert.deepEqual(guidePlaybackAt(schedule, 2_240), { running: false, currentIndex: null, reason: 'finished' });
  assert.deepEqual(stopGuidePlayback('stopped'), { running: false, currentIndex: null, reason: 'stopped' });
  assert.deepEqual(stopGuidePlayback('hidden'), { running: false, currentIndex: null, reason: 'hidden' });
  assert.deepEqual(stopGuidePlayback('lesson-change'), { running: false, currentIndex: null, reason: 'lesson-change' });
  assert.deepEqual(stopGuidePlayback('complete'), { running: false, currentIndex: null, reason: 'complete' });
  assert.deepEqual(stopGuidePlayback('teardown'), { running: false, currentIndex: null, reason: 'teardown' });
});

test('the rhythm echo compares shape across different tempos', () => {
  const pattern = [
    { note: 'B5', beats: 1 },
    { note: 'B5', beats: 0.5 },
    { note: 'A5', beats: 1 },
    { note: 'B5', beats: 1 },
  ];
  assert.equal(compareRhythm(pattern, [100, 700, 1_000, 1_600]).kind, 'matched');
  assert.equal(compareRhythm(pattern, [100, 300, 1_300, 1_500]).kind, 'try-again');
  assert.deepEqual(compareRhythm(pattern, [100, 700]), {
    kind: 'waiting',
    expectedTaps: 4,
    receivedTaps: 2,
    largestDifference: null,
  });
});

test('one-note rhythm turns complete with one tap and malformed tap streams fail closed', () => {
  assert.equal(compareRhythm([{ note: 'B5', beats: 4 }], [250]).kind, 'matched');
  assert.throws(() => compareRhythm(lessonEight.pattern, [100, 100, 200, 300]), /increasing/);
  assert.throws(() => compareRhythm(lessonEight.pattern, [0, 100, 200, 300, 400]), /too many taps/);
});

test('made patterns stay between two and four notes from the current lesson', () => {
  const allowed = lessonPatternNotes(lessonEight.pattern);
  assert.deepEqual(allowed, ['B5', 'A5']);
  let made = addMadePatternNote([], 'B5', allowed);
  assert.equal(madePatternIsReady(made, allowed), false);
  made = addMadePatternNote(made, 'A5', allowed);
  assert.equal(madePatternIsReady(made, allowed), true);
  made = addMadePatternNote(made, 'A5', allowed);
  made = addMadePatternNote(made, 'B5', allowed);
  assert.deepEqual(addMadePatternNote(made, 'A5', allowed), made);
  assert.deepEqual(notesToPattern(made, allowed), made.map((note) => ({ note, beats: 1 })));
  assert.deepEqual(removeMadePatternNote(made), ['B5', 'A5', 'A5']);
  assert.throws(() => addMadePatternNote(made, 'G5', allowed), /not available/);
  assert.throws(() => notesToPattern(['B5'], allowed), /two to four/);
});

test('every lesson offers a closed in-memory maker vocabulary', () => {
  for (const lesson of catalogue.lessons) {
    const allowed = lessonPatternNotes(lesson.pattern);
    assert.ok(allowed.length >= 1);
    assert.ok(allowed.every((note) => lesson.pattern.some((step) => step.note === note)));
    const sample = notesToPattern([allowed[0], allowed[0]], allowed);
    assert.deepEqual(sample, [{ note: allowed[0], beats: 1 }, { note: allowed[0], beats: 1 }]);
  }
});

test('the guide hook owns resume failure, stop, hidden-tab and teardown cleanup', async () => {
  const source = await readFile(path.join(root, 'src', 'hooks', 'useGuideTone.ts'), 'utf8');
  assert.match(source, /contextRef\.current = context;\s*(?:setPlayback\(startGuidePlayback\(null\)\);\s*)?try \{\s*await context\.resume\(\);\s*\} catch \(error\) \{/);
  assert.match(source, /catch \(error\) \{\s*if \(run !== runRef\.current\) return false;\s*releaseResources\(\);\s*setPlayback\(stopGuidePlayback\('stopped'\)\);\s*throw error;/);
  assert.match(source, /document\.visibilityState === 'hidden'\) stop\('hidden'\)/);
  assert.match(source, /useEffect\(\(\) => \(\) => \{[\s\S]*releaseResources\(\);[\s\S]*resolveRef\.current\?\.\(false\)/);
});

test('all three copy routes and the grown-up route remain available without stored attempt data', async () => {
  const [app, progress] = await Promise.all([
    readFile(path.join(root, 'src', 'App.tsx'), 'utf8'),
    readFile(path.join(root, 'src', 'lib', 'progress.ts'), 'utf8'),
  ]);
  for (const copy of ['Play to Pip', 'Finger puzzle', 'Tap the rhythm', 'We copied it together']) assert.match(app, new RegExp(copy));
  assert.match(progress, /pip-recorder-garden\.completed\.v1/);
  for (const forbidden of ['attempt', 'score', 'tapTimes', 'madePattern', 'childName']) assert.doesNotMatch(progress, new RegExp(forbidden, 'i'));
});

test('the pattern maker freezes choices while sound plays and shows guide failure in place', async () => {
  const maker = await readFile(path.join(root, 'src', 'components', 'PatternMaker.tsx'), 'utf8');
  assert.match(maker, /disabled=\{playing \|\| notes\.length >= MAX_MADE_PATTERN_NOTES\}/);
  assert.match(maker, /guideIssue && <output className="mission-feedback">\{guideIssue\}<\/output>/);
  assert.match(maker, /playing \? \([\s\S]*onClick=\{onStop\}>Stop my tune/);
  assert.match(maker, /disabled=\{notes\.length === 0 \|\| playing\}/);
  assert.match(maker, /disabled=\{!ready \|\| playing\}/);
});

test('phone layout keeps the active mission first and child targets at least 44 pixels tall', async () => {
  const styles = await readFile(path.join(root, 'src', 'styles.css'), 'utf8');
  assert.match(styles, /@media \(max-width: 1050px\) \{[\s\S]*\.lesson-stage \{ grid-row: 1; \}[\s\S]*\.lesson-trail \{[^}]*grid-row: 2;/);
  for (const target of [
    ['base button', /\.button \{[\s\S]*?min-height: 50px;/],
    ['text button', /\.text-button \{ min-height: 44px;/],
    ['fingering hole', /\.hole-button \{[\s\S]*?min-height: 58px;/],
    ['rhythm pad', /\.rhythm-pad \{[\s\S]*?min-height: 112px;/],
    ['lesson choice', /\.trail-item button \{[\s\S]*?min-height: 58px;/],
  ]) assert.match(styles, target[1], `${target[0]} is missing its declared target size`);
});

test('the fingering route promises the maker only after its final pattern note', async () => {
  const [app, mission] = await Promise.all([
    readFile(path.join(root, 'src', 'App.tsx'), 'utf8'),
    readFile(path.join(root, 'src', 'components', 'FingeringMission.tsx'), 'utf8'),
  ]);
  assert.match(app, /isLast=\{fingeringIndex === lesson\.pattern\.length - 1\}/);
  assert.match(mission, /isLast \? 'Picture matched — make a tune' : 'Picture matched — next note'/);
});

test('fingering progress and explorer controls stay aligned with the active copy route', async () => {
  const app = await readFile(path.join(root, 'src', 'App.tsx'), 'utf8');
  assert.match(app, /copyActivity === 'fingering'\s*\? fingeringIndex\s*:\s*isExplorer/);
  assert.match(app, /onSelectNote=\{isExplorer && missionPhase === 'copy' && copyActivity === 'microphone' \? chooseExplorerNote : undefined\}/);
  assert.match(app, /explored=\{isExplorer && missionPhase === 'copy' && copyActivity === 'microphone' \? explored : undefined\}/);
});

test('choosing microphone copy does not request permission until the listen action', async () => {
  const app = await readFile(path.join(root, 'src', 'App.tsx'), 'utf8');
  assert.match(app, /className="copy-choice" type="button" onClick=\{\(\) => setCopyActivity\('microphone'\)\}/);
  assert.equal((app.match(/onClick=\{startListening\}/g) ?? []).length, 1);
  assert.match(app, />Let Pip listen<\/button>/);
});

test('microphone-free copy activities can return to the route chooser', async () => {
  const [app, fingering, rhythm] = await Promise.all([
    readFile(path.join(root, 'src', 'App.tsx'), 'utf8'),
    readFile(path.join(root, 'src', 'components', 'FingeringMission.tsx'), 'utf8'),
    readFile(path.join(root, 'src', 'components', 'RhythmEcho.tsx'), 'utf8'),
  ]);
  assert.match(app, /<FingeringMission[\s\S]*?onChooseAnother=\{\(\) => setCopyActivity\('choose'\)\}[\s\S]*?\/>/);
  assert.match(app, /<RhythmEcho[\s\S]*?onChooseAnother=\{\(\) => setCopyActivity\('choose'\)\}[\s\S]*?\/>/);
  assert.match(fingering, /onClick=\{onChooseAnother\}>Choose another way<\/button>/);
  assert.match(rhythm, /onClick=\{onChooseAnother\}>Choose another way<\/button>/);
  assert.doesNotMatch(rhythm, /Listen again/);
});

test('the maker offers a participation exit before two notes are chosen', async () => {
  const maker = await readFile(path.join(root, 'src', 'components', 'PatternMaker.tsx'), 'utf8');
  assert.match(maker, /!ready && \(\s*<button className="button button--soft" type="button" onClick=\{onComplete\}>Finish without a tune<\/button>/);
});

test('route-agnostic completion celebrates participation without claiming performance', async () => {
  const app = await readFile(path.join(root, 'src', 'App.tsx'), 'utf8');
  assert.match(app, /<h2>A flower grew for this musical turn!<\/h2>/);
  assert.doesNotMatch(app, /<h2>\{lesson\.successCue\}<\/h2>/);
});

test('guide highlights use the same start delay as audible Web Audio onsets', async () => {
  const [missionLoop, guide] = await Promise.all([
    readFile(path.join(root, 'src', 'lib', 'mission-loop.ts'), 'utf8'),
    readFile(path.join(root, 'src', 'hooks', 'useGuideTone.ts'), 'utf8'),
  ]);
  assert.match(missionLoop, /export const GUIDE_START_DELAY_MS = 40;/);
  assert.match(guide, /context\.currentTime \+ \(GUIDE_START_DELAY_MS \/ 1_000\)/);
  assert.match(guide, /event\.onsetMs \+ GUIDE_START_DELAY_MS/);
  assert.match(guide, /durationMs \+ GUIDE_START_DELAY_MS/);
});

test('guide controls lock before audio-context resume can yield without highlighting a note early', async () => {
  assert.deepEqual(startGuidePlayback(null), { running: true, currentIndex: null, reason: 'playing' });
  const [app, guide] = await Promise.all([
    readFile(path.join(root, 'src', 'App.tsx'), 'utf8'),
    readFile(path.join(root, 'src', 'hooks', 'useGuideTone.ts'), 'utf8'),
  ]);
  const lockedAt = guide.indexOf('setPlayback(startGuidePlayback(null))');
  const resumeAt = guide.indexOf('await context.resume()');
  assert.ok(lockedAt !== -1 && lockedAt < resumeAt);
  assert.match(guide, /await context\.resume\(\);\s*\} catch[\s\S]*if \(run !== runRef\.current\) return false;/);
  assert.match(app, /tone\.playing && missionPhase === 'model'\s*\? tone\.currentStep/);
  assert.match(app, /tone\.playing \? \(\s*<button[^>]*onClick=\{\(\) => tone\.stop\(\)\}>Stop the pattern<\/button>/);
  assert.match(app, /<button className="button button--soft" type="button" disabled=\{tone\.playing\} onClick=\{\(\) => setMissionPhase\('copy'\)\}>Copy without sound<\/button>/);
});

test('scripted mission navigation respects the reduced-motion preference', async () => {
  const missionLoop = await import('../src/lib/mission-loop.ts');
  assert.equal(typeof missionLoop.missionScrollBehavior, 'function');
  if (typeof missionLoop.missionScrollBehavior !== 'function') return;
  assert.equal(missionLoop.missionScrollBehavior(true), 'auto');
  assert.equal(missionLoop.missionScrollBehavior(false), 'smooth');
  const app = await readFile(path.join(root, 'src', 'App.tsx'), 'utf8');
  assert.match(app, /window\.matchMedia\('\(prefers-reduced-motion: reduce\)'\)\.matches/);
  assert.equal((app.match(/behavior: preferredScrollBehavior\(\)/g) ?? []).length, 3);
});

test('the standing mission decision documents the optional no-tune participation exit', async () => {
  const [decision, readme, verification] = await Promise.all([
    readFile(path.join(root, 'docs', 'decisions', 'ADR-004-guided-mission-loop.md'), 'utf8'),
    readFile(path.join(root, 'README.md'), 'utf8'),
    readFile(path.join(root, 'docs', 'verification.md'), 'utf8'),
  ]);
  for (const record of [decision, readme, verification]) assert.match(record, /Finish without a tune/);
});
