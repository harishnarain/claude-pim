/**
 * MarkdownView — pure presentational component that renders a raw Markdown
 * string as React elements produced by the custom Markdown pipeline.
 *
 * No state, no side effects, no dangerouslySetInnerHTML.
 * Styling is applied via hand-crafted Tailwind utility classes on the wrapper
 * `<div>`; the rendered child elements (h1, h2, h3, p, pre, blockquote, ul,
 * ol, etc.) inherit readable typography from those wrapper classes.
 *
 * @param {object} props
 * @param {string} props.content - Raw Markdown string to render.
 * @returns {JSX.Element}
 */

import React from 'react';
import { renderMarkdown } from '../lib/markdownRenderer.js';

/**
 * MarkdownView renders a Markdown string as styled React elements.
 *
 * @param {{ content: string }} props
 * @returns {JSX.Element}
 */
function MarkdownView({ content }) {
  const elements = renderMarkdown(content ?? '');

  return (
    <div
      className={[
        // Base typography
        'text-gray-800 leading-relaxed text-sm',
        // Spacing between block-level children
        '[&>*]:mb-3',
        // Headings
        '[&>h1]:text-2xl [&>h1]:font-bold [&>h1]:text-gray-900 [&>h1]:mt-4',
        '[&>h2]:text-xl [&>h2]:font-semibold [&>h2]:text-gray-800 [&>h2]:mt-3',
        '[&>h3]:text-lg [&>h3]:font-semibold [&>h3]:text-gray-700 [&>h3]:mt-2',
        // Paragraph
        '[&>p]:text-gray-700',
        // Blockquote
        '[&>blockquote]:border-l-4 [&>blockquote]:border-gray-300 [&>blockquote]:pl-4 [&>blockquote]:italic [&>blockquote]:text-gray-600',
        // Code block
        '[&>pre]:bg-gray-100 [&>pre]:rounded [&>pre]:p-3 [&>pre]:overflow-x-auto',
        '[&>pre>code]:font-mono [&>pre>code]:text-sm [&>pre>code]:text-gray-800',
        // Unordered list
        '[&>ul]:list-disc [&>ul]:pl-5 [&>ul]:space-y-1',
        // Ordered list
        '[&>ol]:list-decimal [&>ol]:pl-5 [&>ol]:space-y-1',
        // Inline code (inside paragraphs / headings)
        '[&_code]:font-mono [&_code]:bg-gray-100 [&_code]:px-1 [&_code]:rounded [&_code]:text-sm [&_code]:text-gray-800',
        // Links
        '[&_a]:text-blue-600 [&_a]:underline [&_a]:hover:text-blue-800',
      ].join(' ')}
    >
      {elements}
    </div>
  );
}

export default MarkdownView;
