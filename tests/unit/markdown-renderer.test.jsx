/**
 * Unit tests for the Markdown rendering pipeline.
 *
 * Covers:
 *   - All 8 block rule types (codeBlock sentinel, heading1-3, blockquote,
 *     unorderedList, orderedList, paragraph).
 *   - All 4 inline rule types (bold, italic, inlineCode, link).
 *   - Mixed inline content within a block element.
 *   - Nested inline — e.g. bold text inside a heading.
 *   - Code blocks preserve whitespace and are NOT passed through inline rules.
 *   - Consecutive list items produce a single <ul> / <ol> wrapper.
 *   - Links have target="_blank" and rel="noopener noreferrer".
 *   - Edge cases: empty string, no Markdown syntax.
 */

import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { renderMarkdown, applyInlineRules } from '../../client/src/lib/markdownRenderer.js';

// ---------------------------------------------------------------------------
// Helper: wrap output array in a div for easy DOM querying
// ---------------------------------------------------------------------------

/**
 * Render the output of renderMarkdown inside a container div.
 *
 * @param {string} markdown - Raw Markdown string.
 * @returns {HTMLElement} The container element.
 */
function renderMd(markdown) {
  const elements = renderMarkdown(markdown);
  const { container } = render(React.createElement('div', null, ...elements));
  return container;
}

// ===========================================================================
// Block rules
// ===========================================================================

describe('Block rule: heading1', () => {
  it('renders a <h1> element', () => {
    const container = renderMd('# Hello World');
    expect(container.querySelector('h1')).toBeTruthy();
    expect(container.querySelector('h1').textContent).toBe('Hello World');
  });

  it('does not match heading2 or heading3 lines', () => {
    const container = renderMd('## Sub');
    expect(container.querySelector('h1')).toBeNull();
  });
});

describe('Block rule: heading2', () => {
  it('renders a <h2> element', () => {
    const container = renderMd('## Section');
    expect(container.querySelector('h2')).toBeTruthy();
    expect(container.querySelector('h2').textContent).toBe('Section');
  });

  it('does not match heading3 lines', () => {
    const container = renderMd('### Sub');
    expect(container.querySelector('h2')).toBeNull();
  });
});

describe('Block rule: heading3', () => {
  it('renders a <h3> element', () => {
    const container = renderMd('### Detail');
    expect(container.querySelector('h3')).toBeTruthy();
    expect(container.querySelector('h3').textContent).toBe('Detail');
  });
});

describe('Block rule: blockquote', () => {
  it('renders a <blockquote> element', () => {
    const container = renderMd('> This is a quote');
    expect(container.querySelector('blockquote')).toBeTruthy();
    expect(container.querySelector('blockquote').textContent).toBe('This is a quote');
  });
});

describe('Block rule: unorderedList', () => {
  it('renders <ul> with a single <li> for a single item (dash)', () => {
    const container = renderMd('- First item');
    const ul = container.querySelector('ul');
    expect(ul).toBeTruthy();
    const items = ul.querySelectorAll('li');
    expect(items).toHaveLength(1);
    expect(items[0].textContent).toBe('First item');
  });

  it('renders <ul> with a single <li> for a single item (asterisk)', () => {
    const container = renderMd('* Star item');
    const ul = container.querySelector('ul');
    expect(ul).toBeTruthy();
    expect(ul.querySelectorAll('li')).toHaveLength(1);
  });

  it('groups consecutive unordered list lines into ONE <ul>', () => {
    const md = '- Alpha\n- Beta\n- Gamma';
    const container = renderMd(md);
    const uls = container.querySelectorAll('ul');
    expect(uls).toHaveLength(1);
    expect(uls[0].querySelectorAll('li')).toHaveLength(3);
  });

  it('produces separate <ul> elements for non-consecutive list blocks', () => {
    const md = '- Item A\n\nSome text\n\n- Item B';
    const container = renderMd(md);
    const uls = container.querySelectorAll('ul');
    expect(uls).toHaveLength(2);
  });
});

