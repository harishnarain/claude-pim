/**
 * FilterControl — multi-select filter UI for task status and priority.
 *
 * Renders two independent toggle-button sections side-by-side. Each section
 * shows all enum values as keyboard-accessible toggle buttons. Active filters
 * display a count badge next to the section label and a "Clear" button resets
 * that section's filter array.
 *
 * @param {object}   props
 * @param {string[]} props.statusFilter    - Currently active status filter values.
 * @param {string[]} props.priorityFilter  - Currently active priority filter values.
 * @param {Function} props.onStatusChange  - Called with the new status filter array.
 * @param {Function} props.onPriorityChange - Called with the new priority filter array.
 * @returns {JSX.Element}
 */
import React from 'react';

/** All valid task status values. */
const STATUS_VALUES = [
  'Not Started',
  'Blocked',
  'In Progress',
  'Completed',
  'Cancelled',
];

/** All valid task priority values. */
const PRIORITY_VALUES = ['Low', 'Medium', 'High'];

/**
 * Toggle a value in an array — adds it if absent, removes it if present.
 *
 * @param {string[]} arr   - The current filter array.
 * @param {string}   value - The value to toggle.
 * @returns {string[]} A new array with the value toggled.
 */
function toggleValue(arr, value) {
  return arr.includes(value) ? arr.filter((v) => v !== value) : [...arr, value];
}

/**
 * FilterSection renders a labelled group of toggle buttons for a single filter
 * dimension (status or priority).
 *
 * @param {object}   props
 * @param {string}   props.label      - Section heading text.
 * @param {string[]} props.values     - All available enum values for this filter.
 * @param {string[]} props.active     - Currently selected filter values.
 * @param {Function} props.onChange   - Called with the new active array when a value is toggled.
 * @param {Function} props.onClear    - Called with no arguments when "Clear" is clicked.
 * @returns {JSX.Element}
 */
function FilterSection({ label, values, active, onChange, onClear }) {
  /** Count of currently active filters for the badge display. */
  const activeCount = active.length;

  /**
   * Toggle the given value in the active filter array and notify the parent.
   *
   * @param {string} value - The enum value that was clicked.
   */
  function handleToggle(value) {
    onChange(toggleValue(active, value));
  }

  return (
    <div className="flex flex-col gap-2">
      {/* Section header row */}
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium text-gray-700">{label}</span>
        {activeCount > 0 && (
          <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-semibold text-blue-700">
            {activeCount} active
          </span>
        )}
        {activeCount > 0 && (
          <button
            type="button"
            onClick={onClear}
            className="text-xs text-gray-500 underline hover:text-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-500 rounded"
          >
            Clear
          </button>
        )}
      </div>

      {/* Toggle buttons */}
      <div className="flex flex-wrap gap-1.5">
        {values.map((value) => {
          const isPressed = active.includes(value);
          return (
            <button
              key={value}
              type="button"
              aria-pressed={isPressed}
              onClick={() => handleToggle(value)}
              className={[
                'rounded-md border px-2.5 py-1 text-xs font-medium transition-colors',
                'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1',
                isPressed
                  ? 'border-blue-500 bg-blue-500 text-white'
                  : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50',
              ].join(' ')}
            >
              {value}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/**
 * FilterControl renders status and priority filter sections side-by-side.
 *
 * @param {object}   props - See module-level JSDoc.
 * @returns {JSX.Element}
 */
function FilterControl({
  statusFilter,
  priorityFilter,
  onStatusChange,
  onPriorityChange,
}) {
  return (
    <div className="flex flex-wrap gap-6">
      <FilterSection
        label="Status"
        values={STATUS_VALUES}
        active={statusFilter}
        onChange={onStatusChange}
        onClear={() => onStatusChange([])}
      />
      <FilterSection
        label="Priority"
        values={PRIORITY_VALUES}
        active={priorityFilter}
        onChange={onPriorityChange}
        onClear={() => onPriorityChange([])}
      />
    </div>
  );
}

export default FilterControl;
