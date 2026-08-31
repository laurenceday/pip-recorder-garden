import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';

const root = process.cwd();

async function workflow(name) {
  return readFile(path.join(root, '.github', 'workflows', name), 'utf8');
}

test('workflow actions are immutable SHA pins with visible release comments', async () => {
  for (const name of ['ci.yml', 'pages.yml', 'agent-lessons.yml']) {
    const text = await workflow(name);
    const uses = [...text.matchAll(/^\s*uses:\s+([^\s#]+)(?:\s+#\s+(v[0-9]+))?$/gm)];
    assert.ok(uses.length > 0, `${name} has no actions`);
    for (const match of uses) {
      assert.match(match[1], /^[a-z0-9_-]+\/[a-z0-9_-]+@[0-9a-f]{40}$/i, `${name} contains a mutable action reference`);
      assert.match(match[2] ?? '', /^v[0-9]+$/, `${name} hides the pinned release family`);
    }
  }
});

test('Pages uploads only a verified dist artifact and isolates deployment permission', async () => {
  const pages = await workflow('pages.yml');
  assert.match(pages, /run: npm run verify:local/);
  assert.match(pages, /path: dist/);
  assert.match(pages, /needs: build/);
  assert.match(pages, /pages: write/);
  assert.match(pages, /id-token: write/);
  assert.doesNotMatch(pages, /pull_request_target/);
});

test('the lesson agent proposes through a checked branch and has no merge path', async () => {
  const agent = await workflow('agent-lessons.yml');
  const packageJson = JSON.parse(await readFile(path.join(root, 'package.json'), 'utf8'));
  assert.match(agent, /npm run check-agent-diff/);
  assert.equal(packageJson.scripts['check-agent-diff'], 'node scripts/check-agent-diff.mjs');
  assert.match(agent, /npm run check/);
  assert.match(agent, /git add LESSON_IDEAS\.md content\/lessons/);
  assert.match(agent, /gh pr create/);
  assert.doesNotMatch(agent, /gh pr merge|git push origin (?:HEAD:)?main|pull_request_target/);
  assert.doesNotMatch(agent, /github-models/);
});

test('the lesson provider credential exists only in the model invocation step', async () => {
  const agent = await workflow('agent-lessons.yml');
  const jobHeader = agent.slice(agent.indexOf('  propose:'), agent.indexOf('    steps:'));
  const modelStepStart = agent.indexOf('      - name: Interpret at most three pending ideas');
  const modelStepEnd = agent.indexOf('      - name:', modelStepStart + 8);
  const modelStep = agent.slice(modelStepStart, modelStepEnd);
  assert.doesNotMatch(jobHeader, /LESSON_AGENT_API_KEY/);
  assert.match(modelStep, /LESSON_AGENT_API_KEY: \$\{\{ secrets\.LESSON_AGENT_API_KEY \}\}/);
  assert.match(modelStep, /LESSON_AGENT_BASE_URL: \$\{\{ vars\.LESSON_AGENT_BASE_URL \}\}/);
  assert.doesNotMatch(agent, /inputs\.base_url|^\s+base_url:/m);
  assert.equal(agent.split('\n').filter((line) => line.includes('LESSON_AGENT_API_KEY')).length, 1);
});