describe('Block rule: orderedList', () => {
  it('renders <ol> with a single <li>', () => {
    const container = renderMd('1. First');
    const ol = container.querySelector('ol');
    expect(ol).toBeTruthy();
    const items = ol.querySelectorAll('li');
    expect(items).toHaveLength(1);
    expect(items[0].textContent).toBe('First');
  });

  it('groups consecutive ordered list lines into ONE <ol>', () => {
    const md = '1. One\n2. Two\n3. Three';
    const container = renderMd(md);
    const ols = container.querySelectorAll('ol');
    expect(ols).toHaveLength(1);
    expect(ols[0].querySelectorAll('li')).toHaveLength(3);
  });

  it('strips the numeric prefix from each item', () => {
    const container = renderMd('1. Only');
    expect(container.querySelector('li').textContent).toBe('Only');
  });
});

describe('Block rule: paragraph (fallthrough)', () => {
  it('wraps plain text in a <p> element', () => {
    const container = renderMd('Just some plain text.');
    expect(container.querySelector('p')).toBeTruthy();
    expect(container.querySelector('p').textContent).toBe('Just some plain text.');
  });
});

describe('Block rule: codeBlock sentinel', () => {
  it('renders a <pre><code> element for a fenced code block', () => {
    const md = '```\nconst x = 1;\n```';
    const container = renderMd(md);
    const pre = container.querySelector('pre');
    expect(pre).toBeTruthy();
    const code = pre.querySelector('code');
    expect(code).toBeTruthy();
    expect(code.textContent).toBe('const x = 1;');
  });

  it('preserves interior whitespace inside a code block', () => {
    const md = '```\n  indented\n    more\n```';
    const container = renderMd(md);
    expect(container.querySelector('code').textContent).toBe('  indented\n    more');
  });

  it('does NOT apply inline rules inside a code block', () => {
    const md = '```\n**not bold**\n```';
    const container = renderMd(md);
    // No <strong> element should appear inside the code block.
    expect(container.querySelector('code strong')).toBeNull();
    expect(container.querySelector('code').textContent).toBe('**not bold**');
  });
});

// ===========================================================================
// Inline rules
// ===========================================================================

describe('Inline rule: bold', () => {
  it('wraps **text** in <strong>', () => {
    const container = renderMd('This is **bold** text.');
    expect(container.querySelector('strong')).toBeTruthy();
    expect(container.querySelector('strong').textContent).toBe('bold');
  });
});

describe('Inline rule: italic', () => {
  it('wraps *text* in <em>', () => {
    const container = renderMd('This is *italic* text.');
    expect(container.querySelector('em')).toBeTruthy();
    expect(container.querySelector('em').textContent).toBe('italic');
  });

  it('wraps _text_ in <em>', () => {
    const container = renderMd('This is _italic_ text.');
    expect(container.querySelector('em')).toBeTruthy();
    expect(container.querySelector('em').textContent).toBe('italic');
  });
});

describe('Inline rule: inlineCode', () => {
  it('wraps `code` in <code>', () => {
    const container = renderMd('Use `npm install` to install.');
    const codeEls = container.querySelectorAll('p code');
    expect(codeEls).toHaveLength(1);
    expect(codeEls[0].textContent).toBe('npm install');
  });
});

describe('Inline rule: link', () => {
  it('renders [label](url) as an <a> element', () => {
    const container = renderMd('Visit [Example](https://example.com) now.');
    const a = container.querySelector('a');
    expect(a).toBeTruthy();
    expect(a.textContent).toBe('Example');
    expect(a.getAttribute('href')).toBe('https://example.com');
  });

  it('sets target="_blank" on links', () => {
    const container = renderMd('[Link](https://example.com)');
    expect(container.querySelector('a').getAttribute('target')).toBe('_blank');
  });

  it('sets rel="noopener noreferrer" on links', () => {
    const container = renderMd('[Link](https://example.com)');
    expect(container.querySelector('a').getAttribute('rel')).toBe('noopener noreferrer');
  });
});

// ===========================================================================
// Mixed and nested inline content
// ===========================================================================

