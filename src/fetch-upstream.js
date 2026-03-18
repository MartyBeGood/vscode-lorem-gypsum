#!/usr/bin/env node
// Download upstream theme files into upstream-themes/.
// Run this before build-theme.js to refresh local copies of the VSCode default
// themes and the Alabaster theme.
// Usage: node src/fetch-upstream.js  (or: npm run fetch-upstream)

import fs from 'fs';
import path from 'path';
import { upstreamDir, vsCodeThemesBase, alabasterThemeBase, themeFiles } from './constants.js';

async function fetchText(url) {
  const res = await fetch(url, { headers: { 'User-Agent': 'vscode-default-alabaster/generate' } });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return res.text();
}

function stripJsoncComments(text) {
  // Preserve quoted strings; remove // line comments and /* */ block comments.
  text = text.replace(/"(?:[^"\\]|\\.)*"|\/\*[\s\S]*?\*\/|\/\/[^\n]*/g, (m) =>
    m.startsWith('"') ? m : ''
  );
  // Remove trailing commas before ] or }
  text = text.replace(/,(\s*[}\]])/g, '$1');
  return text;
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

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
