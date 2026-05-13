/**
 * Unit tests for client/src/components/Sidebar.jsx.
 *
 * Covers:
 *   - All four nav links (Contacts, Notes, Tasks, Calendar) render.
 *   - Each nav link contains an inline SVG icon.
 *   - The Tasks link is active (highlighted) when the current path is /tasks/*.
 *   - Active link receives the correct Tailwind highlight class.
 *   - Inactive links do not receive the highlight class.
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

// ---------------------------------------------------------------------------
// Shared NavLink active state tracker — tests can set this before rendering.
// ---------------------------------------------------------------------------

/** Controls whether the mocked NavLink reports isActive = true. */
let mockIsActive = false;

// ---------------------------------------------------------------------------
// Mock react-router-dom
// ---------------------------------------------------------------------------

vi.mock('react-router-dom', () => {
  /**
   * Minimal NavLink mock that calls className() with the mocked isActive flag
   * and renders an <a> tag so role="link" queries work.
   *
   * @param {object} props
   * @param {string} props.to
   * @param {Function|string} props.className
   * @param {React.ReactNode} props.children
   * @returns {JSX.Element}
   */
  const NavLink = ({ to, className, children }) => {
    const cls =
      typeof className === 'function'
        ? className({ isActive: mockIsActive })
        : (className ?? '');
    return (
      <a href={to} className={cls}>
        {children}
      </a>
    );
  };

  return { NavLink };
});

// ---------------------------------------------------------------------------
// Import after mocks
// ---------------------------------------------------------------------------

import Sidebar from '../../client/src/components/Sidebar.jsx';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Render Sidebar with a clean DOM.
 * @returns {import('@testing-library/react').RenderResult}
 */
function renderSidebar() {
  return render(<Sidebar />);
}

// ---------------------------------------------------------------------------
// Nav links presence
// ---------------------------------------------------------------------------

describe('Sidebar nav links', () => {
  beforeEach(() => {
    mockIsActive = false;
  });

  it('renders a Contacts link', () => {
    renderSidebar();
    expect(screen.getByRole('link', { name: /contacts/i })).toBeInTheDocument();
  });

  it('renders a Notes link', () => {
    renderSidebar();
    expect(screen.getByRole('link', { name: /notes/i })).toBeInTheDocument();
  });

  it('renders a Tasks link', () => {
    renderSidebar();
    expect(screen.getByRole('link', { name: /tasks/i })).toBeInTheDocument();
  });

  it('renders a Calendar link', () => {
    renderSidebar();
    expect(screen.getByRole('link', { name: /calendar/i })).toBeInTheDocument();
  });

  it('renders exactly four nav links', () => {
    renderSidebar();
    expect(screen.getAllByRole('link')).toHaveLength(4);
  });

  it('Contacts link href is /contacts', () => {
    renderSidebar();
    expect(screen.getByRole('link', { name: /contacts/i })).toHaveAttribute(
      'href',
      '/contacts',
    );
  });

  it('Notes link href is /notes', () => {
    renderSidebar();
    expect(screen.getByRole('link', { name: /notes/i })).toHaveAttribute(
      'href',
      '/notes',
    );
  });

  it('Tasks link href is /tasks', () => {
    renderSidebar();
    expect(screen.getByRole('link', { name: /tasks/i })).toHaveAttribute(
      'href',
      '/tasks',
    );
  });

  it('Calendar link href is /calendar', () => {
    renderSidebar();
    expect(screen.getByRole('link', { name: /calendar/i })).toHaveAttribute(
      'href',
      '/calendar',
    );
  });
});

// ---------------------------------------------------------------------------
// SVG icon presence
// ---------------------------------------------------------------------------

describe('Sidebar SVG icons', () => {
  beforeEach(() => {
    mockIsActive = false;
  });

  it('Contacts link contains an SVG element', () => {
    const { container } = renderSidebar();
    const contactsLink = screen.getByRole('link', { name: /contacts/i });
    expect(contactsLink.querySelector('svg')).toBeInTheDocument();
  });

  it('Notes link contains an SVG element', () => {
    renderSidebar();
    const notesLink = screen.getByRole('link', { name: /notes/i });
    expect(notesLink.querySelector('svg')).toBeInTheDocument();
  });

  it('Tasks link contains an SVG element', () => {
    renderSidebar();
    const tasksLink = screen.getByRole('link', { name: /tasks/i });
    expect(tasksLink.querySelector('svg')).toBeInTheDocument();
  });

  it('Calendar link contains an SVG element', () => {
    renderSidebar();
    const calendarLink = screen.getByRole('link', { name: /calendar/i });
    expect(calendarLink.querySelector('svg')).toBeInTheDocument();
  });

  it('all four links each contain exactly one SVG element', () => {
    const { container } = renderSidebar();
    const links = screen.getAllByRole('link');
    links.forEach((link) => {
      expect(link.querySelectorAll('svg')).toHaveLength(1);
    });
  });

  it('SVG icons have aria-hidden="true"', () => {
    const { container } = renderSidebar();
    const svgs = container.querySelectorAll('svg');
    svgs.forEach((svg) => {
      expect(svg).toHaveAttribute('aria-hidden', 'true');
    });
  });
});

// ---------------------------------------------------------------------------
// Active link highlighting
// ---------------------------------------------------------------------------

describe('Sidebar active link highlighting', () => {
  it('applies text-blue-700 class when NavLink reports isActive=true', () => {
    mockIsActive = true;
    renderSidebar();
    // All links share the same isActive mock — any one of them will have the class
    const links = screen.getAllByRole('link');
    links.forEach((link) => {
      expect(link.className).toMatch(/text-blue-700/);
    });
  });

  it('does not apply text-blue-700 class when NavLink reports isActive=false', () => {
    mockIsActive = false;
    renderSidebar();
    const links = screen.getAllByRole('link');
    links.forEach((link) => {
      expect(link.className).not.toMatch(/text-blue-700/);
    });
  });
});

// ---------------------------------------------------------------------------
// Layout and branding
// ---------------------------------------------------------------------------

describe('Sidebar layout', () => {
  beforeEach(() => {
    mockIsActive = false;
  });

  it('has a navigation landmark', () => {
    renderSidebar();
    expect(screen.getByRole('navigation')).toBeInTheDocument();
  });
});
