#!/usr/bin/env node
// Download upstream theme files into upstream-themes/.
// Run this before build-theme.js to refresh local copies of the VSCode default
// themes and the Alabaster theme.
// Usage: node src/fetch-upstream.js  (or: npm run fetch-upstream)

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { upstreamDir, vsCodeThemesBase, alabasterThemeBase, themeFiles } from './constants.js';
import { stripJsoncComments } from './parse-jsonc.js';

async function fetchText(url) {
  const res = await fetch(url, { headers: { 'User-Agent': 'vscode-default-alabaster/generate' } });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return res.text();
}

async function fetchJson(url) {
  const text = await fetchText(url);
  return JSON.parse(stripJsoncComments(text));
}

async function fetchAndSave(url, filename) {
  const data = await fetchJson(url);
  const outPath = path.join(upstreamDir, filename);
  fs.writeFileSync(outPath, JSON.stringify(data, null, 2) + '\n', 'utf-8');
  console.log(`  ${filename}`);
}

async function main() {
  fs.mkdirSync(upstreamDir, { recursive: true });

  console.log('Fetching VSCode default themes...');
  await Promise.all(
    themeFiles.map((filename) => fetchAndSave(`${vsCodeThemesBase}/${filename}`, filename))
  );

  console.log('Fetching Alabaster theme...');
  await fetchAndSave(`${alabasterThemeBase}/alabaster-color-theme.json`, 'alabaster-color-theme.json');

  console.log(`\nDone! ${themeFiles.length + 1} files saved to upstream-themes/`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((e) => {
    console.error(e.message);
    process.exit(1);
  });
}
