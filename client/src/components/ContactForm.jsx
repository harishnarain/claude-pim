/**
 * ContactForm — shared controlled form component for creating and editing contacts.
 * Validates required fields (firstName, lastName) and optional email format.
 * Calls onSubmit with camelCase form data when the form is valid.
 *
 * @param {object}   props
 * @param {object}   [props.initialValues]       - Pre-filled values for edit mode.
 * @param {string}   [props.initialValues.firstName]
 * @param {string}   [props.initialValues.lastName]
 * @param {string}   [props.initialValues.email]
 * @param {string}   [props.initialValues.phone]
 * @param {string}   [props.initialValues.company]
 * @param {string}   [props.initialValues.notes]
 * @param {Function} props.onSubmit              - Called with form data object on valid submit.
 * @param {Function} props.onCancel              - Called when the user clicks Cancel.
 * @param {boolean}  props.isLoading             - When true, disables the submit button.
 * @returns {JSX.Element}
 */

import React, { useState } from 'react';

/** Regex for basic email validation (mirrors server-side rule). */
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Build the default empty form state.
 * @param {object} [initial={}] - Optional initial values to merge in.
 * @returns {object} Form state object.
 */
function buildInitialState(initial = {}) {
  return {
    firstName: initial.firstName ?? '',
    lastName: initial.lastName ?? '',
    email: initial.email ?? '',
    phone: initial.phone ?? '',
    company: initial.company ?? '',
    notes: initial.notes ?? '',
  };
}

/**
 * Validate the form fields.
 * @param {object} values - Current form values.
 * @returns {object} An errors object; empty if no validation errors.
 */
function validate(values) {
  const errors = {};

  if (!values.firstName.trim()) {
    errors.firstName = 'First name is required.';
  }

  if (!values.lastName.trim()) {
    errors.lastName = 'Last name is required.';
  }

  if (values.email.trim() && !EMAIL_REGEX.test(values.email.trim())) {
    errors.email = 'Enter a valid email address.';
  }

  return errors;
}

/**
 * ContactForm — controlled form for creating or editing a contact.
 * @param {object} props - See module-level JSDoc for prop details.
 * @returns {JSX.Element}
 */
function ContactForm({ initialValues, onSubmit, onCancel, isLoading }) {
  const [values, setValues] = useState(() => buildInitialState(initialValues));
  const [errors, setErrors] = useState({});

  /**
   * Generic change handler for all text inputs and textareas.
   * @param {React.ChangeEvent<HTMLInputElement|HTMLTextAreaElement>} e
   */
  function handleChange(e) {
    const { name, value } = e.target;
    setValues((prev) => ({ ...prev, [name]: value }));
    // Clear the error for the field being edited.
    if (errors[name]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[name];
        return next;
      });
    }
  }

  /**
   * Handle form submission. Validates all fields; if valid, calls onSubmit.
   * @param {React.FormEvent<HTMLFormElement>} e
   */
  function handleSubmit(e) {
    e.preventDefault();
    const validationErrors = validate(values);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }
    onSubmit({
      firstName: values.firstName.trim(),
      lastName: values.lastName.trim(),
      email: values.email.trim() || null,
      phone: values.phone.trim() || null,
      company: values.company.trim() || null,
      notes: values.notes.trim() || null,
    });
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-4">
      {/* First Name */}
      <div>
        <label
          htmlFor="firstName"
          className="block text-sm font-medium text-gray-700"
        >
          First Name <span className="text-red-500">*</span>
        </label>
        <input
          id="firstName"
          name="firstName"
          type="text"
          value={values.firstName}
          onChange={handleChange}
          disabled={isLoading}
          className={`mt-1 block w-full rounded-md border px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
            errors.firstName
              ? 'border-red-500 focus:ring-red-500'
              : 'border-gray-300'
          } disabled:opacity-50`}
        />
        {errors.firstName && (
          <p className="mt-1 text-xs text-red-600" role="alert">
            {errors.firstName}
          </p>
        )}
      </div>

      {/* Last Name */}
      <div>
        <label
          htmlFor="lastName"
          className="block text-sm font-medium text-gray-700"
        >
          Last Name <span className="text-red-500">*</span>
        </label>
        <input
          id="lastName"
          name="lastName"
          type="text"
          value={values.lastName}
          onChange={handleChange}
          disabled={isLoading}
          className={`mt-1 block w-full rounded-md border px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
            errors.lastName
              ? 'border-red-500 focus:ring-red-500'
              : 'border-gray-300'
          } disabled:opacity-50`}
        />
        {errors.lastName && (
          <p className="mt-1 text-xs text-red-600" role="alert">
            {errors.lastName}
          </p>
        )}
      </div>

      {/* Email */}
      <div>
        <label
          htmlFor="email"
          className="block text-sm font-medium text-gray-700"
        >
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          value={values.email}
          onChange={handleChange}
          disabled={isLoading}
          className={`mt-1 block w-full rounded-md border px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
            errors.email
              ? 'border-red-500 focus:ring-red-500'
              : 'border-gray-300'
          } disabled:opacity-50`}
        />
        {errors.email && (
          <p className="mt-1 text-xs text-red-600" role="alert">
            {errors.email}
          </p>
        )}
      </div>

      {/* Phone */}
      <div>
        <label
          htmlFor="phone"
          className="block text-sm font-medium text-gray-700"
        >
          Phone
        </label>
        <input
          id="phone"
          name="phone"
          type="tel"
          value={values.phone}
          onChange={handleChange}
          disabled={isLoading}
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
        />
      </div>

      {/* Company */}
      <div>
        <label
          htmlFor="company"
          className="block text-sm font-medium text-gray-700"
        >
          Company
        </label>
        <input
          id="company"
          name="company"
          type="text"
          value={values.company}
          onChange={handleChange}
          disabled={isLoading}
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
        />
      </div>

      {/* Notes */}
      <div>
        <label
          htmlFor="notes"
          className="block text-sm font-medium text-gray-700"
        >
          Notes
        </label>
        <textarea
          id="notes"
          name="notes"
          rows={4}
          value={values.notes}
          onChange={handleChange}
          disabled={isLoading}
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
        />
      </div>

      {/* Actions */}
      <div className="flex items-center justify-end gap-3 pt-2">
        <button
          type="button"
          onClick={onCancel}
          disabled={isLoading}
          className="rounded-md px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-300 disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isLoading}
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
        >
          {isLoading ? 'Saving…' : 'Save'}
        </button>
      </div>
    </form>
  );
}

export default ContactForm;
