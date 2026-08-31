import { execFileSync } from 'node:child_process';
import process from 'node:process';
import { isAllowedAgentPath } from './lib/agent-boundary.mjs';

const output = execFileSync('git', ['status', '--porcelain=v1', '-z'], { encoding: 'utf8' });
const records = output.split('\0').filter(Boolean);
const changed = records.map((record) => record.slice(3));
const refused = changed.filter((filePath) => !isAllowedAgentPath(filePath));
if (refused.length) {
  for (const filePath of refused) process.stderr.write(`agent diff refuses path: ${filePath}\n`);
  process.exit(1);
}
process.stdout.write(`agent diff clean: ${changed.length} allowed path(s)\n`);
