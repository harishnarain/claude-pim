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
 * @constant {Array<{label: string, to: string, end?: boolean}>}
 * Navigation link definitions. The `end` flag mirrors the react-router-dom
 * NavLink `end` prop — when true the link is only "active" on an exact path
 * match; when false (or absent) any sub-path also activates the link.
 */
const NAV_LINKS = [
  { label: 'Contacts', to: '/contacts', end: true },
  { label: 'Notes', to: '/notes' },
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
      <span className="mb-6 px-3 text-xl font-bold text-gray-900">PIM</span>
      <nav aria-label="Main navigation">
        <ul className="space-y-1">
          {NAV_LINKS.map(({ label, to, end }) => (
            <li key={to}>
              <NavLink to={to} className={navLinkClass} end={end ?? false}>
                {label}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </aside>
  );
}

export default Sidebar;
