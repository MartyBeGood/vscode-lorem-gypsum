import fs from 'fs';

export function stripJsoncComments(text) {
  // Preserve quoted strings; remove // line comments and /* */ block comments.
  text = text.replace(/"(?:[^"\\]|\\.)*"|\/\*[\s\S]*?\*\/|\/\/[^\n]*/g, (m) =>
    m.startsWith('"') ? m : ''
  );
  // Remove trailing commas before ] or }
  text = text.replace(/,(\s*[}\]])/g, '$1');
  return text;
}

export function loadJsonWithComments(filePath) {
  const raw = fs.readFileSync(filePath, 'utf-8');
  return JSON.parse(
    raw
      .replace(/\/\*[\s\S]*?\*\//g, '') // Remove /* block comments */
      .replace(/\/\/[^\n]*/g, '') // Remove // line comments
      .replace(/,\s*([}\]])/g, '$1') // Remove trailing commas
  );
}
