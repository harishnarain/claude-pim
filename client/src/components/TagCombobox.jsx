/**
 * TagCombobox — controlled multi-select combobox for selecting and creating tags.
 *
 * Selected tags are shown as removable chips above the text input.
 * The input filters the `available` list as the user types. If the typed text
 * does not match any existing tag and the user presses Enter, a
 * "Create tag: <name>" option appears in the dropdown; selecting it adds the
 * lowercased, trimmed text as a plain string to the selection.
 *
 * Constraints:
 *   - Maximum 5 tags: once 5 are selected the input is disabled.
 *   - Tag names are capped at 30 characters (input ignores extra characters).
 *
 * @param {object}   props
 * @param {Array<string|{id:number,name:string}>} props.selected
 *   Currently applied tags — items are plain strings (new/unsaved) or objects.
 * @param {Array<{id:number,name:string}>}        props.available
 *   All tags fetched from the store.
 * @param {Function} props.onChange
 *   Called with the updated selected array whenever the selection changes.
 * @returns {JSX.Element}
 */

import React, { useState, useRef, useCallback } from 'react';

/** Maximum number of tags that may be applied at once. */
const MAX_TAGS = 5;

/** Maximum characters allowed per tag name. */
const MAX_TAG_LENGTH = 30;

/**
 * Derive the display name from a tag item (string or object).
 * @param {string|{id:number,name:string}} tag
 * @returns {string}
 */
function tagName(tag) {
  return typeof tag === 'string' ? tag : tag.name;
}

/**
 * Derive a stable key for a tag item.
 * @param {string|{id:number,name:string}} tag
 * @param {number} index - Fallback index.
 * @returns {string}
 */
function tagKey(tag, index) {
  if (typeof tag === 'string') return `new-${tag}-${index}`;
  return `existing-${tag.id}`;
}

/**
 * Check whether a tag item matches a given name string (case-insensitive).
 * @param {string|{id:number,name:string}} tag
 * @param {string} name
 * @returns {boolean}
 */
function tagMatchesName(tag, name) {
  return tagName(tag).toLowerCase() === name.toLowerCase();
}

/**
 * TagCombobox — multi-select combobox with on-the-fly tag creation.
 * @param {object} props - See module-level JSDoc.
 * @returns {JSX.Element}
 */
