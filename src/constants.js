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

// Theme metadata keyed by output filename.
export const themeMetadata = {
  'dark_vs.json': {
    displayName: 'Lorem Gypsum Dark (Visual Studio)',
    uiTheme: 'vs-dark',
    type: 'dark',
  },
  'light_vs.json': {
    displayName: 'Lorem Gypsum Light (Visual Studio)',
    uiTheme: 'vs',
    type: 'light',
  },
  'hc_black.json': {
    displayName: 'Lorem Gypsum High Contrast',
    uiTheme: 'hc-black',
    type: 'hc',
  },
  'hc_light.json': {
    displayName: 'Lorem Gypsum High Contrast Light',
    uiTheme: 'hc-light',
    type: 'hc',
  },
  'dark_plus.json': {
    displayName: 'Lorem Gypsum Dark+',
    uiTheme: 'vs-dark',
    type: 'dark',
  },
  'light_plus.json': {
    displayName: 'Lorem Gypsum Light+',
    uiTheme: 'vs',
    type: 'light',
  },
  'dark_modern.json': {
    displayName: 'Lorem Gypsum Dark Modern',
    uiTheme: 'vs-dark',
    type: 'dark',
  },
  'light_modern.json': {
    displayName: 'Lorem Gypsum Light Modern',
    uiTheme: 'vs',
    type: 'light',
  },
  '2026-dark.json': {
    displayName: 'Lorem Gypsum 2026 Dark',
    uiTheme: 'vs-dark',
    type: 'dark',
  },
  '2026-light.json': {
    displayName: 'Lorem Gypsum 2026 Light',
    uiTheme: 'vs',
    type: 'light',
  },
};

export const themeFiles = Object.keys(themeMetadata);
