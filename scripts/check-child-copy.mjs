import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { lstat, mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';
import {
  CHILD_COPY_MANIFEST,
  CHILD_COPY_STATE_IDS,
  CHILD_LEXICON,
  validateChildCopyManifest,
} from '../src/lib/child-copy.ts';

const EXPECTED_CANDIDATE = 'one-screen-play-loop';
const EXPECTED_CRITERION = 'rendered-child-copy-approved';
const MAX_SOURCE_BYTES = 1_048_576;
const MAX_CHILD_RENDER_SOURCES = 32;
const CHILD_ENTRY = 'src/components/ChildStage.tsx';
const CHILD_CONTRACT = 'src/lib/child-copy.ts';
const CHILD_STYLES = 'src/styles.css';
const VISIBLE_STRING_ATTRIBUTES = new Set([
  'alt',
  'aria-description',
  'aria-label',
  'aria-placeholder',
  'aria-valuetext',
  'children',
  'label',
  'placeholder',
  'title',
  'value',
]);
const ALLOWED_CHILD_EXPRESSIONS = new Set(['copy.action', 'copy.exit', 'copy.title', 'note']);

function digest(text) {
  return createHash('sha256').update(text).digest('hex');
}

function parseTsx(source, fileName) {
  return ts.createSourceFile(fileName, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
}

function importsFrom(sourceFile) {
  return sourceFile.statements
    .filter(ts.isImportDeclaration)
    .map((statement) => statement.moduleSpecifier)
    .filter(ts.isStringLiteral)
    .map((specifier) => specifier.text);
}

function jsxTagName(node, sourceFile) {
  return node.tagName.getText(sourceFile);
}

function jsxTagsWithin(node, sourceFile) {
  const tags = [];
  const visit = (child) => {
    if (ts.isJsxElement(child)) tags.push(jsxTagName(child.openingElement, sourceFile));
    if (ts.isJsxSelfClosingElement(child)) tags.push(jsxTagName(child, sourceFile));
    ts.forEachChild(child, visit);
  };
  visit(node);
  return tags;
}

function containsJsx(node) {
  let found = false;
  const visit = (child) => {
    if (child !== node && (ts.isJsxElement(child) || ts.isJsxSelfClosingElement(child) || ts.isJsxFragment(child))) {
      found = true;
      return;
    }
    if (!found) ts.forEachChild(child, visit);
  };
  visit(node);
  return found;
}

function validateChildRenderSource(source, fileName) {
  const findings = [];
  const sourceFile = parseTsx(source, fileName);
  for (const diagnostic of sourceFile.parseDiagnostics) {
    findings.push(`${fileName} has an unparseable TSX boundary at ${diagnostic.start ?? 0}`);
  }

  const visit = (node) => {
    if (ts.isJsxText(node) && node.text.trim()) {
      findings.push(`${fileName} contains raw child copy: ${JSON.stringify(node.text.trim())}`);
    }
    if (ts.isJsxAttribute(node) && VISIBLE_STRING_ATTRIBUTES.has(node.name.text)) {
      if (node.initializer && ts.isStringLiteral(node.initializer) && node.initializer.text) {
        findings.push(`${fileName} contains raw child copy in ${node.name.text}: ${JSON.stringify(node.initializer.text)}`);
      } else if (node.initializer && ts.isJsxExpression(node.initializer) && node.initializer.expression) {
        findings.push(`${fileName} contains dynamic child copy in ${node.name.text}`);
      }
    }
    if (ts.isJsxSpreadAttribute(node)) findings.push(`${fileName} contains a prop spread`);
    if (ts.isJsxAttribute(node) && node.name.text === 'dangerouslySetInnerHTML') {
      findings.push(`${fileName} contains raw HTML`);
    }
    if (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) {
      const tag = jsxTagName(node, sourceFile).toLowerCase();
      if (['canvas', 'embed', 'foreignobject', 'iframe', 'image', 'img', 'object', 'use'].includes(tag)) {
        findings.push(`${fileName} contains an uninspectable artwork path: ${tag}`);
      }
    }
    if (ts.isJsxExpression(node) && node.parent
      && (ts.isJsxElement(node.parent) || ts.isJsxFragment(node.parent))
      && node.expression && !containsJsx(node.expression)) {
      const expression = node.expression.getText(sourceFile).trim();
      if (!ALLOWED_CHILD_EXPRESSIONS.has(expression)) {
        findings.push(`${fileName} contains dynamic child copy outside the closed interface: ${expression}`);
      }
    }
    if (ts.isReturnStatement(node) && node.expression
      && (ts.isStringLiteral(node.expression) || ts.isNoSubstitutionTemplateLiteral(node.expression))) {
      findings.push(`${fileName} returns raw child copy: ${JSON.stringify(node.expression.text)}`);
    }
    if (ts.isCallExpression(node)) {
      const call = node.expression.getText(sourceFile);
      if (/(?:^|\.)(?:createElement|createPortal|insertAdjacentHTML|write)$/.test(call)) {
        findings.push(`${fileName} contains an imperative render escape: ${call}`);
      }
    }
    if (ts.isBinaryExpression(node) && ts.isPropertyAccessExpression(node.left)
      && ['innerHTML', 'innerText', 'textContent'].includes(node.left.name.text)) {
      findings.push(`${fileName} contains an imperative text escape: ${node.left.name.text}`);
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
  return findings;
}

async function readBoundedRegularFile(filePath) {
  const stat = await lstat(filePath);
  if (!stat.isFile() || stat.isSymbolicLink() || stat.size > MAX_SOURCE_BYTES) {
    throw new Error(`copy-boundary input must be one bounded regular file: ${filePath}`);
  }
  return readFile(filePath, 'utf8');
}

export function validateChildStageSource(source) {
  const findings = validateChildRenderSource(source, CHILD_ENTRY);
  if (typeof source !== 'string' || source.length === 0) return ['child stage source is missing'];
  if (!source.includes('data-copy-role="child"')) findings.push('child stage is missing its child role marker');
  if (!source.includes('childCopyFor(state)')) findings.push('child stage does not resolve copy through the closed state map');
  if (!source.includes('data-child-copy-id={`${state}.title`}')) findings.push('child title is not joined to its manifest id');
  if (!source.includes('data-child-copy-id={`${state}.action`}')) findings.push('child action is not joined to its manifest id');
  if (!source.includes('data-child-copy-id={`${state}.exit`}')) findings.push('child exit is not joined to its manifest id');
  if (!source.includes('data-child-copy-id={`all.note.${note.toLowerCase()}`}')) findings.push('child note is not joined to its manifest id');

  const imports = importsFrom(parseTsx(source, CHILD_ENTRY));
  const allowedImports = new Set(['./GardenMark.tsx', '../lib/child-copy.ts']);
  for (const imported of imports) {
    if (!allowedImports.has(imported)) findings.push(`child stage imports an undeclared render path: ${imported}`);
  }
  for (const pattern of [
    ['opposite copy role', /\b(?:GrownUpSetup|grown-up|adultCue|childCue|successCue|story|tips)\b/],
    ['dynamic error copy', /\b(?:error|issue|message|feedback)\b/i],
  ]) {
    if (pattern[1].test(source)) findings.push(`child stage contains ${pattern[0]}`);
  }
  if (!/interface ChildStageProps \{\s*state: ChildCopyState;\s*notes: readonly ChildNoteLetter\[\];\s*onAction: \(\) => void;\s*onBack: \(\) => void;\s*\}/.test(source)) {
    findings.push('child stage props are outside the closed state, note and action interface');
  }
  return findings;
}

export function validateRoleMountSource(appSource, grownUpSource) {
  const findings = [];
  const appFile = parseTsx(appSource, 'src/App.tsx');
  const grownUpFile = parseTsx(grownUpSource, 'src/components/GrownUpSetup.tsx');
  const grownUpRole = [...grownUpSource.matchAll(/data-copy-role\s*=\s*["']grown-up["']/g)].length;
  if (grownUpRole !== 1) findings.push('grown-up tree is missing its one role marker');
  if (jsxTagsWithin(grownUpFile, grownUpFile).includes('ChildStage')) findings.push('grown-up tree mounts the child stage');

  const childMounts = [];
  const grownUpMounts = [];
  const collectMounts = (node) => {
    if (ts.isJsxSelfClosingElement(node) || ts.isJsxOpeningElement(node)) {
      const tag = jsxTagName(node, appFile);
      if (tag === 'ChildStage') childMounts.push(node);
      if (tag === 'GrownUpSetup') grownUpMounts.push(node);
    }
    ts.forEachChild(node, collectMounts);
  };
  collectMounts(appFile);
  if (childMounts.length !== 1) findings.push('App must have exactly one child-tree mount');
  if (grownUpMounts.length !== 1) findings.push('App must have exactly one grown-up-tree mount');
  if (childMounts.length === 1) {
    const attributes = childMounts[0].attributes.properties;
    const names = attributes.filter(ts.isJsxAttribute).map((attribute) => attribute.name.text).sort();
    if (attributes.some(ts.isJsxSpreadAttribute)
      || JSON.stringify(names) !== JSON.stringify(['notes', 'onAction', 'onBack', 'state'])) {
      findings.push('App passes props outside the closed child interface');
    }
  }

  const appFunction = appFile.statements.find((statement) => ts.isFunctionDeclaration(statement) && statement.name?.text === 'App');
  const statements = appFunction?.body?.statements ?? [];
  const childBranchIndex = statements.findIndex((statement) => ts.isIfStatement(statement)
    && statement.expression.getText(appFile) === 'childMode');
  const childBranch = childBranchIndex >= 0 ? statements[childBranchIndex] : null;
  const childReturn = childBranch && ts.isIfStatement(childBranch)
    ? (ts.isBlock(childBranch.thenStatement)
      ? childBranch.thenStatement.statements.find(ts.isReturnStatement)
      : (ts.isReturnStatement(childBranch.thenStatement) ? childBranch.thenStatement : null))
    : null;
  const grownUpReturn = statements.slice(childBranchIndex + 1).find(ts.isReturnStatement);
  const childReturnTags = childReturn?.expression ? jsxTagsWithin(childReturn.expression, appFile) : [];
  const grownUpReturnTags = grownUpReturn?.expression ? jsxTagsWithin(grownUpReturn.expression, appFile) : [];
  if (!childReturn || childReturnTags.filter((tag) => tag === 'ChildStage').length !== 1
    || childReturnTags.includes('GrownUpSetup') || childBranch?.elseStatement) {
    findings.push('App does not return only the child tree from its child-mode branch');
  }
  if (!grownUpReturn || grownUpReturnTags.filter((tag) => tag === 'GrownUpSetup').length !== 1
    || grownUpReturnTags.includes('ChildStage')) {
    findings.push('App does not return only the grown-up tree after its child-mode branch');
  }
  return findings;
}

export function validateChildStylesSource(source) {
  const findings = [];
  const masked = source.replace(/\/\*[\s\S]*?\*\//g, '');
  if (/\\/.test(masked)) findings.push('child copy stylesheet contains escaped tokens');
  if (/(?:@import|url\s*\()/i.test(masked)) findings.push('child copy stylesheet contains an uninspectable artwork source');
  for (const match of masked.matchAll(/(?:^|[;{}])\s*content\s*:\s*([^;}]+)/gi)) {
    const value = match[1].trim();
    if (!['""', "''", 'none', 'normal'].includes(value)) {
      findings.push(`child copy stylesheet contains generated copy: ${value}`);
    }
  }
  return findings;
}

async function collectChildRenderSources(root) {
  const sources = new Map();
  const findings = [];
  const pending = [CHILD_ENTRY];
  while (pending.length > 0) {
    const relative = pending.shift();
    if (sources.has(relative)) continue;
    if (sources.size >= MAX_CHILD_RENDER_SOURCES) throw new Error('child render source count exceeds its boundary');
    const source = await readBoundedRegularFile(path.join(root, relative));
    sources.set(relative, source);
    findings.push(...validateChildRenderSource(source, relative));
    const sourceFile = parseTsx(source, relative);
    for (const imported of importsFrom(sourceFile)) {
      if (imported === 'react' || imported === 'react/jsx-runtime') continue;
      if (!imported.startsWith('.')) {
        findings.push(`${relative} imports an undeclared package render path: ${imported}`);
        continue;
      }
      const resolved = path.posix.normalize(path.posix.join(path.posix.dirname(relative), imported));
      if (resolved === CHILD_CONTRACT) continue;
      if (!resolved.startsWith('src/components/') || !resolved.endsWith('.tsx')) {
        findings.push(`${relative} imports an undeclared child render path: ${imported}`);
        continue;
      }
      pending.push(resolved);
    }
  }
  return { findings, sources };
}

function assertSourcesMatchCommit(root, commit, sources) {
  for (const [relative, source] of sources) {
    let committed;
    try {
      committed = execFileSync('git', ['show', `${commit}:${relative}`], {
        cwd: root,
        encoding: 'utf8',
        maxBuffer: MAX_SOURCE_BYTES + 1,
      });
    } catch {
      throw new Error(`copy-boundary input is absent from commit ${commit}: ${relative}`);
    }
    if (committed !== source) throw new Error(`copy-boundary input does not match commit ${commit}: ${relative}`);
  }
}

function parseArguments(argv) {
  const values = new Map();
  for (let index = 0; index < argv.length; index += 2) {
    const name = argv[index];
    const value = argv[index + 1];
    if (!['--candidate', '--criterion', '--report'].includes(name) || !value || values.has(name)) {
      throw new Error('usage: node scripts/check-child-copy.mjs --candidate one-screen-play-loop --criterion rendered-child-copy-approved --report .hexaemeron/reports/conformance/one-screen-play-loop--rendered-child-copy-approved.json');
    }
    values.set(name, value);
  }
  if (values.size !== 3) throw new Error('candidate, criterion and report are required');
  return {
    candidate: values.get('--candidate'),
    criterion: values.get('--criterion'),
    report: values.get('--report'),
  };
}

export async function runChildCopyCheck(argv, root = process.cwd()) {
  const options = parseArguments(argv);
  if (options.candidate !== EXPECTED_CANDIDATE) throw new Error(`unsupported candidate: ${options.candidate}`);
  if (options.criterion !== EXPECTED_CRITERION) throw new Error(`unsupported criterion: ${options.criterion}`);
  const expectedReport = path.resolve(root, '.hexaemeron', 'reports', 'conformance', `${EXPECTED_CANDIDATE}--${EXPECTED_CRITERION}.json`);
  const reportPath = path.resolve(root, options.report);
  if (reportPath !== expectedReport) throw new Error('report path is outside the declared conformance slot');

  const paths = {
    app: path.join(root, 'src', 'App.tsx'),
    grownUp: path.join(root, 'src', 'components', 'GrownUpSetup.tsx'),
    contract: path.join(root, 'src', 'lib', 'child-copy.ts'),
    styles: path.join(root, 'src', 'styles.css'),
  };
  const [appSource, grownUpSource, contractSource, stylesSource, childRender] = await Promise.all([
    readBoundedRegularFile(paths.app),
    readBoundedRegularFile(paths.grownUp),
    readBoundedRegularFile(paths.contract),
    readBoundedRegularFile(paths.styles),
    collectChildRenderSources(root),
  ]);
  const childSource = childRender.sources.get(CHILD_ENTRY) ?? '';
  const findings = [
    ...validateChildCopyManifest(CHILD_COPY_MANIFEST),
    ...validateChildStageSource(childSource),
    ...childRender.findings,
    ...validateChildStylesSource(stylesSource),
    ...validateRoleMountSource(appSource, grownUpSource),
  ];
  if (findings.length > 0) throw new Error(`child copy boundary failed:\n${findings.map((finding) => `- ${finding}`).join('\n')}`);

  const commit = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim();
  if (!/^[0-9a-f]{40}$/.test(commit)) throw new Error('git did not return one commit id');
  const boundSources = new Map([
    ['src/App.tsx', appSource],
    ['src/components/GrownUpSetup.tsx', grownUpSource],
    [CHILD_CONTRACT, contractSource],
    [CHILD_STYLES, stylesSource],
    ...childRender.sources,
  ]);
  assertSourcesMatchCommit(root, commit, boundSources);
  const sourceFiles = [...boundSources.keys()].sort();
  const report = {
    schema: 'child-copy-conformance/v1',
    candidate: EXPECTED_CANDIDATE,
    criterion: EXPECTED_CRITERION,
    status: 'pass',
    commit,
    roleResult: 'separate-conditional-mounts',
    stateIds: CHILD_COPY_STATE_IDS,
    manifestEntries: CHILD_COPY_MANIFEST.length,
    lexicon: CHILD_LEXICON,
    rejectedTokens: [],
    sourceFiles,
    sourceSha256: Object.fromEntries(sourceFiles.map((file) => [file, digest(boundSources.get(file))])),
  };
  await mkdir(path.dirname(reportPath), { recursive: true });
  await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, { encoding: 'utf8', flag: 'w', mode: 0o600 });
  console.log(`child copy clean: ${CHILD_COPY_MANIFEST.length} manifest entries, ${CHILD_LEXICON.length} lexicon tokens, 4 declared states`);
  return report;
}

const invokedPath = process.argv[1] ? path.resolve(process.argv[1]) : '';
if (invokedPath === fileURLToPath(import.meta.url)) {
  await runChildCopyCheck(process.argv.slice(2));
}
