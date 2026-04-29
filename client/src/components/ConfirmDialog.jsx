/**
 * ConfirmDialog — reusable modal dialog for confirming destructive actions.
 * Renders a backdrop overlay with a dialog box containing a message and
 * Confirm / Cancel buttons.
 *
 * @param {object}   props
 * @param {boolean}  props.isOpen     - Whether the dialog is visible.
 * @param {string}   props.message    - Confirmation message shown to the user.
 * @param {Function} props.onConfirm  - Called when the user clicks Confirm.
 * @param {Function} props.onCancel   - Called when the user clicks Cancel.
 * @returns {JSX.Element|null}
 */
import React from 'react';

/**
 * ConfirmDialog renders a modal overlay asking the user to confirm an action.
 * Returns null when isOpen is false.
 *
 * @param {object}   props
 * @param {boolean}  props.isOpen    - Controls dialog visibility.
 * @param {string}   props.message   - Text displayed inside the dialog.
 * @param {Function} props.onConfirm - Handler called on confirmation.
 * @param {Function} props.onCancel  - Handler called on cancellation.
 * @returns {JSX.Element|null}
 */
function ConfirmDialog({ isOpen, message, onConfirm, onCancel }) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-message"
    >
      <div className="w-full max-w-sm rounded-lg bg-white p-6 shadow-xl">
        <p
          id="confirm-dialog-message"
          className="mb-6 text-sm text-gray-700"
        >
          {message}
        </p>
        <div className="flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-md px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-300"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500"
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
}

export default ConfirmDialog;
