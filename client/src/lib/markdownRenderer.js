/**
 * @file markdownRenderer.js
 * Markdown-to-React rendering pipeline for the PIM notes editor.
 *
 * Public API:
 *   renderMarkdown(content)  → ReactNode[]
 *   applyInlineRules(text)   → (string | React.ReactElement)[]
 *
 * Design constraints:
 *   - No third-party Markdown library.
 *   - No dangerouslySetInnerHTML.
 *   - Code block interiors are NOT passed through inline rules.
 */

import React from 'react';
import { BLOCK_RULES, INLINE_RULES } from './markdownRules.js';

// ---------------------------------------------------------------------------
// Inline processing
// ---------------------------------------------------------------------------

/**
 * Apply all INLINE_RULES to a plain text string, returning a mixed array of
 * strings and React elements.
 *
 * Works by splitting on the first matching pattern in each rule in order,
 * then recursing on the leftover text so that multiple inline spans in the
 * same string are all transformed.
 *
 * @param {string} text  - Raw text that may contain inline Markdown syntax.
 * @param {number} [_keyBase=0] - Internal key offset for stable React keys.
 * @returns {(string | React.ReactElement)[]}
 */
export function applyInlineRules(text, _keyBase = 0) {
  if (!text) return [text ?? ''];

  for (const rule of INLINE_RULES) {
    const match = rule.pattern.exec(text);
    if (!match) continue;

    const before = text.slice(0, match.index);
    const after = text.slice(match.index + match[0].length);
    const key = `${rule.name}-${_keyBase}-${match.index}`;

    const result = [];
    if (before) result.push(before);
    result.push(rule.render(match, key));
    if (after) result.push(...applyInlineRules(after, _keyBase + match.index + match[0].length));

    return result;
  }

  // No rule matched — return plain text.
  return [text];
}

// ---------------------------------------------------------------------------
// Block-level grouping helpers
// ---------------------------------------------------------------------------

/**
 * Identify which block rule name matches a given line.
 *
 * @param {string} line - Raw Markdown line.
 * @returns {string} The matching rule's name, or 'paragraph' as fallback.
 */
function getRuleName(line) {
  for (const rule of BLOCK_RULES) {
    if (rule.test(line)) return rule.name;
  }
  return 'paragraph';
}

/**
 * Find the block rule object by name.
 *
 * @param {string} name - Rule name.
 * @returns {{ name: string, test: Function, render: Function }}
 */
function getRuleByName(name) {
  return BLOCK_RULES.find((r) => r.name === name) ?? BLOCK_RULES[BLOCK_RULES.length - 1];
}

// ---------------------------------------------------------------------------
// Main renderer
// ---------------------------------------------------------------------------

/**
 * Convert a raw Markdown string into an array of React elements.
 *
 * Processing steps:
 *  1. Split on newlines.
 *  2. Extract fenced code blocks (``` … ```) as single <pre><code> elements;
 *     placeholder objects replace the consumed lines so the rest of the
 *     pipeline skips them.
 *  3. Group consecutive unorderedList lines into a single <ul>.
 *  4. Group consecutive orderedList lines into a single <ol>.
 *  5. Apply block rules line-by-line for all remaining lines.
 *
 * @param {string} content - Raw Markdown string.
 * @returns {React.ReactElement[]} Ordered array of React elements.
 */
export function renderMarkdown(content) {
  if (!content) return [];

  const lines = content.split('\n');

  // -------------------------------------------------------------------------
  // Step 1 — Extract fenced code blocks
  // -------------------------------------------------------------------------
  // We build an intermediate array where each entry is either:
  //   { type: 'line', value: string }    — a normal Markdown line
  //   { type: 'element', el: ReactElement } — a pre-rendered element
  /** @type {Array<{ type: 'line', value: string } | { type: 'element', el: React.ReactElement }>} */
  const intermediate = [];
  let codeBlockKey = 0;
  let i = 0;

  while (i < lines.length) {
    if (lines[i].trimEnd() === '```') {
      // Start of a fenced code block — collect until closing ```.
      const codeLines = [];
      i += 1; // skip opening ```
      while (i < lines.length && lines[i].trimEnd() !== '```') {
        codeLines.push(lines[i]);
        i += 1;
      }
      i += 1; // skip closing ```
      const codeText = codeLines.join('\n');
      const el = React.createElement(
        'pre',
        { key: `code-${codeBlockKey}` },
        React.createElement('code', null, codeText),
      );
      codeBlockKey += 1;
      intermediate.push({ type: 'element', el });
    } else {
      intermediate.push({ type: 'line', value: lines[i] });
      i += 1;
    }
  }

  // -------------------------------------------------------------------------
  // Step 2 — Group consecutive list lines
  // -------------------------------------------------------------------------
  /** @type {React.ReactElement[]} */
  const output = [];
  let listKey = 0;
  let j = 0;

  while (j < intermediate.length) {
    const entry = intermediate[j];

    // Pre-rendered code block — pass straight through.
    if (entry.type === 'element') {
      output.push(entry.el);
      j += 1;
      continue;
    }

    const line = entry.value;
    const ruleName = getRuleName(line);

    if (ruleName === 'unorderedList') {
      // Collect consecutive unordered list lines.
      const items = [];
      let itemIdx = 0;
      while (
        j < intermediate.length &&
        intermediate[j].type === 'line' &&
        getRuleName(intermediate[j].value) === 'unorderedList'
      ) {
        const itemLine = intermediate[j].value;
        items.push(
          getRuleByName('unorderedList').render(itemLine, `ul-item-${listKey}-${itemIdx}`),
        );
        itemIdx += 1;
        j += 1;
      }
      output.push(React.createElement('ul', { key: `ul-${listKey}` }, ...items));
      listKey += 1;
      continue;
    }

    if (ruleName === 'orderedList') {
      // Collect consecutive ordered list lines.
      const items = [];
      let itemIdx = 0;
      while (
        j < intermediate.length &&
        intermediate[j].type === 'line' &&
        getRuleName(intermediate[j].value) === 'orderedList'
      ) {
        const itemLine = intermediate[j].value;
        items.push(
          getRuleByName('orderedList').render(itemLine, `ol-item-${listKey}-${itemIdx}`),
        );
        itemIdx += 1;
        j += 1;
      }
      output.push(React.createElement('ol', { key: `ol-${listKey}` }, ...items));
      listKey += 1;
      continue;
    }

    // -----------------------------------------------------------------------
    // Step 3 — Apply block rules to remaining lines
    // -----------------------------------------------------------------------
    const rule = getRuleByName(ruleName);
    output.push(rule.render(line, `block-${j}`));
    j += 1;
  }

  return output;
}
