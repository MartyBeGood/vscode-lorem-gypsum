// Builds a single theme file from the source JSON and the resolved palette. This is used by generate-themes.js to build all themes.

import fs from 'fs';
import path from 'path';
import { repoRoot, themesDir, themeMetadata } from './constants.js';
import { extractPaletteForTheme } from './extract-colors.js';
import { loadJsonWithComments } from './parse-jsonc.js';

const tokenColorsTemplate = loadJsonWithComments(path.join(repoRoot, 'token-colors.json'));

export function buildTheme(sourceFilename, displayName, resolvedThemes) {
  const metadata = themeMetadata[sourceFilename];
  const resolved = resolvedThemes[sourceFilename];
  const palette = extractPaletteForTheme(sourceFilename, resolvedThemes);

  const tokenColors = JSON.parse(
    JSON.stringify(tokenColorsTemplate),
    (key, value) => {
      if (typeof value !== 'string' || !value.startsWith('$')) return value;
      const palKey = value.slice(1);
      if (!(palKey in palette)) {
        console.warn(`  WARNING: ${sourceFilename}: unresolved placeholder $${palKey}`);
      }
      return palette[palKey] ?? value;
    }
  );

  const theme = {
    $schema: 'vscode://schemas/color-theme',
    name: displayName,
    type: metadata?.type || 'dark',
    colors: resolved.colors || {},
    tokenColors,
    semanticHighlighting: false,
  };

  const outPath = path.join(themesDir, sourceFilename);
  fs.writeFileSync(outPath, JSON.stringify(theme, null, 2) + '\n', 'utf-8');

  console.log(`  ${displayName}`);
  for (const [name, color] of Object.entries(palette)) {
    console.log(`    $${name} -> ${color}`);
  }
}
