import { fileURLToPath } from 'url';
import path from 'path';

export const repoRoot = fileURLToPath(new URL('..', import.meta.url));
export const upstreamDir = path.join(repoRoot, 'upstream-themes');
export const palettesDir = path.join(repoRoot, 'palettes');
export const themesDir = path.join(repoRoot, 'themes');

export const vsCodeThemesBase =
  'https://raw.githubusercontent.com/microsoft/vscode/main/extensions/theme-defaults/themes';
export const alabasterThemeBase =
  'https://raw.githubusercontent.com/tonsky/vscode-theme-alabaster/refs/heads/master/theme';

export const themeFiles = [
  'dark_vs.json',
  'light_vs.json',
  'hc_black.json',
  'hc_light.json',
  'dark_plus.json',
  'light_plus.json',
  'dark_modern.json',
  'light_modern.json',
  '2026-dark.json',
  '2026-light.json',
];
