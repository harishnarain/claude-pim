/**
 * TaskEditorPage — create / edit page for a single task.
 *
 * Create mode (`/tasks/new`):
 *   Creates a blank task immediately on mount, then replaces the URL with
 *   `/tasks/<id>` so the browser back button skips `/tasks/new`.
 *
 * Edit mode (`/tasks/:id`):
 *   Fetches the task and available task tags on mount. If the task is not found
 *   (404 or null selectedTask after loading), redirects to `/tasks` with a
 *   toast in router state.
 *
 * @returns {JSX.Element}
 */

import React, { useEffect, useState, useRef } from 'react';
import { useNavigate, useParams, useMatch } from 'react-router-dom';
import { useTasksStore } from '../store/tasksStore.js';
import TaskToolbar from '../components/TaskToolbar.jsx';
import TaskForm from '../components/TaskForm.jsx';
import TagCombobox from '../components/TagCombobox.jsx';
import ConfirmDialog from '../components/ConfirmDialog.jsx';

/** Auto-save debounce delay in milliseconds. */
const DEBOUNCE_MS = 800;

/**
 * TaskEditorPage — create/edit page for a single task.
 * @returns {JSX.Element}
 */
function TaskEditorPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const {
    selectedTask,
    taskTags,
    isLoading,
    isSaving,
    saveStatus,
    error,
    fetchTask,
    fetchTaskTags,
    createTask,
    updateTask,
    deleteTask,
    setSelectedTask,
  } = useTasksStore();

  /** True while we are creating the initial blank task in create mode. */
  const [isCreating, setIsCreating] = useState(false);

  /** Whether the delete ConfirmDialog is open. */
  const [showConfirm, setShowConfirm] = useState(false);

  /** True once the selectedTask has been loaded so we can show a 404 redirect. */
  const [hasLoaded, setHasLoaded] = useState(false);

  /**
   * Local task state — a camelCase copy of the task being edited.
   * Updated on every TaskForm onChange; persisted to the server via debounce.
   * @type {[object|null, Function]}
   */
  const [localTask, setLocalTask] = useState(null);

  /** Ref for the debounce timer handle. */
  const debounceTimerRef = useRef(null);

  /** Ref tracking whether there are unsaved changes to flush. */
  const hasUnsavedRef = useRef(false);

  const isCreateMode = !!useMatch('/tasks/new') || id === 'new';

  // Sync localTask when selectedTask changes (e.g. after initial load or navigating to a new task).
  // Guard: skip if the user has already started editing to avoid overwriting in-flight changes.
  useEffect(() => {
    if (selectedTask && !hasUnsavedRef.current) {
      setLocalTask({ ...selectedTask });
    }
  }, [selectedTask?.id]);

  // ---------------------------------------------------------------------------
  // Create mode — create a blank task and redirect to its URL.
  // ---------------------------------------------------------------------------

  useEffect(() => {
    if (!isCreateMode) return;

    let cancelled = false;

    /**
     * Create a blank task and redirect to the edit URL.
     * @returns {Promise<void>}
     */
    async function initCreate() {
      setIsCreating(true);
      try {
        const created = await createTask({
          title: 'New Task',
          priority: 'Low',
          status: 'Not Started',
          isPinned: false,
          tags: [],
        });
        if (!cancelled) {
          setIsCreating(false);
          navigate(`/tasks/${created.id}`, { replace: true });
        } else {
          deleteTask(created.id);
        }
      } catch {
        if (!cancelled) {
          setIsCreating(false);
          navigate('/tasks');
        }
      }
    }

    initCreate();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---------------------------------------------------------------------------
  // Edit mode — fetch task and tags on mount.
  // ---------------------------------------------------------------------------

  useEffect(() => {
    if (isCreateMode) return;

    /**
     * Load the task and all available task tags.
     * @returns {Promise<void>}
     */
    async function load() {
      await fetchTask(id);
      await fetchTaskTags();
      setHasLoaded(true);
    }

    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // ---------------------------------------------------------------------------
  // 404 redirect — when the task is not found after loading completes.
  // ---------------------------------------------------------------------------

  useEffect(() => {
    if (hasLoaded && !isCreateMode && !isLoading && !selectedTask) {
      navigate('/tasks', { state: { toast: 'Task not found.' } });
    }
  }, [hasLoaded, isLoading, selectedTask, isCreateMode, navigate]);

  useEffect(() => {
    if (!isCreateMode && error && (error.includes('404') || error.toLowerCase().includes('not found'))) {
      navigate('/tasks', { state: { toast: 'Task not found.' } });
    }
  }, [error, isCreateMode, navigate]);

  // ---------------------------------------------------------------------------
  // Handlers
  // ---------------------------------------------------------------------------

  /**
   * Flush the debounce immediately — call updateTask with current localTask.
   * Used on blur events to persist in-flight edits.
   * @returns {void}
   */
  function flushSave() {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }
    if (hasUnsavedRef.current && localTask && localTask.title && localTask.title.trim() !== '') {
      hasUnsavedRef.current = false;
      updateTask(Number(id), localTask);
    }
  }

  /**
   * Handle a TaskForm field change — merge the changed field into localTask and
   * schedule a debounced save after 800 ms of inactivity.
   *
   * Auto-save is suppressed if the title is empty or whitespace-only.
   *
   * @param {object} changed - An object with a single changed camelCase field, e.g. `{ title: 'New' }`.
   * @returns {void}
   */
  function handleFormChange(changed) {
    const updated = { ...localTask, ...changed };
    setLocalTask(updated);
    hasUnsavedRef.current = true;

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // Suppress auto-save when title is empty.
    if (!updated.title || updated.title.trim() === '') return;

    debounceTimerRef.current = setTimeout(() => {
      debounceTimerRef.current = null;
      if (hasUnsavedRef.current) {
        hasUnsavedRef.current = false;
        updateTask(Number(id), updated);
      }
    }, DEBOUNCE_MS);
  }

  /**
   * Handle blur on any TaskForm field — flush the debounce immediately.
   * @returns {void}
   */
  function handleFormBlur() {
    flushSave();
  }

  /**
   * Toggle the pin state of the current task immediately (no debounce).
   * Also calls setSelectedTask to update the UI optimistically.
   * @returns {void}
   */
  function handleTogglePin() {
    if (!selectedTask) return;
    const newPinned = !selectedTask.isPinned;
    setSelectedTask({ ...selectedTask, isPinned: newPinned });
    updateTask(Number(id), { isPinned: newPinned });
  }

  /**
   * Handle tag list changes — save immediately, then refresh available task tags.
   * @param {Array<string|{id:number,name:string}>} newTags
   * @returns {Promise<void>}
   */
  async function handleTagsChange(newTags) {
    await updateTask(Number(id), { tags: newTags });
    await fetchTaskTags();
  }

  /**
   * Confirm deletion — delete the task and navigate to the list.
   * @returns {Promise<void>}
   */
  async function handleConfirmDelete() {
    setShowConfirm(false);
    await deleteTask(Number(id));
    navigate('/tasks');
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  if (isCreateMode || isCreating) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-sm text-gray-500">Creating task…</p>
      </div>
    );
  }

  if (isLoading && !selectedTask) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-sm text-gray-500">Loading…</p>
      </div>
    );
  }

  if (!selectedTask) return null;

  const isPinned = selectedTask.isPinned ?? false;
  const selectedTags = selectedTask.tags ?? [];

  return (
    <div className="flex h-full flex-col">
      <TaskToolbar
        isPinned={isPinned}
        onTogglePin={handleTogglePin}
        onDelete={() => setShowConfirm(true)}
        isSaving={isSaving}
        saveStatus={saveStatus}
      />

      <div className="flex flex-1 flex-col overflow-auto p-4">
        <div onBlur={handleFormBlur}>
          <TaskForm
            task={localTask ?? selectedTask}
            onChange={handleFormChange}
            onBlur={handleFormBlur}
          />
        </div>

        <div className="mt-4 border-t border-gray-200 pt-4">
          <TagCombobox
            selected={selectedTags}
            available={taskTags}
            onChange={handleTagsChange}
          />
        </div>
      </div>

      <ConfirmDialog
        isOpen={showConfirm}
        message="Are you sure you want to delete this task? This action cannot be undone."
        onConfirm={handleConfirmDelete}
        onCancel={() => setShowConfirm(false)}
      />
    </div>
  );
}

export default TaskEditorPage;
