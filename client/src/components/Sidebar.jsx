/**
 * Sidebar — application-wide navigation sidebar.
 * Renders nav links for each major module. Uses NavLink from react-router-dom
 * so the active link receives a highlighted style automatically.
 *
 * @returns {JSX.Element}
 */
import React from 'react';
import { NavLink } from 'react-router-dom';

/**
 * @constant {Array<{label: string, to: string, end?: boolean, icon: JSX.Element}>}
 * Navigation link definitions. The `end` flag mirrors the react-router-dom
 * NavLink `end` prop — when true the link is only "active" on an exact path
 * match; when false (or absent) any sub-path also activates the link.
 * Each entry includes an `icon` — an inline SVG React element with aria-hidden.
 */
const NAV_LINKS = [
  {
    label: 'Contacts',
    to: '/contacts',
    end: true,
    icon: (
      <svg
        width="16"
        height="16"
        viewBox="0 0 16 16"
        aria-hidden="true"
        stroke="currentColor"
        fill="none"
        strokeWidth="1.5"
        strokeLinecap="round"
      >
        {/* Circle head */}
        <circle cx="8" cy="5" r="2.5" />
        {/* Arc shoulders */}
        <path d="M2 14c0-3.314 2.686-5 6-5s6 1.686 6 5" />
      </svg>
    ),
  },
  {
    label: 'Notes',
    to: '/notes',
    icon: (
      <svg
        width="16"
        height="16"
        viewBox="0 0 16 16"
        aria-hidden="true"
        stroke="currentColor"
        fill="none"
        strokeWidth="1.5"
        strokeLinecap="round"
      >
        {/* Document rectangle */}
        <rect x="2.5" y="1.5" width="11" height="13" rx="1" />
        {/* Three horizontal lines */}
        <line x1="5" y1="5.5" x2="11" y2="5.5" />
        <line x1="5" y1="8" x2="11" y2="8" />
        <line x1="5" y1="10.5" x2="9" y2="10.5" />
      </svg>
    ),
  },
  {
    label: 'Tasks',
    to: '/tasks',
    icon: (
      <svg
        width="16"
        height="16"
        viewBox="0 0 16 16"
        aria-hidden="true"
        stroke="currentColor"
        fill="none"
        strokeWidth="1.5"
        strokeLinecap="round"
      >
        {/* Square checkbox */}
        <rect x="2.5" y="2.5" width="11" height="11" rx="1.5" />
        {/* Tick mark */}
        <polyline points="5,8 7,10.5 11,5.5" />
      </svg>
    ),
  },
  {
    label: 'Calendar',
    to: '/calendar',
    end: false,
    icon: (
      <svg
        width="16"
        height="16"
        viewBox="0 0 16 16"
        aria-hidden="true"
        stroke="currentColor"
        fill="none"
        strokeWidth="1.5"
        strokeLinecap="round"
      >
        {/* Outer rectangle */}
        <rect x="1.5" y="2.5" width="13" height="12" rx="1.5" />
        {/* Header separator line */}
        <line x1="1.5" y1="6.5" x2="14.5" y2="6.5" />
        {/* Left peg */}
        <line x1="5" y1="1" x2="5" y2="4" />
        {/* Right peg */}
        <line x1="11" y1="1" x2="11" y2="4" />
        {/* Grid dots — row 1 */}
        <line x1="5" y1="9.5" x2="5" y2="9.5" strokeLinecap="round" strokeWidth="2" />
        <line x1="8" y1="9.5" x2="8" y2="9.5" strokeLinecap="round" strokeWidth="2" />
        <line x1="11" y1="9.5" x2="11" y2="9.5" strokeLinecap="round" strokeWidth="2" />
        {/* Grid dots — row 2 */}
        <line x1="5" y1="12.5" x2="5" y2="12.5" strokeLinecap="round" strokeWidth="2" />
        <line x1="8" y1="12.5" x2="8" y2="12.5" strokeLinecap="round" strokeWidth="2" />
      </svg>
    ),
  },
];

/**
 * Build the className string for a NavLink, applying an active style when the
 * link matches the current route.
 *
 * @param {object} params
 * @param {boolean} params.isActive - Whether the link is currently active.
 * @returns {string} Tailwind class string.
 */
function navLinkClass({ isActive }) {
  const base =
    'block rounded-md px-3 py-2 text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500';
  const active = 'bg-blue-100 text-blue-700';
  const inactive = 'text-gray-700 hover:bg-gray-100 hover:text-gray-900';
  return `${base} ${isActive ? active : inactive}`;
}

/**
 * Sidebar component with nav links for each PIM module.
 * @returns {JSX.Element}
 */
function Sidebar() {
  return (
    <aside className="flex h-full w-56 flex-col border-r border-gray-200 bg-white px-3 py-6">
      <nav aria-label="Main navigation">
        <ul className="space-y-1">
          {NAV_LINKS.map(({ label, to, end, icon }) => (
            <li key={to}>
              <NavLink to={to} className={navLinkClass} end={end ?? false}>
                <span className="flex items-center gap-2">
                  {icon}
                  <span>{label}</span>
                </span>
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </aside>
  );
}

export default Sidebar;