describe('Mixed inline content', () => {
  it('handles bold and italic on the same line', () => {
    const container = renderMd('**Bold** and *italic* text.');
    expect(container.querySelector('strong').textContent).toBe('Bold');
    expect(container.querySelector('em').textContent).toBe('italic');
  });

  it('handles link alongside inline code', () => {
    const container = renderMd('Run `git commit` then see [docs](https://docs.example.com).');
    expect(container.querySelector('p code').textContent).toBe('git commit');
    expect(container.querySelector('a').textContent).toBe('docs');
  });
});

describe('Nested inline: bold inside a heading', () => {
  it('renders <strong> inside <h1>', () => {
    const container = renderMd('# Title with **bold** word');
    const h1 = container.querySelector('h1');
    expect(h1).toBeTruthy();
    expect(h1.querySelector('strong')).toBeTruthy();
    expect(h1.querySelector('strong').textContent).toBe('bold');
  });

  it('renders <em> inside <h2>', () => {
    const container = renderMd('## Heading with *emphasis*');
    const h2 = container.querySelector('h2');
    expect(h2.querySelector('em').textContent).toBe('emphasis');
  });

  it('renders <a> inside blockquote', () => {
    const container = renderMd('> Quote with [link](https://x.com)');
    const bq = container.querySelector('blockquote');
    expect(bq.querySelector('a').getAttribute('href')).toBe('https://x.com');
  });
});

// ===========================================================================
// applyInlineRules unit tests
// ===========================================================================

describe('applyInlineRules()', () => {
  it('returns plain text unchanged as a single-element array', () => {
    const result = applyInlineRules('hello world');
    expect(result).toEqual(['hello world']);
  });

  it('returns an empty string for empty input', () => {
    const result = applyInlineRules('');
    expect(result).toEqual(['']);
  });

  it('bold rule returns a React element with type "strong"', () => {
    const result = applyInlineRules('**hi**');
    const el = result.find((r) => r && typeof r === 'object');
    expect(el.type).toBe('strong');
    expect(el.props.children).toBe('hi');
  });

  it('multiple spans on a single line are all transformed', () => {
    const result = applyInlineRules('**a** and *b*');
    const elements = result.filter((r) => r && typeof r === 'object');
    expect(elements).toHaveLength(2);
    expect(elements[0].type).toBe('strong');
    expect(elements[1].type).toBe('em');
  });
});

// ===========================================================================
// Edge cases
// ===========================================================================

describe('Edge cases', () => {
  it('returns empty array for empty string', () => {
    const result = renderMarkdown('');
    expect(result).toEqual([]);
  });

  it('returns empty array for null/undefined', () => {
    expect(renderMarkdown(null)).toEqual([]);
    expect(renderMarkdown(undefined)).toEqual([]);
  });

  it('renders plain text with no Markdown syntax as a paragraph', () => {
    const container = renderMd('Just plain text here');
    expect(container.querySelector('p').textContent).toBe('Just plain text here');
    expect(container.querySelector('strong')).toBeNull();
    expect(container.querySelector('em')).toBeNull();
  });

  it('handles multiple blocks separated by blank lines', () => {
    const md = '# Title\n\nSome paragraph text.\n\n> A quote';
    const container = renderMd(md);
    expect(container.querySelector('h1').textContent).toBe('Title');
    // Find the non-empty paragraph (blank lines render as empty <p> elements).
    const paragraphs = Array.from(container.querySelectorAll('p'));
    const nonEmpty = paragraphs.find((p) => p.textContent.trim() !== '');
    expect(nonEmpty).toBeTruthy();
    expect(nonEmpty.textContent).toBe('Some paragraph text.');
    expect(container.querySelector('blockquote').textContent).toBe('A quote');
  });

  it('renders multiple fenced code blocks independently', () => {
    const md = '```\nfirst\n```\n\nText in between.\n\n```\nsecond\n```';
    const container = renderMd(md);
    const pres = container.querySelectorAll('pre');
    expect(pres).toHaveLength(2);
    expect(pres[0].querySelector('code').textContent).toBe('first');
    expect(pres[1].querySelector('code').textContent).toBe('second');
  });

  it('renders a line starting with # but no space as a paragraph', () => {
    // "#NoSpace" should fall through to paragraph rule.
    const container = renderMd('#NoSpace');
    expect(container.querySelector('h1')).toBeNull();
    expect(container.querySelector('p')).toBeTruthy();
  });
});
