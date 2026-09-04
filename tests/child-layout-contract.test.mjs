import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
import * as layoutCheck from '../scripts/check-child-layout.mjs';

const root = process.cwd();

test('the child layout matrix closes phone, tablet, landscape and enlarged text', () => {
  assert.deepEqual(layoutCheck.CHILD_LAYOUT_LESSONS, ['meet-b', 'octave-garden']);
  assert.deepEqual(layoutCheck.CHILD_LAYOUT_SCENARIOS, [
    { id: 'phone-320', width: 320, height: 568, textScale: 1, reducedMotion: false },
    { id: 'phone-391', width: 391, height: 844, textScale: 1, reducedMotion: false },
    { id: 'tablet-768', width: 768, height: 1024, textScale: 1, reducedMotion: false },
    { id: 'landscape-568', width: 568, height: 320, textScale: 1, reducedMotion: false },
    { id: 'phone-320-text-200', width: 320, height: 568, textScale: 2, reducedMotion: true },
    { id: 'phone-320-safe-area', width: 320, height: 568, textScale: 1, reducedMotion: false, safeInsets: { top: 44, right: 0, bottom: 34, left: 0 } },
  ]);
});

test('the child source keeps one-screen, safe-area, focus and target contracts', async () => {
  assert.equal(typeof layoutCheck.validateLayoutContractSource, 'function');
  const [childSource, stylesSource] = await Promise.all([
    readFile(path.join(root, 'src', 'components', 'ChildStage.tsx'), 'utf8'),
    readFile(path.join(root, 'src', 'styles.css'), 'utf8'),
  ]);
  assert.deepEqual(layoutCheck.validateLayoutContractSource(childSource, stylesSource), []);
  assert.match(layoutCheck.validateLayoutContractSource(childSource, stylesSource.replace('height: 100dvh;', '')).join('\n'), /dynamic viewport height/);
  assert.match(layoutCheck.validateLayoutContractSource(childSource.replace('actionRef.current?.focus();', ''), stylesSource).join('\n'), /initial child focus/);
  assert.match(layoutCheck.validateLayoutContractSource(childSource, stylesSource.replace('env(safe-area-inset-bottom)', '0px')).join('\n'), /safe-area bottom/);
  assert.match(layoutCheck.validateLayoutContractSource(childSource, stylesSource.replace('.child-stage .note-stone {\n  min-width: 64px;', '.child-stage .note-stone {\n  min-width: 48px;')).join('\n'), /64 pixel child note action/);
  assert.match(layoutCheck.validateLayoutContractSource(`// actionRef.current?.focus()\n${childSource.replace('actionRef.current?.focus();', '')}`, stylesSource).join('\n'), /initial child focus/);
  assert.match(layoutCheck.validateLayoutContractSource(childSource, `/* height: 100dvh */\n${stylesSource.replace('height: 100dvh;', '')}`).join('\n'), /dynamic viewport height/);
});

test('measurement acceptance rejects scroll, small text, small or clipped actions and lost focus', () => {
  assert.equal(typeof layoutCheck.validateLayoutMeasurement, 'function');
  const clean = {
    scenario: 'phone-320',
    lesson: 'meet-b',
    state: 'ready',
    viewportWidth: 320,
    viewportHeight: 568,
    scrollWidth: 320,
    scrollHeight: 568,
    smallestTextPx: 20,
    smallestTargetWidth: 64,
    smallestTargetHeight: 64,
    exitActionCount: 1,
    actionsInsideViewport: true,
    essentialsInsideCard: true,
    essentialsInsideSafeArea: true,
    focusInsideChild: true,
  };
  assert.deepEqual(layoutCheck.validateLayoutMeasurement(clean), []);
  for (const [field, value, finding] of [
    ['scrollWidth', 322, 'horizontal overflow'],
    ['scrollHeight', 570, 'document overflow'],
    ['smallestTextPx', 19.9, 'below 20 pixels'],
    ['smallestTargetWidth', 63.9, 'below 64 by 64'],
    ['smallestTargetHeight', 63.9, 'below 64 by 64'],
    ['exitActionCount', 0, 'one reachable exit'],
    ['actionsInsideViewport', false, 'clipped'],
    ['essentialsInsideCard', false, 'clips essential'],
    ['essentialsInsideSafeArea', false, 'outside the safe area'],
    ['focusInsideChild', false, 'move focus'],
  ]) {
    assert.match(layoutCheck.validateLayoutMeasurement({ ...clean, [field]: value }).join('\n'), new RegExp(finding));
  }
});
