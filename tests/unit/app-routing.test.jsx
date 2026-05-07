/**
 * Unit tests for routing and sidebar navigation (Tasks 10 and 16).
 *
 * Tests cover:
 *   - Sidebar.jsx: renders Contacts and Notes nav links, active/inactive styles
 *   - App.jsx: mounts Sidebar and renders the expected page component per route,
 *              including the three new Notes routes added in Task 16
 *
 * react-router-dom is fully mocked so tests run without a real browser router
 * and avoid the React version conflict that arises when MemoryRouter is used
 * across the monorepo's split node_modules trees.
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

  /**
   * Routes mock — picks the FIRST Route child whose path matches the current
   * test pathname (global.__TEST_PATHNAME__). This mirrors React Router v6
   * "first match wins" semantics.
   *
   * Matching rules (applied in child order, stops at first match):
   *   1. Exact static path match
   *   2. Root "/" path treated as redirect sentinel
   *   3. Param route: every segment matches (param segments accept any value)
   *
   * @param {object} props
   * @param {React.ReactNode} props.children
   * @returns {JSX.Element|null}
   */
  const Routes = ({ children }) => {
    const current = global.__TEST_PATHNAME__ ?? '/';
    const childArray = React.Children.toArray(children);

    /**
     * Test whether a route pattern matches the current path.
     * @param {string} pattern - Route path pattern (may contain :param segments).
     * @returns {boolean}
     */
    function matches(pattern) {
      if (pattern === current) return true;
      if (!pattern.includes(':')) return false;

      const patternParts = pattern.split('/');
      const currentParts = current.split('/');
      if (patternParts.length !== currentParts.length) return false;

      return patternParts.every(
        (part, i) => part.startsWith(':') || part === currentParts[i],
      );
    }

    // Find the first matching child Route and render its element
    for (const child of childArray) {
      if (!child || !child.props) continue;
      if (matches(child.props.path)) {
        return child.props.element ?? null;
      }
    }
    return null;
  };

  /** Route mock — just a config carrier; Routes reads .props.path and .props.element. */
  const Route = ({ path: _path, element: _element }) => null;

  /**
   * Navigate mock — renders a sentinel element for assertion.
   * @param {object} props
   * @param {string} props.to
   * @returns {JSX.Element}
   */
  const Navigate = ({ to }) => <span data-testid="navigate" data-to={to} />;

  /** BrowserRouter mock — transparent wrapper. */
  const BrowserRouter = ({ children }) => <>{children}</>;

  return { NavLink, Routes, Route, Navigate, BrowserRouter };
});

// ---------------------------------------------------------------------------
// Mock page components
// ---------------------------------------------------------------------------

vi.mock('../../client/src/pages/ContactsPage.jsx', () => ({
  default: () => <div data-testid="contacts-page">ContactsPage</div>,
}));

vi.mock('../../client/src/pages/ContactDetailPage.jsx', () => ({
  default: () => <div data-testid="contact-detail-page">ContactDetailPage</div>,
}));

vi.mock('../../client/src/pages/NotesPage.jsx', () => ({
  default: () => <div data-testid="notes-page">NotesPage</div>,
}));

vi.mock('../../client/src/pages/NoteEditorPage.jsx', () => ({
  default: () => <div data-testid="note-editor-page">NoteEditorPage</div>,
}));

// ---------------------------------------------------------------------------
// Imports (after mocks are declared)
// ---------------------------------------------------------------------------

import Sidebar from '../../client/src/components/Sidebar.jsx';
import App from '../../client/src/App.jsx';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Set the fake current pathname used by the Routes mock.
 * @param {string} path - e.g. '/contacts' or '/contacts/42'
 */
function setPath(path) {
  global.__TEST_PATHNAME__ = path;
}

// ---------------------------------------------------------------------------
// Sidebar tests
// ---------------------------------------------------------------------------

