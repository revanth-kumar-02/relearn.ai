import assert from 'node:assert/strict';
import { normalizeMarkdown } from '../markdownUtils';

console.log('Testing markdownUtils...');

// Test 1: Splitting collapsed table rows
{
  const input = '| Type | Description | |-------|--------------| | `int` | Whole numbers | | `double` | Floating-point numbers |';
  const result = normalizeMarkdown(input);
  assert.ok(result.includes('| Type | Description |\n|-------|--------------|\n| `int` | Whole numbers |\n| `double` | Floating-point numbers |'), 'Collapsed table rows should be split with newlines');
  console.log('✓ Splitting collapsed table rows passed');
}

// Test 2: Preserving standard multi-line markdown tables
{
  const input = '| Type | Description |\n|-------|--------------|\n| int | Whole numbers |\n| double | Floating-point numbers |';
  const result = normalizeMarkdown(input);
  assert.equal(result, input, 'Standard multi-line tables should remain intact');
  console.log('✓ Preserving standard tables passed');
}

// Test 3: Spacing around table blocks
{
  const input = 'Preceding paragraph.\n| A | B |\n|---|---|\n| 1 | 2 |\nFollowing paragraph.';
  const result = normalizeMarkdown(input);
  assert.ok(result.includes('Preceding paragraph.\n\n| A | B |'), 'Blank line before table should be added');
  assert.ok(result.includes('| 1 | 2 |\n\nFollowing paragraph.'), 'Blank line after table should be added');
  console.log('✓ Table block spacing passed');
}

// Test 4: Empty string handling
{
  assert.equal(normalizeMarkdown(''), '');
  assert.equal(normalizeMarkdown(null as any), '');
  assert.equal(normalizeMarkdown(undefined as any), '');
  console.log('✓ Null/empty handling passed');
}

// Test 5: Code blocks preservation
{
  const input = '## Overview\n\n```dart\nvoid main() {\n  print("Hello");\n}\n```\n\nNormal paragraph.';
  assert.equal(normalizeMarkdown(input), input, 'Code blocks should not be mutated');
  console.log('✓ Code blocks preservation passed');
}

console.log('ALL MARKDOWN TESTS PASSED SUCCESSFULLY!');
