/**
 * Unit tests for client/src/components/TypeIcon.jsx.
 *
 * Covers:
 *   - Renders an <svg> element for each valid kind value.
 *   - SVG has aria-hidden="true" and focusable="false" on every variant.
 *   - Forwards className prop to the root <svg> element.
 *   - Returns null for an unknown kind.
 */

import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, container } from '@testing-library/react';
import '@testing-library/jest-dom';
import TypeIcon from '../../client/src/components/TypeIcon.jsx';

/** Valid kind values the component supports. */
const VALID_KINDS = ['contact', 'note', 'task', 'event'];

// ---------------------------------------------------------------------------
// SVG rendering for each kind
// ---------------------------------------------------------------------------

describe('renders an svg for each valid kind', () => {
  VALID_KINDS.forEach((kind) => {
    it(`renders an <svg> for kind="${kind}"`, () => {
      const { container: c } = render(<TypeIcon kind={kind} />);
      const svg = c.querySelector('svg');
      expect(svg).not.toBeNull();
    });
  });
});

// ---------------------------------------------------------------------------
// Accessibility attributes
// ---------------------------------------------------------------------------

describe('accessibility attributes', () => {
  VALID_KINDS.forEach((kind) => {
    it(`has aria-hidden="true" for kind="${kind}"`, () => {
      const { container: c } = render(<TypeIcon kind={kind} />);
      const svg = c.querySelector('svg');
      expect(svg).toHaveAttribute('aria-hidden', 'true');
    });

    it(`has focusable="false" for kind="${kind}"`, () => {
      const { container: c } = render(<TypeIcon kind={kind} />);
      const svg = c.querySelector('svg');
      expect(svg).toHaveAttribute('focusable', 'false');
    });
  });
});

// ---------------------------------------------------------------------------
// Dimensions
// ---------------------------------------------------------------------------

describe('SVG dimensions', () => {
  VALID_KINDS.forEach((kind) => {
    it(`has width="14" and height="14" for kind="${kind}"`, () => {
      const { container: c } = render(<TypeIcon kind={kind} />);
      const svg = c.querySelector('svg');
      expect(svg).toHaveAttribute('width', '14');
      expect(svg).toHaveAttribute('height', '14');
    });
  });
});

// ---------------------------------------------------------------------------
// className forwarding
// ---------------------------------------------------------------------------

describe('className forwarding', () => {
  VALID_KINDS.forEach((kind) => {
    it(`forwards className to the root svg for kind="${kind}"`, () => {
      const { container: c } = render(<TypeIcon kind={kind} className="text-indigo-500" />);
      const svg = c.querySelector('svg');
      expect(svg).toHaveClass('text-indigo-500');
    });
  });
});

// ---------------------------------------------------------------------------
// Unknown kind
// ---------------------------------------------------------------------------

describe('unknown kind', () => {
  it('returns null for an unknown kind', () => {
    const { container: c } = render(<TypeIcon kind="unknown" />);
    expect(c.querySelector('svg')).toBeNull();
  });

  it('does not crash when kind is undefined', () => {
    const { container: c } = render(<TypeIcon />);
    expect(c.querySelector('svg')).toBeNull();
  });
});
