/**
 * WidgetCard — shared card shell used by every Dashboard widget.
 * Renders a white bordered card with a heading, optional "View all" footer
 * link, and a slot for widget body content.
 *
 * @param {object}          props
 * @param {string}          props.title          - Widget heading text.
 * @param {string|null}     [props.viewAllTo]    - react-router-dom `to` path for
 *                                                 the "View all" link. Link is only
 *                                                 rendered when this is a non-null string.
 * @param {string}          [props.viewAllLabel] - Label text for the view-all link.
 *                                                 Defaults to "View all".
 * @param {React.ReactNode} props.children       - Widget body content.
 * @returns {JSX.Element}
 */
import React from 'react';
import { Link } from 'react-router-dom';

/**
 * WidgetCard renders a consistent card shell for Dashboard widgets.
 *
 * @param {object} props - See module-level JSDoc.
 * @returns {JSX.Element}
 */
function WidgetCard({ title, viewAllTo = null, viewAllLabel = 'View all', children }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5">
      {/* Heading */}
      <h2 className="text-base font-semibold text-gray-900">{title}</h2>

      {/* Separator between heading and body */}
      <hr className="my-3 border-gray-200" />

      {/* Widget body content */}
      <div>{children}</div>

      {/* "View all" footer link — only rendered when viewAllTo is a non-null string */}
      {viewAllTo !== null && typeof viewAllTo === 'string' && (
        <div className="mt-4">
          <Link
            to={viewAllTo}
            className="text-xs text-gray-500 hover:text-gray-700 hover:underline"
          >
            {viewAllLabel}
          </Link>
        </div>
      )}
    </div>
  );
}

export default WidgetCard;
