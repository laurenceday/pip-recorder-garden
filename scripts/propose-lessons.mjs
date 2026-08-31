import { constants } from 'node:fs';
import { access, mkdir, readFile, rename, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { buildAgentPrompt, extractProposalPayload, markIdeasComplete, parseIdeaInbox, proposalFileName, readFixture, requestAgentText, resolveProviderConfig, validateProposalBatch } from './lib/agent-boundary.mjs';
import { loadLessons, readJsonFileBounded } from './lib/lesson-contract.mjs';

function argumentValue(name) {
  const index = process.argv.indexOf(name);
  return index === -1 ? null : process.argv[index + 1];
}

const projectRoot = process.cwd();
const dryRun = process.argv.includes('--dry-run');
const fixturePath = argumentValue('--fixture');
const inboxArgument = argumentValue('--inbox');
const maximum = Number(argumentValue('--max') || 3);
if (!Number.isInteger(maximum) || maximum < 1 || maximum > 3) throw new Error('--max must be an integer from 1 to 3');
if (inboxArgument && !dryRun) throw new Error('--inbox is allowed only with --dry-run');

const inboxPath = inboxArgument ? path.resolve(projectRoot, inboxArgument) : path.join(projectRoot, 'LESSON_IDEAS.md');
if (inboxArgument && !inboxPath.startsWith(`${path.join(projectRoot, 'tests', 'fixtures')}${path.sep}`)) {
  throw new Error('--inbox must stay inside tests/fixtures');
}
const schemaPath = path.join(projectRoot, 'schema', 'lesson.schema.json');
const inbox = await readFile(inboxPath, 'utf8');
const allIdeas = parseIdeaInbox(inbox);
const selectedIdeas = allIdeas.filter((idea) => idea.pending).slice(0, maximum);
if (!selectedIdeas.length) {
  process.stdout.write('lesson agent: no pending ideas\n');
  process.exit(0);
}

const schema = await readJsonFileBounded(schemaPath);
const existingLessons = await loadLessons(projectRoot);
const prompt = buildAgentPrompt({ ideas: selectedIdeas, schema, existingLessons });
let agentText;
let providerLabel = 'fixture';
if (fixturePath) {
  agentText = await readFixture(path.resolve(projectRoot, fixturePath));
} else {
  const config = resolveProviderConfig();
  providerLabel = `${config.provider}/${config.model}`;
  agentText = await requestAgentText(config, prompt);
}

const payload = extractProposalPayload(agentText);
const errors = validateProposalBatch(payload, selectedIdeas, existingLessons);
if (errors.length) {
  for (const error of errors) process.stderr.write(`lesson agent: ${error}\n`);
  process.exit(1);
}

if (dryRun) {
  process.stdout.write(`lesson agent dry-run clean: ${payload.lessons.length} proposal(s) via ${providerLabel}\n`);
  process.exit(0);
}

const lessonRoot = path.join(projectRoot, 'content', 'lessons');
await mkdir(lessonRoot, { recursive: true });
const targets = payload.lessons.map((lesson) => ({
  lesson,
  target: path.join(lessonRoot, proposalFileName(lesson)),
}));
for (const { target } of targets) {
  try {
    await access(target, constants.F_OK);
    throw new Error(`refusing to overwrite ${path.relative(projectRoot, target)}`);
  } catch (error) {
    if (error?.code !== 'ENOENT') throw error;
  }
}

const created = [];
const inboxTemporary = `${inboxPath}.agent-${process.pid}.tmp`;
try {
  for (const { lesson, target } of targets) {
    await writeFile(target, `${JSON.stringify(lesson, null, 2)}\n`, { encoding: 'utf8', mode: 0o644, flag: 'wx' });
    created.push(target);
  }
  const nextInbox = markIdeasComplete(inbox, selectedIdeas.map((idea) => idea.id));
  await writeFile(inboxTemporary, nextInbox, { encoding: 'utf8', mode: 0o644, flag: 'wx' });
  await rename(inboxTemporary, inboxPath);
} catch (error) {
  await unlink(inboxTemporary).catch(() => {});
  for (const target of created) await unlink(target).catch(() => {});
  throw error;
}

process.stdout.write(`lesson agent wrote ${targets.length} proposal(s) via ${providerLabel}: ${selectedIdeas.map((idea) => idea.id).join(', ')}\n`);