describe('Sidebar', () => {
  beforeEach(() => {
    mockIsActive = false;
    setPath('/');
  });

  it('renders a Contacts link', () => {
    render(<Sidebar />);
    expect(screen.getByRole('link', { name: /contacts/i })).toBeInTheDocument();
  });

  it('Contacts link href is /contacts', () => {
    render(<Sidebar />);
    expect(screen.getByRole('link', { name: /contacts/i })).toHaveAttribute(
      'href',
      '/contacts',
    );
  });

  it('applies an active class when NavLink reports isActive=true', () => {
    mockIsActive = true;
    render(<Sidebar />);
    const link = screen.getByRole('link', { name: /contacts/i });
    expect(link.className).toMatch(/text-blue-700/);
  });

  it('does not apply the active class when NavLink reports isActive=false', () => {
    mockIsActive = false;
    render(<Sidebar />);
    const link = screen.getByRole('link', { name: /contacts/i });
    expect(link.className).not.toMatch(/text-blue-700/);
  });

  it('renders the PIM brand label', () => {
    render(<Sidebar />);
    expect(screen.getByText('PIM')).toBeInTheDocument();
  });

  it('has a navigation landmark', () => {
    render(<Sidebar />);
    expect(screen.getByRole('navigation')).toBeInTheDocument();
  });

  it('renders a Notes link', () => {
    render(<Sidebar />);
    expect(screen.getByRole('link', { name: /notes/i })).toBeInTheDocument();
  });

  it('Notes link href is /notes', () => {
    render(<Sidebar />);
    expect(screen.getByRole('link', { name: /notes/i })).toHaveAttribute(
      'href',
      '/notes',
    );
  });
});

// ---------------------------------------------------------------------------
// App routing tests
// ---------------------------------------------------------------------------

describe('App routing', () => {
  beforeEach(() => {
    mockIsActive = false;
  });

  it('renders the Sidebar on every route', () => {
    setPath('/contacts');
    render(<App />);
    expect(screen.getByRole('link', { name: /contacts/i })).toBeInTheDocument();
  });

  it('renders ContactsPage at /contacts', () => {
    setPath('/contacts');
    render(<App />);
    expect(screen.getByTestId('contacts-page')).toBeInTheDocument();
  });

  it('renders ContactDetailPage at /contacts/new', () => {
    setPath('/contacts/new');
    render(<App />);
    expect(screen.getByTestId('contact-detail-page')).toBeInTheDocument();
  });

  it('does not render ContactsPage at /contacts/new', () => {
    setPath('/contacts/new');
    render(<App />);
    expect(screen.queryByTestId('contacts-page')).not.toBeInTheDocument();
  });

  it('renders ContactDetailPage at /contacts/:id', () => {
    setPath('/contacts/42');
    render(<App />);
    expect(screen.getByTestId('contact-detail-page')).toBeInTheDocument();
  });

  it('redirects / to /contacts via Navigate', () => {
    setPath('/');
    render(<App />);
    const nav = screen.getByTestId('navigate');
    expect(nav).toHaveAttribute('data-to', '/contacts');
  });

  it('renders NotesPage at /notes', () => {
    setPath('/notes');
    render(<App />);
    expect(screen.getByTestId('notes-page')).toBeInTheDocument();
  });

  it('renders NoteEditorPage at /notes/new', () => {
    setPath('/notes/new');
    render(<App />);
    expect(screen.getByTestId('note-editor-page')).toBeInTheDocument();
  });

  it('does not render NotesPage at /notes/new', () => {
    setPath('/notes/new');
    render(<App />);
    expect(screen.queryByTestId('notes-page')).not.toBeInTheDocument();
  });

  it('renders NoteEditorPage at /notes/:id', () => {
    setPath('/notes/42');
    render(<App />);
    expect(screen.getByTestId('note-editor-page')).toBeInTheDocument();
  });

  it('renders the Notes sidebar link on any notes route', () => {
    setPath('/notes');
    render(<App />);
    expect(screen.getByRole('link', { name: /notes/i })).toBeInTheDocument();
  });
});
