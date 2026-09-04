import { lstat, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { bindCommittedFiles, sha256, parseConformanceArguments, writeConformanceReport } from './child-conformance-common.mjs';

const CANDIDATE = 'one-screen-play-loop';
const CRITERION = 'live-pages-boots-built-artifact';
const LIVE_URL = 'https://laurenceday.github.io/pip-recorder-garden/';
const MAX_HTML_BYTES = 65_536;
const MAX_ASSET_BYTES = 1_048_576;
const SOURCE_FILES = ['.github/workflows/pages.yml', 'package-lock.json', 'scripts/check-live-pages.mjs', 'scripts/child-conformance-common.mjs'];

export function inspectPagesEntry(html, responseUrl = LIVE_URL) {
  if (typeof html !== 'string' || Buffer.byteLength(html) > MAX_HTML_BYTES) throw new Error('Pages entry is missing or too large');
  if (/\/src\/main\.tsx/.test(html)) throw new Error('Pages entry still points at repository source');
  if (!/<div id="root"><\/div>/.test(html)) throw new Error('Pages entry is missing the application root');
  const scripts = [...html.matchAll(/<script\b[^>]*type="module"[^>]*src="([^"]+)"[^>]*><\/script>/g)].map((match) => match[1]);
  if (scripts.length !== 1 || !/^\.\/assets\/index-[A-Za-z0-9_-]+\.js$/.test(scripts[0])) throw new Error('Pages entry must load one hashed JavaScript asset');
  const entry = new URL(responseUrl);
  const asset = new URL(scripts[0], entry);
  if (entry.protocol !== 'https:' || entry.origin !== new URL(LIVE_URL).origin || entry.pathname !== '/pip-recorder-garden/') throw new Error('Pages entry resolved outside the expected HTTPS site');
  if (asset.origin !== entry.origin || !asset.pathname.startsWith('/pip-recorder-garden/assets/')) throw new Error('Pages asset resolved outside the expected site path');
  return { assetUrl: asset.href, assetName: path.posix.basename(asset.pathname) };
}

export async function responseBytes(response, limit, label) {
  if (!response.ok) throw new Error(`${label} returned HTTP ${response.status}`);
  const bytes = Buffer.from(await response.arrayBuffer());
  if (bytes.length < 1 || bytes.length > limit) throw new Error(`${label} is missing or too large`);
  return bytes;
}

async function localBuiltAsset(root) {
  const indexPath = path.join(root, 'dist', 'index.html');
  const indexStat = await lstat(indexPath);
  if (!indexStat.isFile() || indexStat.isSymbolicLink() || indexStat.size > MAX_HTML_BYTES) throw new Error('local built entry is invalid');
  const htmlBytes = await readFile(indexPath);
  const entry = inspectPagesEntry(htmlBytes.toString('utf8'));
  const assetPath = path.join(root, 'dist', 'assets', entry.assetName);
  const assetStat = await lstat(assetPath);
  if (!assetStat.isFile() || assetStat.isSymbolicLink() || assetStat.size > MAX_ASSET_BYTES) throw new Error('local built asset is invalid');
  return { entry, htmlBytes, assetBytes: await readFile(assetPath) };
}

export async function runLivePagesCheck(argv, root = process.cwd(), fetchImpl = fetch) {
  const options = parseConformanceArguments(argv, CANDIDATE, [CRITERION]);
  const { commit, sourceSha256 } = await bindCommittedFiles(root, SOURCE_FILES);
  const local = await localBuiltAsset(root);
  const requestUrl = `${LIVE_URL}?proof=${commit}`;
  const htmlResponse = await fetchImpl(requestUrl, { headers: { accept: 'text/html', 'cache-control': 'no-cache' }, redirect: 'follow' });
  const liveHtml = await responseBytes(htmlResponse, MAX_HTML_BYTES, 'Pages entry');
  const live = inspectPagesEntry(liveHtml.toString('utf8'), htmlResponse.url);
  if (live.assetName !== local.entry.assetName) throw new Error('live entry does not name the current built asset');
  const assetResponse = await fetchImpl(live.assetUrl, { headers: { accept: 'text/javascript', 'cache-control': 'no-cache' }, redirect: 'error' });
  const liveAsset = await responseBytes(assetResponse, MAX_ASSET_BYTES, 'Pages asset');
  if (!liveAsset.equals(local.assetBytes)) throw new Error('live JavaScript bytes do not match the current build');
  const report = {
    schema: 'live-pages-conformance/v1', candidate: CANDIDATE, criterion: CRITERION, status: 'pass', commit,
    evidence: { requestedUrl: requestUrl, entryUrl: htmlResponse.url, assetUrl: live.assetUrl, entrySha256: sha256(liveHtml), assetSha256: sha256(liveAsset), localAssetSha256: sha256(local.assetBytes), bootRoot: 'root', sourceEntry: false },
    sourceFiles: SOURCE_FILES, sourceSha256,
  };
  await writeConformanceReport(root, CANDIDATE, CRITERION, options.report, report);
  console.log(`live Pages clean: ${live.assetName} matches the current build`);
  return report;
}

const invoked = process.argv[1] ? path.resolve(process.argv[1]) : '';
if (invoked === fileURLToPath(import.meta.url)) await runLivePagesCheck(process.argv.slice(2));
