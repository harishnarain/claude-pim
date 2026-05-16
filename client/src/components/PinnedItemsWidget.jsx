/**
 * PinnedItemsWidget — Dashboard widget showing pinned notes and tasks.
 *
 * Renders up to 6 pinned items (sorting/slicing is done by the hook before the
 * data reaches this component). Each item row shows a TypeIcon, the item title,
 * and a kind badge ("Note" or "Task"). Rows are clickable links that navigate to
 * the corresponding detail page.
 *
 * The widget is hidden entirely (returns null) when `items` is empty.
 *
 * A "View all" footer link is shown only when total > 6 AND all visible items
 * share the same kind. Mixed-kind overflow omits the link.
 *
 * @param {object}   props
 * @param {object[]} props.items - Combined pinned items (notes + tasks), already
 *                                 sorted and sliced to max 6 by the hook. Each
 *                                 item has a `kind` of `"note"` or `"task"`.
 * @param {number}   props.total - Total pinned item count before the 6-item cap.
 * @returns {JSX.Element|null}
 */
import React from 'react';
import { Link } from 'react-router-dom';
import WidgetCard from './WidgetCard.jsx';
import TypeIcon from './TypeIcon.jsx';

/**
 * Derive the first non-empty line of a note's content, used as the display
 * title when rendering a pinned note row.
 *
 * @param {string} content - Raw note content string.
 * @returns {string} The first non-empty line, or an empty string if none found.
 */
function noteTitle(content) {
  if (!content) return '';
  const lines = content.split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed) return trimmed;
  }
  return '';
}

/**
 * Determine the `viewAllTo` and `viewAllLabel` props for WidgetCard based on
 * total count and the kinds of the visible items.
 *
 * Rules:
 *   - total <= 6            → viewAllTo = null (no link needed)
 *   - total > 6, all notes  → viewAllTo = "/notes", viewAllLabel = "View all notes"
 *   - total > 6, all tasks  → viewAllTo = "/tasks", viewAllLabel = "View all tasks"
 *   - total > 6, mixed      → viewAllTo = null (omit link per spec)
 *
 * @param {object[]} items  - Visible items (already sliced to max 6).
 * @param {number}   total  - Total pinned count before the cap.
 * @returns {{ viewAllTo: string|null, viewAllLabel: string|undefined }}
 */
function resolveViewAll(items, total) {
  if (total <= 6) {
    return { viewAllTo: null, viewAllLabel: undefined };
  }

  const allNotes = items.every((item) => item.kind === 'note');
  const allTasks = items.every((item) => item.kind === 'task');

  if (allNotes) {
    return { viewAllTo: '/notes', viewAllLabel: 'View all notes' };
  }
  if (allTasks) {
    return { viewAllTo: '/tasks', viewAllLabel: 'View all tasks' };
  }

  // Mixed kinds — omit the link.
  return { viewAllTo: null, viewAllLabel: undefined };
}

/**
 * PinnedItemsWidget renders pinned notes and tasks inside a WidgetCard shell.
 *
 * @param {object}   props        - Component props.
 * @param {object[]} props.items  - Pinned items (max 6, pre-sorted by the hook).
 * @param {number}   props.total  - Total pinned count before the 6-item cap.
 * @returns {JSX.Element|null}
 */
function PinnedItemsWidget({ items, total }) {
  // Hidden entirely when there are no pinned items.
  if (items.length === 0) return null;

  const { viewAllTo, viewAllLabel } = resolveViewAll(items, total);

  return (
    <WidgetCard
      title="Pinned Items"
      viewAllTo={viewAllTo}
      viewAllLabel={viewAllLabel}
    >
      <ul className="space-y-1">
        {items.map((item) => {
          const title = item.kind === 'note' ? noteTitle(item.content) : item.title;
          const badge = item.kind === 'note' ? 'Note' : 'Task';
          const to = item.kind === 'note' ? `/notes/${item.id}` : `/tasks/${item.id}`;

          return (
            <li key={`${item.kind}-${item.id}`}>
              <Link
                to={to}
                className="flex items-center gap-2 rounded px-1 py-0.5 text-sm hover:bg-gray-50"
              >
                <TypeIcon kind={item.kind} className="shrink-0 text-gray-400" />
                <span className="flex-1 truncate font-medium text-gray-800">{title}</span>
                <span className="shrink-0 text-xs bg-gray-100 rounded px-1 text-gray-500">
                  {badge}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </WidgetCard>
  );
}

export default PinnedItemsWidget;
