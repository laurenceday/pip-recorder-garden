import { createHash, randomUUID } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { lstat, mkdir, readFile, rename, unlink, writeFile } from 'node:fs/promises';
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
const RUNTIME_ENTRY = 'src/main.tsx';
const HTML_SHELL = 'index.html';
const CHECKER_SOURCE = 'scripts/check-child-copy.mjs';
const PACKAGE_MANIFEST = 'package.json';
const PACKAGE_LOCK = 'package-lock.json';
const VISIBLE_STRING_ATTRIBUTES = new Set([
  'alt',
  'aria-description',
  'aria-label',
  'aria-placeholder',
  'aria-roledescription',
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

function unwrappedExpression(node) {
  let current = node;
  while (ts.isParenthesizedExpression(current)) current = current.expression;
  return current;
}

function bindingIdentifiers(name) {
  if (ts.isIdentifier(name)) return [name.text];
  return name.elements.flatMap((element) => ts.isOmittedExpression(element) ? [] : bindingIdentifiers(element.name));
}

function approvedChildOutputs(node, sourceFile) {
  const expression = unwrappedExpression(node);
  const text = expression.getText(sourceFile).trim();
  if (ALLOWED_CHILD_EXPRESSIONS.has(text)) return [text];
  if (ts.isConditionalExpression(expression)) {
    return [
      ...approvedChildOutputs(expression.whenTrue, sourceFile),
      ...approvedChildOutputs(expression.whenFalse, sourceFile),
    ];
  }
  return [];
}

function copyIdOnElement(element, sourceFile) {
  const opening = ts.isJsxElement(element) ? element.openingElement : element;
  const attribute = opening.attributes.properties.find((property) => ts.isJsxAttribute(property)
    && String(property.name.text).toLowerCase() === 'data-child-copy-id');
  if (!attribute || !ts.isJsxAttribute(attribute) || !attribute.initializer
    || !ts.isJsxExpression(attribute.initializer) || !attribute.initializer.expression) return null;
  return attribute.initializer.expression.getText(sourceFile);
}

function validateChildOutputExpression(node, sourceFile, fileName) {
  const expression = unwrappedExpression(node);
  if (ts.isJsxElement(expression) || ts.isJsxSelfClosingElement(expression) || ts.isJsxFragment(expression)) return [];
  const text = expression.getText(sourceFile).trim();
  if (ALLOWED_CHILD_EXPRESSIONS.has(text)) return [];
  if (expression.kind === ts.SyntaxKind.NullKeyword
    || expression.kind === ts.SyntaxKind.TrueKeyword
    || expression.kind === ts.SyntaxKind.FalseKeyword) return [];
  if (ts.isConditionalExpression(expression)) {
    return [
      ...validateChildOutputExpression(expression.whenTrue, sourceFile, fileName),
      ...validateChildOutputExpression(expression.whenFalse, sourceFile, fileName),
    ];
  }
  if (ts.isCallExpression(expression)
    && ts.isPropertyAccessExpression(expression.expression)
    && expression.expression.expression.getText(sourceFile) === 'notes'
    && expression.expression.name.text === 'map'
    && expression.arguments.length === 1
    && ts.isArrowFunction(expression.arguments[0])) {
    const body = expression.arguments[0].body;
    if (!ts.isBlock(body)) return validateChildOutputExpression(body, sourceFile, fileName);
  }
  return [`${fileName} contains dynamic child copy outside the closed interface: ${text}`];
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
    const attributeName = ts.isJsxAttribute(node) ? String(node.name.text).toLowerCase() : '';
    if (ts.isJsxAttribute(node) && VISIBLE_STRING_ATTRIBUTES.has(attributeName)) {
      if (node.initializer && ts.isStringLiteral(node.initializer) && node.initializer.text) {
        findings.push(`${fileName} contains raw child copy in ${attributeName}: ${JSON.stringify(node.initializer.text)}`);
      } else if (node.initializer && ts.isJsxExpression(node.initializer) && node.initializer.expression) {
        findings.push(`${fileName} contains dynamic child copy in ${attributeName}`);
      } else if (!node.initializer) {
        findings.push(`${fileName} contains implicit child copy in ${attributeName}`);
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
      && node.expression) {
      findings.push(...validateChildOutputExpression(node.expression, sourceFile, fileName));
    }
    if (ts.isReturnStatement(node) && node.expression
      && (ts.isStringLiteral(node.expression) || ts.isNoSubstitutionTemplateLiteral(node.expression))) {
      findings.push(`${fileName} returns raw child copy: ${JSON.stringify(node.expression.text)}`);
    }
    if (ts.isCallExpression(node)) {
      const call = node.expression.getText(sourceFile);
      if (node.expression.kind === ts.SyntaxKind.ImportKeyword
        || /(?:^|\.)(?:append|cloneElement|createElement|createPortal|createRoot|createTextNode|insertAdjacentHTML|insertAdjacentText|lazy|prepend|render|replaceChildren|require|setAttribute|setAttributeNS|write|writeln)$/.test(call)) {
        findings.push(`${fileName} contains an imperative render escape: ${call}`);
      }
    }
    if (ts.isBinaryExpression(node) && ts.isPropertyAccessExpression(node.left)
      && ['innerHTML', 'innerText', 'nodeValue', 'outerHTML', 'textContent', 'title'].includes(node.left.name.text)) {
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
  const sourceFile = parseTsx(source, CHILD_ENTRY);
  let roleMarkers = 0;
  const copyIds = new Map();
  const outputCounts = new Map();
  const protectedBindings = new Map();
  const copyDeclarations = [];
  const noteMapCallbacks = [];
  const childStageFunctions = sourceFile.statements.filter((statement) => ts.isFunctionDeclaration(statement)
    && statement.name?.text === 'ChildStage');
  const rememberBinding = (name) => {
    for (const identifier of bindingIdentifiers(name)) {
      protectedBindings.set(identifier, (protectedBindings.get(identifier) ?? 0) + 1);
    }
  };
  const inspectContract = (node) => {
    if (ts.isParameter(node) || ts.isVariableDeclaration(node)) rememberBinding(node.name);
    if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.name.text === 'copy') copyDeclarations.push(node);
    if (ts.isCallExpression(node) && ts.isPropertyAccessExpression(node.expression)
      && node.expression.expression.getText(sourceFile) === 'notes' && node.expression.name.text === 'map'
      && node.arguments.length === 1 && ts.isArrowFunction(node.arguments[0])) noteMapCallbacks.push(node.arguments[0]);
    if (ts.isJsxAttribute(node) && String(node.name.text).toLowerCase() === 'data-copy-role') {
      if (node.initializer && ts.isStringLiteral(node.initializer) && node.initializer.text === 'child') roleMarkers += 1;
      else findings.push('child stage contains an opposite or dynamic copy role');
    }
    if (ts.isJsxAttribute(node) && String(node.name.text).toLowerCase() === 'data-child-copy-id'
      && node.initializer && ts.isJsxExpression(node.initializer) && node.initializer.expression) {
      const value = node.initializer.expression.getText(sourceFile);
      copyIds.set(value, (copyIds.get(value) ?? 0) + 1);
    }
    if (ts.isJsxExpression(node) && node.expression
      && (ts.isJsxElement(node.parent) || ts.isJsxFragment(node.parent))) {
      const outputs = approvedChildOutputs(node.expression, sourceFile);
      for (const output of outputs) {
        outputCounts.set(output, (outputCounts.get(output) ?? 0) + 1);
        const expectedId = {
          'copy.title': '`${state}.title`',
          'copy.action': '`${state}.action`',
          'copy.exit': '`${state}.exit`',
          note: '`all.note.${note.toLowerCase()}`',
        }[output];
        if (!ts.isJsxElement(node.parent) || copyIdOnElement(node.parent, sourceFile) !== expectedId) {
          findings.push(`child output ${output} is not joined to its manifest id on the rendered element`);
        }
      }
    }
    if ((ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node))
      && jsxTagName(node, sourceFile) === 'GrownUpSetup') findings.push('child stage contains opposite copy role');
    ts.forEachChild(node, inspectContract);
  };
  inspectContract(sourceFile);
  if (roleMarkers !== 1) findings.push('child stage is missing its one child role marker');
  const childStage = childStageFunctions.length === 1 ? childStageFunctions[0] : null;
  const stageParameter = childStage?.parameters.length === 1 ? childStage.parameters[0] : null;
  const stageParameterNames = stageParameter && ts.isObjectBindingPattern(stageParameter.name)
    ? stageParameter.name.elements.flatMap((element) => bindingIdentifiers(element.name)) : [];
  if (!stageParameter || !ts.isObjectBindingPattern(stageParameter.name)
    || stageParameter.type?.getText(sourceFile) !== 'ChildStageProps'
    || JSON.stringify(stageParameterNames) !== JSON.stringify(['state', 'notes', 'onAction', 'onBack'])) {
    findings.push('ChildStage does not consume only the declared closed props');
  }
  const copyDeclaration = copyDeclarations.length === 1 ? copyDeclarations[0] : null;
  if (!copyDeclaration || copyDeclaration.initializer?.getText(sourceFile) !== 'childCopyFor(state)'
    || !(copyDeclaration.parent.flags & ts.NodeFlags.Const)) {
    findings.push('child stage does not bind copy once to childCopyFor(state)');
  }
  for (const name of ['state', 'notes', 'onAction', 'onBack', 'copy']) {
    if (protectedBindings.get(name) !== 1) findings.push(`child stage shadows or omits its ${name} binding`);
  }
  const noteCallback = noteMapCallbacks.length === 1 ? noteMapCallbacks[0] : null;
  if (!noteCallback || noteCallback.parameters.length !== 2
    || !ts.isIdentifier(noteCallback.parameters[0].name) || noteCallback.parameters[0].name.text !== 'note'
    || !ts.isIdentifier(noteCallback.parameters[1].name) || noteCallback.parameters[1].name.text !== 'index'
    || protectedBindings.get('note') !== 1) {
    findings.push('child note output is not bound to the one notes.map callback');
  }
  for (const [label, expression] of [
    ['title', '`${state}.title`'],
    ['action', '`${state}.action`'],
    ['exit', '`${state}.exit`'],
    ['note', '`all.note.${note.toLowerCase()}`'],
  ]) {
    if (copyIds.get(expression) !== 1) findings.push(`child ${label} is not joined once to its manifest id`);
  }
  for (const output of ['copy.title', 'copy.action', 'copy.exit', 'note']) {
    if (outputCounts.get(output) !== 1) findings.push(`child output ${output} is not rendered exactly once`);
  }

  const imports = importsFrom(sourceFile);
  const allowedImports = new Set(['react', './GardenMark.tsx', '../lib/child-copy.ts']);
  for (const imported of imports) {
    if (!allowedImports.has(imported)) findings.push(`child stage imports an undeclared render path: ${imported}`);
  }
  const propsInterface = sourceFile.statements.find((statement) => ts.isInterfaceDeclaration(statement)
    && statement.name.text === 'ChildStageProps');
  if (!propsInterface || !/interface ChildStageProps \{\s*state: ChildCopyState;\s*notes: readonly ChildNoteLetter\[\];\s*onAction: \(\) => void;\s*onBack: \(\) => void;\s*\}/.test(propsInterface.getText(sourceFile))) {
    findings.push('child stage props are outside the closed state, note and action interface');
  }
  return findings;
}

export function validateRoleMountSource(appSource, grownUpSource) {
  const findings = [];
  const appFile = parseTsx(appSource, 'src/App.tsx');
  const grownUpFile = parseTsx(grownUpSource, 'src/components/GrownUpSetup.tsx');
  let grownUpRole = 0;
  const countGrownUpRole = (node) => {
    if (ts.isJsxAttribute(node) && String(node.name.text).toLowerCase() === 'data-copy-role'
      && node.initializer && ts.isStringLiteral(node.initializer) && node.initializer.text === 'grown-up') grownUpRole += 1;
    ts.forEachChild(node, countGrownUpRole);
  };
  countGrownUpRole(grownUpFile);
  if (grownUpRole !== 1) findings.push('grown-up tree is missing its one role marker');
  if (jsxTagsWithin(grownUpFile, grownUpFile).includes('ChildStage')) findings.push('grown-up tree mounts the child stage');
  if (importsFrom(grownUpFile).some((imported) => /(?:^|\/)ChildStage\.tsx$/.test(imported))) {
    findings.push('grown-up tree imports the child stage under another name');
  }

  const exactNamedImportCount = (sourceFile, moduleName, importedName, localName) => sourceFile.statements
    .filter(ts.isImportDeclaration)
    .filter((statement) => ts.isStringLiteral(statement.moduleSpecifier) && statement.moduleSpecifier.text === moduleName)
    .flatMap((statement) => statement.importClause?.namedBindings && ts.isNamedImports(statement.importClause.namedBindings)
      ? statement.importClause.namedBindings.elements : [])
    .filter((element) => (element.propertyName?.text ?? element.name.text) === importedName && element.name.text === localName)
    .length;
  if (exactNamedImportCount(appFile, './components/ChildStage.tsx', 'ChildStage', 'ChildStage') !== 1) {
    findings.push('App does not import ChildStage under its exact name and path');
  }
  if (exactNamedImportCount(appFile, './components/GrownUpSetup.tsx', 'GrownUpSetup', 'GrownUpSetup') !== 1) {
    findings.push('App does not import GrownUpSetup under its exact name and path');
  }

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
  const childBranchStatements = childBranch && ts.isIfStatement(childBranch)
    ? (ts.isBlock(childBranch.thenStatement) ? [...childBranch.thenStatement.statements] : [childBranch.thenStatement])
    : [];
  const grownUpReturn = statements.slice(childBranchIndex + 1).find(ts.isReturnStatement);
  const childReturnTags = childReturn?.expression ? jsxTagsWithin(childReturn.expression, appFile) : [];
  const grownUpReturnTags = grownUpReturn?.expression ? jsxTagsWithin(grownUpReturn.expression, appFile) : [];
  const childReturnExpression = childReturn?.expression ? unwrappedExpression(childReturn.expression) : null;
  const grownUpReturnExpression = grownUpReturn?.expression ? unwrappedExpression(grownUpReturn.expression) : null;
  if (!childReturn || childReturnTags.filter((tag) => tag === 'ChildStage').length !== 1
    || childReturnTags.includes('GrownUpSetup') || childBranch?.elseStatement
    || !childReturnExpression || !ts.isJsxSelfClosingElement(childReturnExpression)
    || jsxTagName(childReturnExpression, appFile) !== 'ChildStage'
    || childBranchStatements.length !== 1 || !ts.isReturnStatement(childBranchStatements[0])) {
    findings.push('App does not return only the child tree from its child-mode branch');
  }
  if (!grownUpReturn || grownUpReturnTags.filter((tag) => tag === 'GrownUpSetup').length !== 1
    || grownUpReturnTags.includes('ChildStage') || !grownUpReturnExpression
    || !ts.isJsxElement(grownUpReturnExpression)
    || jsxTagName(grownUpReturnExpression.openingElement, appFile) !== 'GrownUpSetup') {
    findings.push('App does not return only the grown-up tree after its child-mode branch');
  }
  const inspectImperativeRoleEscapes = (node) => {
    if (ts.isCallExpression(node)) {
      const call = node.expression.getText(appFile);
      if (/(?:^|\.)(?:append|createElement|createPortal|createRoot|createTextNode|insertAdjacentHTML|insertAdjacentText|prepend|render|replaceChildren|setAttribute|setAttributeNS|write|writeln)$/.test(call)) {
        findings.push(`App contains an imperative role-mount escape: ${call}`);
      }
    }
    if (ts.isBinaryExpression(node) && ts.isPropertyAccessExpression(node.left)
      && ['innerHTML', 'innerText', 'nodeValue', 'outerHTML', 'textContent', 'title'].includes(node.left.name.text)) {
      findings.push(`App contains an imperative role-copy escape: ${node.left.name.text}`);
    }
    ts.forEachChild(node, inspectImperativeRoleEscapes);
  };
  inspectImperativeRoleEscapes(appFile);
  return findings;
}

export function validateRuntimeEntrySource(source) {
  const findings = [];
  const sourceFile = parseTsx(source, RUNTIME_ENTRY);
  if (sourceFile.parseDiagnostics.length > 0) findings.push('runtime entry has unparseable TSX');
  const imports = sourceFile.statements.filter(ts.isImportDeclaration);
  const importTexts = imports.map((statement) => statement.getText(sourceFile));
  if (JSON.stringify(importTexts) !== JSON.stringify([
    "import { StrictMode } from 'react';",
    "import { createRoot } from 'react-dom/client';",
    "import App from './App.tsx';",
    "import './styles.css';",
  ])) findings.push('runtime entry imports are outside the one-root contract');
  const executable = sourceFile.statements.filter((statement) => !ts.isImportDeclaration(statement));
  const statement = executable.length === 1 && ts.isExpressionStatement(executable[0]) ? executable[0] : null;
  const render = statement && ts.isCallExpression(statement.expression) ? statement.expression : null;
  const renderAccess = render && ts.isPropertyAccessExpression(render.expression) ? render.expression : null;
  const create = renderAccess && renderAccess.name.text === 'render' && ts.isCallExpression(renderAccess.expression)
    ? renderAccess.expression : null;
  const strict = render?.arguments.length === 1 && ts.isJsxElement(render.arguments[0]) ? render.arguments[0] : null;
  const strictChildren = strict?.children.filter((child) => !ts.isJsxText(child) || child.text.trim()) ?? [];
  if (!create || create.expression.getText(sourceFile) !== 'createRoot'
    || create.arguments.length !== 1 || create.arguments[0].getText(sourceFile) !== "document.getElementById('root')!"
    || !strict || jsxTagName(strict.openingElement, sourceFile) !== 'StrictMode'
    || jsxTagName(strict.closingElement, sourceFile) !== 'StrictMode'
    || strictChildren.length !== 1 || !ts.isJsxSelfClosingElement(strictChildren[0])
    || jsxTagName(strictChildren[0], sourceFile) !== 'App' || strictChildren[0].attributes.properties.length !== 0) {
    findings.push('runtime entry does not render exactly one App root');
  }
  return findings;
}

export function validateHtmlShellSource(source) {
  const findings = [];
  const titles = typeof source === 'string' ? [...source.matchAll(/<title>([\s\S]*?)<\/title>/gi)] : [];
  if (titles.length !== 1 || titles[0][1] !== 'Pip') findings.push('HTML shell title is outside the child lexicon');
  const body = typeof source === 'string' ? source.match(/<body>([\s\S]*?)<\/body>/i) : null;
  const normalisedBody = body?.[1].replace(/>\s+</g, '><').trim();
  if (!body || normalisedBody !== '<div id="root"></div><script type="module" src="/src/main.tsx"></script>') {
    findings.push('HTML shell body is outside the one empty runtime root');
  }
  if (!/<\/body>\s*<\/html>\s*$/i.test(source)) findings.push('HTML shell has content outside its body');
  return findings;
}

export function validateChildStylesSource(source) {
  const findings = [];
  const masked = source.replace(/\/\*[\s\S]*?\*\//g, '');
  if (/\\/.test(masked)) findings.push('child copy stylesheet contains escaped tokens');
  if (/(?:@import|url\s*\()/i.test(masked)) findings.push('child copy stylesheet contains an uninspectable artwork source');
  if (/(?:@counter-style|\bsymbols\s*\()/i.test(masked)) findings.push('child copy stylesheet contains generated marker copy');
  if (/(?:^|[;{}])\s*(?:list-style(?:-type)?|quotes)\s*:\s*["']/i.test(masked)) {
    findings.push('child copy stylesheet contains generated marker copy');
  }
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
    if (!stat.isDirectory() || stat.isSymbolicLink()) {
      throw new Error(`copy report directory must not be a symlink: ${directory}`);
    }
  }
  try {
    const reportStat = await lstat(reportPath);
    if (!reportStat.isFile() || reportStat.isSymbolicLink()) {
      throw new Error('copy report output must be a regular file and not a symlink');
    }
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
  }
  try {
    await unlink(temporary);
  } catch (error) {
    if ((!error || typeof error !== 'object' || error.code !== 'ENOENT') && !operationError) operationError = error;
  }
  if (operationError) throw operationError;
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
    htmlShell: path.join(root, HTML_SHELL),
    app: path.join(root, 'src', 'App.tsx'),
    runtimeEntry: path.join(root, RUNTIME_ENTRY),
    grownUp: path.join(root, 'src', 'components', 'GrownUpSetup.tsx'),
    contract: path.join(root, 'src', 'lib', 'child-copy.ts'),
    styles: path.join(root, 'src', 'styles.css'),
    checker: path.join(root, CHECKER_SOURCE),
    packageManifest: path.join(root, PACKAGE_MANIFEST),
    packageLock: path.join(root, PACKAGE_LOCK),
  };
  const [htmlShellSource, appSource, runtimeEntrySource, grownUpSource, contractSource, stylesSource, checkerSource, packageManifest, packageLock, childRender] = await Promise.all([
    readBoundedRegularFile(paths.htmlShell),
    readBoundedRegularFile(paths.app),
    readBoundedRegularFile(paths.runtimeEntry),
    readBoundedRegularFile(paths.grownUp),
    readBoundedRegularFile(paths.contract),
    readBoundedRegularFile(paths.styles),
    readBoundedRegularFile(paths.checker),
    readBoundedRegularFile(paths.packageManifest),
    readBoundedRegularFile(paths.packageLock),
    collectChildRenderSources(root),
  ]);
  const childSource = childRender.sources.get(CHILD_ENTRY) ?? '';
  const findings = [
    ...validateChildCopyManifest(CHILD_COPY_MANIFEST),
    ...validateChildStageSource(childSource),
    ...childRender.findings,
    ...validateChildStylesSource(stylesSource),
    ...validateRoleMountSource(appSource, grownUpSource),
    ...validateRuntimeEntrySource(runtimeEntrySource),
    ...validateHtmlShellSource(htmlShellSource),
  ];
  if (findings.length > 0) throw new Error(`child copy boundary failed:\n${findings.map((finding) => `- ${finding}`).join('\n')}`);

  const commit = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim();
  if (!/^[0-9a-f]{40}$/.test(commit)) throw new Error('git did not return one commit id');
  const boundSources = new Map([
    [HTML_SHELL, htmlShellSource],
    ['src/App.tsx', appSource],
    [RUNTIME_ENTRY, runtimeEntrySource],
    ['src/components/GrownUpSetup.tsx', grownUpSource],
    [CHILD_CONTRACT, contractSource],
    [CHILD_STYLES, stylesSource],
    [CHECKER_SOURCE, checkerSource],
    [PACKAGE_MANIFEST, packageManifest],
    [PACKAGE_LOCK, packageLock],
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
    runtime: { node: process.version, typescript: ts.version },
    sourceFiles,
    sourceSha256: Object.fromEntries(sourceFiles.map((file) => [file, digest(boundSources.get(file))])),
  };
  await writeReportSafely(root, reportPath, `${JSON.stringify(report, null, 2)}\n`);
  console.log(`child copy clean: ${CHILD_COPY_MANIFEST.length} manifest entries, ${CHILD_LEXICON.length} lexicon tokens, 4 declared states`);
  return report;
}

const invokedPath = process.argv[1] ? path.resolve(process.argv[1]) : '';
if (invokedPath === fileURLToPath(import.meta.url)) {
  await runChildCopyCheck(process.argv.slice(2));
}
