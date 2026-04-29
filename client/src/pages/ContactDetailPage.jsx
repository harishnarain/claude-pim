/**
 * ContactDetailPage — shows the full detail of a single contact.
 * Supports an inline edit mode (via ContactForm) and a delete action
 * with a ConfirmDialog prompt.
 *
 * Routing behaviour:
 *   - Loads the contact by :id from the Zustand store on mount.
 *   - If the API returns 404 (or the store errors with NOT_FOUND), redirects
 *     to /contacts with a toast banner message.
 *   - After a successful delete, redirects to /contacts with a toast banner.
 *
 * @returns {JSX.Element}
 */
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useContactsStore } from '../store/contactsStore.js';
import ContactForm from '../components/ContactForm.jsx';
import ConfirmDialog from '../components/ConfirmDialog.jsx';

/** @constant {string} Error message shown when a contact cannot be found. */
const NOT_FOUND_MESSAGE = 'Contact not found.';

/**
 * Render a labelled read-only field row.
 *
 * @param {object} props
 * @param {string} props.label - Field label text.
 * @param {string|null|undefined} props.value - Field value; nothing rendered when falsy.
 * @returns {JSX.Element|null}
 */
function DetailField({ label, value }) {
  if (!value) return null;
  return (
    <div className="py-3 sm:grid sm:grid-cols-3 sm:gap-4">
      <dt className="text-sm font-medium text-gray-500">{label}</dt>
      <dd className="mt-1 text-sm text-gray-900 sm:col-span-2 sm:mt-0">{value}</dd>
    </div>
  );
}

/**
 * ContactDetailPage — detail, edit, and delete page for a single contact.
 * @returns {JSX.Element}
 */
function ContactDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const {
    selectedContact,
    isLoading,
    error,
    fetchContact,
    updateContact,
    deleteContact,
  } = useContactsStore();

  /** Whether the edit form is currently visible. */
  const [isEditing, setIsEditing] = useState(false);

  /** Whether the ConfirmDialog for deletion is open. */
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);

  /** Toast message shown in a banner at the top of the page. */
  const [toast, setToast] = useState(null);

  /**
   * Show a toast message that auto-dismisses after 4 seconds.
   * @param {string} message - The message to display.
   */
  function showToast(message) {
    setToast(message);
    setTimeout(() => setToast(null), 4000);
  }

  /**
   * Fetch the contact by :id when the component mounts or the id changes.
   * The store will set `error` if the contact is not found.
   */
  useEffect(() => {
    fetchContact(id);
  }, [id, fetchContact]);

  /**
   * When the store sets an error that looks like a 404 / NOT_FOUND,
   * navigate back to the list with a toast message.
   */
  useEffect(() => {
    if (error && (error.includes('404') || error.toLowerCase().includes('not found'))) {
      navigate('/contacts', { state: { toast: NOT_FOUND_MESSAGE } });
    }
  }, [error, navigate]);

  /**
   * Handle the form's onSubmit — calls updateContact in the store.
   * On success, exits edit mode and shows a success toast.
   * On failure, shows an error toast.
   *
   * @param {object} data - Partial camelCase contact fields from ContactForm.
   * @returns {Promise<void>}
   */
  async function handleSave(data) {
    try {
      await updateContact(Number(id), data);
      setIsEditing(false);
      showToast('Contact updated.');
    } catch {
      showToast('Failed to save changes. Please try again.');
    }
  }

  /** Exit edit mode without saving — resets ContactForm via key change. */
  function handleCancelEdit() {
    setIsEditing(false);
  }

  /**
   * Open the ConfirmDialog for deletion.
   */
  function handleDeleteClick() {
    setIsConfirmOpen(true);
  }

  /**
   * Close the ConfirmDialog without deleting.
   */
  function handleCancelDelete() {
    setIsConfirmOpen(false);
  }

  /**
   * Execute the deletion: call store.deleteContact, then navigate back to
   * the list page with a success toast in router state.
   * @returns {Promise<void>}
   */
  async function handleConfirmDelete() {
    setIsConfirmOpen(false);
    try {
      await deleteContact(Number(id));
      navigate('/contacts', { state: { toast: 'Contact deleted.' } });
    } catch {
      showToast('Failed to delete contact. Please try again.');
    }
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-8">
        <p className="text-center text-sm text-gray-500">Loading…</p>
      </div>
    );
  }

  // If there is an error that is NOT a 404 (404 triggers the useEffect redirect),
  // show the error inline so users see it.
  if (error && !error.includes('404') && !error.toLowerCase().includes('not found')) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-8">
        <p className="text-sm text-red-600" role="alert">
          {error}
        </p>
      </div>
    );
  }

  // Contact not yet loaded (initial render before fetch resolves)
  if (!selectedContact) {
    return null;
  }

  const contact = selectedContact;
  const fullName = `${contact.firstName} ${contact.lastName}`;

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      {/* Toast banner */}
      {toast && (
        <div
          className="mb-4 rounded-md bg-blue-50 px-4 py-3 text-sm text-blue-800"
          role="status"
        >
          {toast}
        </div>
      )}

      {/* Page header */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate('/contacts')}
            className="text-sm text-blue-600 hover:underline focus:outline-none"
            aria-label="Back to contacts"
          >
            &larr; Back
          </button>
          <h1 className="text-2xl font-bold text-gray-900">{fullName}</h1>
        </div>

        {!isEditing && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsEditing(true)}
              className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              Edit
            </button>
            <button
              type="button"
              onClick={handleDeleteClick}
              className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500"
            >
              Delete
            </button>
          </div>
        )}
      </div>

      {/* Edit mode — render ContactForm with current contact values */}
      {isEditing ? (
        <ContactForm
          key={`${contact.id}-${contact.updatedAt}`}
          initialValues={{
            firstName: contact.firstName ?? '',
            lastName: contact.lastName ?? '',
            email: contact.email ?? '',
            phone: contact.phone ?? '',
            company: contact.company ?? '',
            notes: contact.notes ?? '',
          }}
          onSubmit={handleSave}
          onCancel={handleCancelEdit}
          isLoading={isLoading}
        />
      ) : (
        /* Read mode — render a definition list of all fields */
        <dl className="divide-y divide-gray-200 rounded-lg border border-gray-200 bg-white px-4">
          <DetailField label="First Name" value={contact.firstName} />
          <DetailField label="Last Name" value={contact.lastName} />
          <DetailField label="Email" value={contact.email} />
          <DetailField label="Phone" value={contact.phone} />
          <DetailField label="Company" value={contact.company} />
          <DetailField label="Notes" value={contact.notes} />
        </dl>
      )}

      {/* Delete confirmation dialog */}
      <ConfirmDialog
        isOpen={isConfirmOpen}
        message={`Are you sure you want to delete ${fullName}? This action cannot be undone.`}
        onConfirm={handleConfirmDelete}
        onCancel={handleCancelDelete}
      />
    </div>
  );
}

export default ContactDetailPage;