function TagCombobox({ selected, available, onChange }) {
  const [inputValue, setInputValue] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const blurTimerRef = useRef(null);

  const atLimit = selected.length >= MAX_TAGS;

  /**
   * Compute the filtered list of available tags based on the current input.
   * Already-selected tags are excluded.
   * @returns {Array<{id:number,name:string}>}
   */
  const filteredOptions = available.filter((opt) => {
    const alreadySelected = selected.some((s) => tagMatchesName(s, opt.name));
    if (alreadySelected) return false;
    if (!inputValue.trim()) return true;
    return opt.name.toLowerCase().includes(inputValue.toLowerCase());
  });

  /** Whether the typed text is an exact match for an existing available tag. */
  const hasExactMatch = available.some(
    (opt) => opt.name.toLowerCase() === inputValue.trim().toLowerCase()
  );

  /** Whether to show the "Create tag: …" option. */
  const showCreateOption =
    inputValue.trim().length > 0 && !hasExactMatch && !atLimit;

  /**
   * Add a tag to the selection and notify the parent.
   * @param {string|{id:number,name:string}} tag
   */
  const addTag = useCallback(
    (tag) => {
      if (selected.length >= MAX_TAGS) return;
      onChange([...selected, tag]);
      setInputValue('');
      setIsOpen(false);
    },
    [selected, onChange]
  );

  /**
   * Remove a tag from the selection by index and notify the parent.
   * @param {number} index
   */
  const removeTag = useCallback(
    (index) => {
      const next = selected.filter((_, i) => i !== index);
      onChange(next);
    },
    [selected, onChange]
  );

  /**
   * Handle keyboard events on the text input.
   * @param {React.KeyboardEvent<HTMLInputElement>} e
   */
  function handleKeyDown(e) {
    if (e.key === 'Escape') {
      setIsOpen(false);
      return;
    }

    if (e.key === 'Enter') {
      e.preventDefault();
      const trimmed = inputValue.trim().toLowerCase();

      if (!trimmed) return;
      if (atLimit) return;

      // If there is an exact match in the filtered list, select it.
      const exactInFiltered = filteredOptions.find(
        (opt) => opt.name.toLowerCase() === trimmed
      );
      if (exactInFiltered) {
        addTag(exactInFiltered);
        return;
      }

      // If no exact match and the name is not already selected, create it.
      const alreadySelected = selected.some(
        (s) => tagName(s).toLowerCase() === trimmed
      );
      if (!alreadySelected && showCreateOption) {
        addTag(trimmed);
      }
    }
  }

  /**
   * Handle input value changes; enforce the 30-character cap.
   * @param {React.ChangeEvent<HTMLInputElement>} e
   */
  function handleInputChange(e) {
    const raw = e.target.value;
    // Cap at MAX_TAG_LENGTH characters.
    const capped = raw.slice(0, MAX_TAG_LENGTH);
    setInputValue(capped);
    setIsOpen(true);
  }

  /**
   * When the input gains focus, open the dropdown.
   */
  function handleFocus() {
    if (blurTimerRef.current) {
      clearTimeout(blurTimerRef.current);
      blurTimerRef.current = null;
    }
    setIsOpen(true);
  }

  /**
   * When the input loses focus, close the dropdown after a short delay
   * so that click events on dropdown items can fire first.
   */
  function handleBlur() {
    blurTimerRef.current = setTimeout(() => {
      setIsOpen(false);
    }, 150);
  }

  /**
   * Select an existing tag from the dropdown.
   * @param {{id:number,name:string}} opt
   */
  function handleSelectOption(opt) {
    addTag(opt);
  }

  /**
   * Create a new tag from the current input value.
   */
  function handleCreateTag() {
    const trimmed = inputValue.trim().toLowerCase();
    if (trimmed) addTag(trimmed);
  }

  const dropdownVisible =
    isOpen && !atLimit && (filteredOptions.length > 0 || showCreateOption);

  return (
    <div className="relative">
      {/* Selected tag chips */}
      {selected.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-1" aria-label="Selected tags">
          {selected.map((tag, index) => (
            <span
              key={tagKey(tag, index)}
              className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-800"
            >
              {tagName(tag)}
              <button
                type="button"
                onClick={() => removeTag(index)}
                aria-label={`Remove tag ${tagName(tag)}`}
                className="ml-0.5 rounded-full hover:bg-blue-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                &times;
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Text input */}
      <input
        type="text"
        role="combobox"
        aria-expanded={dropdownVisible}
        aria-label="Tag search"
        value={inputValue}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        onFocus={handleFocus}
        onBlur={handleBlur}
        disabled={atLimit}
        maxLength={MAX_TAG_LENGTH}
        placeholder={atLimit ? 'Maximum 5 tags reached' : 'Type to search or create a tag…'}
        className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:bg-gray-100 disabled:opacity-60"
      />

      {/* Limit hint */}
      {atLimit && (
        <p className="mt-1 text-xs text-gray-500" role="note">
          Maximum of {MAX_TAGS} tags reached. Remove a tag to add another.
        </p>
      )}

      {/* Dropdown */}
      {dropdownVisible && (
        <ul
          role="listbox"
          aria-label="Tag options"
          className="absolute z-10 mt-1 max-h-48 w-full overflow-auto rounded-md border border-gray-200 bg-white py-1 shadow-lg"
        >
          {filteredOptions.map((opt) => {
            const isTopResult =
              inputValue.trim().length > 0 &&
              opt.name.toLowerCase().startsWith(inputValue.trim().toLowerCase());
            return (
              <li
                key={opt.id}
                role="option"
                aria-selected={false}
                onMouseDown={(e) => {
                  // Prevent input blur from closing the dropdown before click fires.
                  e.preventDefault();
                }}
                onClick={() => handleSelectOption(opt)}
                className={`cursor-pointer px-3 py-2 text-sm hover:bg-blue-50 ${
                  isTopResult ? 'font-medium text-blue-700' : 'text-gray-700'
                }`}
              >
                {opt.name}
              </li>
            );
          })}

          {showCreateOption && (
            <li
              role="option"
              aria-selected={false}
              onMouseDown={(e) => {
                e.preventDefault();
              }}
              onClick={handleCreateTag}
              className="cursor-pointer px-3 py-2 text-sm italic text-green-700 hover:bg-green-50"
            >
              Create tag: &ldquo;{inputValue.trim().toLowerCase()}&rdquo;
            </li>
          )}
        </ul>
      )}
    </div>
  );
}

export default TagCombobox;
