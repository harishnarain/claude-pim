/**
 * @file markdownRules.js
 * Rule definitions for the PIM Markdown pipeline.
 *
 * Exports two ordered rule arrays:
 *   - BLOCK_RULES  — matched line-by-line against raw Markdown lines.
 *   - INLINE_RULES — matched inside a text string to produce inline elements.
 *
 * Neither set relies on dangerouslySetInnerHTML. All render functions return
 * React elements created with React.createElement so this file stays JSX-free
 * and can be imported from both .js and .jsx modules.
 */

import React from 'react';
import { applyInlineRules } from './markdownRenderer.js';

// ---------------------------------------------------------------------------
// Inline rules
// ---------------------------------------------------------------------------

/**
 * Ordered array of inline transformation rules.
 * Each rule is checked in sequence; earlier rules take priority (bold before
 * italic so that `**text**` is never partially matched by the italic rule).
 *
 * @type {Array<{ name: string, pattern: RegExp, render: (match: RegExpExecArray, key: string|number) => React.ReactElement }>}
 */
export const INLINE_RULES = [
  {
    name: 'bold',
    // Non-greedy match between double asterisks.
    pattern: /\*\*(.+?)\*\*/,
    /**
     * @param {RegExpExecArray} match
     * @param {string|number} key
     * @returns {React.ReactElement}
     */
    render(match, key) {
      return React.createElement('strong', { key }, match[1]);
    },
  },
  {
    name: 'italic',
    // Single asterisk or underscore — bold already consumed double-asterisk pairs.
    pattern: /\*(.+?)\*|_(.+?)_/,
    /**
     * @param {RegExpExecArray} match
     * @param {string|number} key
     * @returns {React.ReactElement}
     */
    render(match, key) {
      // Group 1 for *text*, group 2 for _text_.
      const text = match[1] !== undefined ? match[1] : match[2];
      return React.createElement('em', { key }, text);
    },
  },
  {
    name: 'inlineCode',
    pattern: /`([^`]+)`/,
    /**
     * @param {RegExpExecArray} match
     * @param {string|number} key
     * @returns {React.ReactElement}
     */
    render(match, key) {
      return React.createElement('code', { key }, match[1]);
    },
  },
  {
    name: 'link',
    pattern: /\[([^\]]+)\]\(([^)]+)\)/,
    /**
     * @param {RegExpExecArray} match
     * @param {string|number} key
     * @returns {React.ReactElement}
     */
    render(match, key) {
      return React.createElement(
        'a',
        { key, href: match[2], target: '_blank', rel: 'noopener noreferrer' },
        match[1],
      );
    },
  },
];

// ---------------------------------------------------------------------------
// Block rules
// ---------------------------------------------------------------------------

/**
 * Strip leading block syntax characters from a line and apply inline rules
 * to the remainder.
 *
 * @param {string} line    - Raw Markdown line including leading syntax chars.
 * @param {number} chars   - Number of leading characters to strip.
 * @param {string|number} key - React key for the root element.
 * @param {string} tag     - HTML tag name for the wrapping element.
 * @returns {React.ReactElement}
 */
function blockElement(line, chars, key, tag) {
  const inner = applyInlineRules(line.slice(chars));
  return React.createElement(tag, { key }, ...inner);
}

/**
 * Ordered array of block-level transformation rules.
 * Rules are evaluated top-to-bottom; the first matching rule wins.
 *
 * The `codeBlock` sentinel is handled by the renderer's pre-processing pass
 * (fenced blocks are extracted before line-by-line processing). Its `test`
 * always returns false so it is never triggered here.
 *
 * @type {Array<{
 *   name: string,
 *   test: (line: string) => boolean,
 *   render: (line: string, key: string|number) => React.ReactElement
 * }>}
 */
export const BLOCK_RULES = [
  {
    name: 'codeBlock',
    /** @returns {false} */
    test() {
      return false;
    },
    /** @returns {null} */
    render() {
      return null;
    },
  },
  {
    name: 'heading1',
    /** @param {string} line */
    test(line) {
      // Must start with exactly "# " (one hash + space).
      return /^# /.test(line) && !/^## /.test(line);
    },
    /** @param {string} line @param {string|number} key */
    render(line, key) {
      return blockElement(line, 2, key, 'h1');
    },
  },
  {
    name: 'heading2',
    /** @param {string} line */
    test(line) {
      return /^## /.test(line) && !/^### /.test(line);
    },
    /** @param {string} line @param {string|number} key */
    render(line, key) {
      return blockElement(line, 3, key, 'h2');
    },
  },
  {
    name: 'heading3',
    /** @param {string} line */
    test(line) {
      return /^### /.test(line);
    },
    /** @param {string} line @param {string|number} key */
    render(line, key) {
      return blockElement(line, 4, key, 'h3');
    },
  },
  {
    name: 'blockquote',
    /** @param {string} line */
    test(line) {
      return /^> /.test(line);
    },
    /** @param {string} line @param {string|number} key */
    render(line, key) {
      return blockElement(line, 2, key, 'blockquote');
    },
  },
  {
    name: 'unorderedList',
    /** @param {string} line */
    test(line) {
      return /^[-*] /.test(line);
    },
    /** @param {string} line @param {string|number} key */
    render(line, key) {
      return blockElement(line, 2, key, 'li');
    },
  },
  {
    name: 'orderedList',
    /** @param {string} line */
    test(line) {
      return /^\d+\. /.test(line);
    },
    /** @param {string} line @param {string|number} key */
    render(line, key) {
      // Strip "N. " prefix — find the space after the dot.
      const dotIdx = line.indexOf('. ');
      return blockElement(line, dotIdx + 2, key, 'li');
    },
  },
  {
    name: 'paragraph',
    /** Fallthrough — always matches. @returns {true} */
    test() {
      return true;
    },
    /** @param {string} line @param {string|number} key */
    render(line, key) {
      const inner = applyInlineRules(line);
      return React.createElement('p', { key }, ...inner);
    },
  },
];
