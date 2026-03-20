import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { stripJsoncComments, loadJsonWithComments } from '../src/parse-jsonc.js';

// --- stripJsoncComments ---

test('leaves plain JSON unchanged', () => {
  const input = '{"a": 1, "b": [1, 2]}';
  assert.equal(stripJsoncComments(input), input);
});

test('removes // line comments', () => {
  const input = '{"a": 1 // this is a comment\n}';
  const result = JSON.parse(stripJsoncComments(input));
  assert.deepEqual(result, { a: 1 });
});

test('removes /* block comments */', () => {
  const input = '{"a": /* remove this */ 1}';
  const result = JSON.parse(stripJsoncComments(input));
  assert.deepEqual(result, { a: 1 });
});

test('removes multiline block comments', () => {
  const input = '{"a": 1, /*\n  big block\n  comment\n*/ "b": 2}';
  const result = JSON.parse(stripJsoncComments(input));
  assert.deepEqual(result, { a: 1, b: 2 });
});

test('preserves strings containing //', () => {
  const input = '{"url": "https://example.com/path"}';
  const result = JSON.parse(stripJsoncComments(input));
  assert.equal(result.url, 'https://example.com/path');
});

test('preserves strings containing /*', () => {
  const input = '{"val": "a /* b */ c"}';
  const result = JSON.parse(stripJsoncComments(input));
  assert.equal(result.val, 'a /* b */ c');
});

test('removes trailing commas before }', () => {
  const input = '{"a": 1, "b": 2,}';
  const result = JSON.parse(stripJsoncComments(input));
  assert.deepEqual(result, { a: 1, b: 2 });
});

test('removes trailing commas before ]', () => {
  const input = '[1, 2, 3,]';
  const result = JSON.parse(stripJsoncComments(input));
  assert.deepEqual(result, [1, 2, 3]);
});

test('handles trailing comma with whitespace', () => {
  const input = '{"a": 1  ,  }';
  const result = JSON.parse(stripJsoncComments(input));
  assert.deepEqual(result, { a: 1 });
});

test('handles combined comments and trailing commas', () => {
  const input = `{
  "a": 1, // first
  "b": 2, /* second */
}`;
  const result = JSON.parse(stripJsoncComments(input));
  assert.deepEqual(result, { a: 1, b: 2 });
});

// --- loadJsonWithComments ---

function withTempFile(content, fn) {
  const filePath = path.join(os.tmpdir(), `test-${Date.now()}.json`);
  fs.writeFileSync(filePath, content, 'utf-8');
  try {
    return fn(filePath);
  } finally {
    fs.unlinkSync(filePath);
  }
}

test('loadJsonWithComments parses plain JSON', () => {
  withTempFile('{"a": 1, "b": [2, 3]}', (filePath) => {
    const result = loadJsonWithComments(filePath);
    assert.deepEqual(result, { a: 1, b: [2, 3] });
  });
});

test('loadJsonWithComments strips // line comments', () => {
  withTempFile('{"a": 1 // comment\n}', (filePath) => {
    const result = loadJsonWithComments(filePath);
    assert.deepEqual(result, { a: 1 });
  });
});

test('loadJsonWithComments strips /* block comments */', () => {
  withTempFile('{"a": /* skip */ 1}', (filePath) => {
    const result = loadJsonWithComments(filePath);
    assert.deepEqual(result, { a: 1 });
  });
});

test('loadJsonWithComments removes trailing commas before }', () => {
  withTempFile('{"a": 1,}', (filePath) => {
    const result = loadJsonWithComments(filePath);
    assert.deepEqual(result, { a: 1 });
  });
});

test('loadJsonWithComments removes trailing commas before ]', () => {
  withTempFile('[1, 2, 3,]', (filePath) => {
    const result = loadJsonWithComments(filePath);
    assert.deepEqual(result, [1, 2, 3]);
  });
});
