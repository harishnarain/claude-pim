/**
 * ColorPicker — a row of 8 circular color swatches for selecting an event color.
 *
 * Renders one <button> per color in `COLOR_PALETTE`. The currently selected
 * swatch is visually distinguished with a `ring-2 ring-offset-2` outline.
 * Clicking a swatch calls `onChange` with the color's key string.
 *
 * @module ColorPicker
 */

import React from 'react';

/**
 * The 8 available calendar event colors.
 * Each entry maps a stable key to Tailwind background and ring classes.
 *
 * @type {Array<{key: string, label: string, bg: string, ring: string}>}
 */
export const COLOR_PALETTE = [
  { key: 'blue',   label: 'Blue',   bg: 'bg-blue-500',   ring: 'ring-blue-500'   },
  { key: 'green',  label: 'Green',  bg: 'bg-green-500',  ring: 'ring-green-500'  },
  { key: 'red',    label: 'Red',    bg: 'bg-red-500',    ring: 'ring-red-500'    },
  { key: 'yellow', label: 'Yellow', bg: 'bg-yellow-400', ring: 'ring-yellow-400' },
  { key: 'purple', label: 'Purple', bg: 'bg-purple-500', ring: 'ring-purple-500' },
  { key: 'pink',   label: 'Pink',   bg: 'bg-pink-500',   ring: 'ring-pink-500'   },
  { key: 'orange', label: 'Orange', bg: 'bg-orange-500', ring: 'ring-orange-500' },
  { key: 'grey',   label: 'Grey',   bg: 'bg-gray-400',   ring: 'ring-gray-400'   },
];

/**
 * ColorPicker — controlled 8-swatch color selector.
 *
 * @param {object}   props
 * @param {string}   props.value    - The currently selected color key.
 * @param {Function} props.onChange - Called with the new color key when a swatch is clicked.
 * @returns {JSX.Element}
 */
function ColorPicker({ value, onChange }) {
  return (
    <div className="flex flex-wrap gap-2" role="group" aria-label="Color picker">
      {COLOR_PALETTE.map(({ key, label, bg, ring }) => {
        const isSelected = value === key;
        return (
          <button
            key={key}
            type="button"
            aria-label={`Select ${label.toLowerCase()} color`}
            aria-pressed={isSelected}
            onClick={() => onChange(key)}
            className={[
              'h-7 w-7 rounded-full focus:outline-none focus:ring-2 focus:ring-offset-2',
              bg,
              isSelected ? `ring-2 ring-offset-2 ${ring}` : '',
            ]
              .filter(Boolean)
              .join(' ')}
          />
        );
      })}
    </div>
  );
}

export default ColorPicker;
