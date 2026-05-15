/**
 * TopNavbar — fixed-height top navigation bar rendered above the sidebar
 * and content area.
 *
 * Displays the PIM wordmark on the left and the global {@link SearchBar}
 * in the centre/right, constrained to a maximum width so it does not
 * stretch across the full viewport on wide screens.
 *
 * @module components/TopNavbar
 * @returns {JSX.Element}
 */
import React from 'react';
import SearchBar from './SearchBar.jsx';

/**
 * TopNavbar renders a `h-14` fixed-width bar with the application wordmark
 * and the search input.
 *
 * No props are accepted — this component is stateless and purely presentational.
 *
 * @returns {JSX.Element}
 */
function TopNavbar() {
  return (
    <header className="flex h-14 w-full items-center border-b border-gray-200 bg-white px-4 gap-4 z-20">
      <span className="text-xl font-bold text-gray-900 shrink-0">PIM</span>
      <div className="flex flex-1 justify-center">
        <div className="w-full max-w-xl">
          <SearchBar />
        </div>
      </div>
    </header>
  );
}

export default TopNavbar;
