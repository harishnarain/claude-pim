/**
 * Unit tests for client/src/pages/EventEditorPage.jsx.
 *
 * The Zustand store and react-router-dom are fully mocked so tests run in
 * isolation without a real API or browser router.
 *
 * Covered scenarios:
 *   - On mount: calls fetchEvent with the route param id
 *   - Renders loading indicator when isLoading and no event available
 *   - Renders nothing (null) when event is null and not loading
 *   - Renders EventForm with event data
 *   - Auto-save debounce fires after 800 ms of inactivity
 *   - Auto-save is suppressed when title is empty
 *   - Blur flushes the debounce immediately (calls updateEvent synchronously)
 *   - Delete button opens ConfirmDialog; confirm calls deleteEvent and navigates to /calendar
 *   - Cancel in ConfirmDialog closes without deleting
 *   - 404 / not-found error redirects to /calendar with toast
 *   - hasLoaded + no selectedEvent redirects to /calendar with toast
 *   - Back button navigates to /calendar
 *   - document.title is set to the event title
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

/** Shared navigate mock. */
const mockNavigate = vi.fn();

/** Mutable params — set per test. */
let mockParams = { id: '7' };

vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
  useParams: () => mockParams,
}));

/** Mutable store state — reset in beforeEach. */
let storeState = {};

vi.mock('../../client/src/store/calendarStore.js', () => ({
  useCalendarStore: () => storeState,
}));

// ---------------------------------------------------------------------------
// Mock child components so tests stay focused on EventEditorPage logic.
// ---------------------------------------------------------------------------

vi.mock('../../client/src/components/EventForm.jsx', () => ({
  default: ({ event, onChange, onBlur, errors }) => (
    <div data-testid="event-form">
      <input
        aria-label="Event title"
        value={event?.title ?? ''}
        onChange={(e) => onChange({ title: e.target.value })}
        onBlur={onBlur}
      />
      <input
        aria-label="Event location"
        value={event?.location ?? ''}
        onChange={(e) => onChange({ location: e.target.value })}
        onBlur={onBlur}
      />
      {errors && errors._validation && (
        <span data-testid="validation-error">Validation error</span>
      )}
    </div>
  ),
}));

// ConfirmDialog is used as-is so we can test open/close behaviour.

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

/** A populated event fixture. */
const EVENT = {
  id: 7,
  title: 'Team standup',
  description: 'Daily sync',
  location: 'Zoom',
  color: 'blue',
  allDay: false,
  startAt: '2026-05-10T09:00',
  endAt: '2026-05-10T09:30',
  createdAt: '2026-05-01T10:00:00Z',
  updatedAt: '2026-05-01T10:00:00Z',
};

/**
 * Build a default store state, merging in overrides.
 * @param {object} [overrides]
 * @returns {object}
 */
function buildStore(overrides = {}) {
  return {
    selectedEvent: EVENT,
    isLoading: false,
    isSaving: false,
    saveStatus: 'idle',
    error: null,
    fetchEvent: vi.fn().mockResolvedValue(undefined),
    updateEvent: vi.fn().mockResolvedValue({ ...EVENT }),
    deleteEvent: vi.fn().mockResolvedValue(undefined),
    setSelectedEvent: vi.fn(),
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Import the component under test (after mocks are set up)
// ---------------------------------------------------------------------------

import EventEditorPage from '../../client/src/pages/EventEditorPage.jsx';

// ---------------------------------------------------------------------------
// Test suites
// ---------------------------------------------------------------------------

describe('EventEditorPage — mount and data loading', () => {
  beforeEach(() => {
    storeState = buildStore();
    mockParams = { id: '7' };
    mockNavigate.mockClear();
  });

  it('calls fetchEvent with the route param id on mount', async () => {
    render(<EventEditorPage />);

    await waitFor(() => {
      expect(storeState.fetchEvent).toHaveBeenCalledWith('7');
    });
  });

  it('shows a loading indicator when isLoading is true and event is not yet available', () => {
    storeState = buildStore({ selectedEvent: null, isLoading: true });
    render(<EventEditorPage />);
    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  it('renders nothing (no form) when event is null and not loading', () => {
    storeState = buildStore({ selectedEvent: null, isLoading: false, error: null });
    render(<EventEditorPage />);
    expect(screen.queryByTestId('event-form')).not.toBeInTheDocument();
  });

  it('renders the EventForm with event data', async () => {
    render(<EventEditorPage />);
    await waitFor(() => {
      expect(screen.getByTestId('event-form')).toBeInTheDocument();
    });
    expect(screen.getByRole('textbox', { name: /event title/i })).toHaveValue('Team standup');
  });
});

describe('EventEditorPage — document.title', () => {
  beforeEach(() => {
    storeState = buildStore();
    mockParams = { id: '7' };
    mockNavigate.mockClear();
  });

  it('sets document.title to the event title', async () => {
    render(<EventEditorPage />);
    await waitFor(() => {
      expect(document.title).toBe('Team standup');
    });
  });
});

describe('EventEditorPage — toolbar', () => {
  beforeEach(() => {
    storeState = buildStore();
    mockParams = { id: '7' };
    mockNavigate.mockClear();
  });

  it('renders a back button', () => {
    render(<EventEditorPage />);
    expect(screen.getByRole('button', { name: /back to calendar/i })).toBeInTheDocument();
  });

  it('back button navigates to /calendar', async () => {
    render(<EventEditorPage />);
    await userEvent.click(screen.getByRole('button', { name: /back to calendar/i }));
    expect(mockNavigate).toHaveBeenCalledWith('/calendar');
  });

  it('renders a delete button', () => {
    render(<EventEditorPage />);
    expect(screen.getByRole('button', { name: /^delete$/i })).toBeInTheDocument();
  });

  it('shows Saving... badge when saveStatus is "saving"', () => {
    storeState = buildStore({ saveStatus: 'saving' });
    render(<EventEditorPage />);
    expect(screen.getByText('Saving...')).toBeInTheDocument();
  });

  it('shows Saved badge when saveStatus is "saved"', () => {
    storeState = buildStore({ saveStatus: 'saved' });
    render(<EventEditorPage />);
    expect(screen.getByText('Saved')).toBeInTheDocument();
  });

  it('shows Save failed badge when saveStatus is "error"', () => {
    storeState = buildStore({ saveStatus: 'error', error: 'API error 500: INTERNAL' });
    render(<EventEditorPage />);
    expect(screen.getByText('Save failed')).toBeInTheDocument();
  });
});

describe('EventEditorPage — auto-save debounce', () => {
  beforeEach(() => {
    storeState = buildStore();
    mockParams = { id: '7' };
    mockNavigate.mockClear();
    vi.useFakeTimers({ shouldAdvanceTime: false });
  });

  afterEach(() => {
    vi.runAllTimers();
    vi.useRealTimers();
  });

  it('does NOT call updateEvent immediately on field change', () => {
    render(<EventEditorPage />);
    const titleInput = screen.getByRole('textbox', { name: /event title/i });

    fireEvent.change(titleInput, { target: { value: 'New title' } });

    expect(storeState.updateEvent).not.toHaveBeenCalled();
  });

  it('calls updateEvent with merged localEvent after 800 ms debounce', () => {
    render(<EventEditorPage />);
    const titleInput = screen.getByRole('textbox', { name: /event title/i });

    fireEvent.change(titleInput, { target: { value: 'Debounced title' } });

    act(() => { vi.advanceTimersByTime(799); });
    expect(storeState.updateEvent).not.toHaveBeenCalled();

    act(() => { vi.advanceTimersByTime(1); });

    expect(storeState.updateEvent).toHaveBeenCalledWith(
      7,
      expect.objectContaining({ title: 'Debounced title' })
    );
  });

  it('resets the debounce timer on each change (only fires once)', () => {
    render(<EventEditorPage />);
    const titleInput = screen.getByRole('textbox', { name: /event title/i });

    fireEvent.change(titleInput, { target: { value: 'First' } });
    act(() => { vi.advanceTimersByTime(400); });
    fireEvent.change(titleInput, { target: { value: 'Second' } });
    act(() => { vi.advanceTimersByTime(400); });
    fireEvent.change(titleInput, { target: { value: 'Third' } });
    act(() => { vi.advanceTimersByTime(800); });

    expect(storeState.updateEvent).toHaveBeenCalledTimes(1);
    expect(storeState.updateEvent).toHaveBeenCalledWith(
      7,
      expect.objectContaining({ title: 'Third' })
    );
  });

  it('suppresses auto-save when title is empty', () => {
    render(<EventEditorPage />);
    const titleInput = screen.getByRole('textbox', { name: /event title/i });

    fireEvent.change(titleInput, { target: { value: '' } });
    act(() => { vi.advanceTimersByTime(1000); });

    expect(storeState.updateEvent).not.toHaveBeenCalled();
  });

  it('suppresses auto-save when title is whitespace-only', () => {
    render(<EventEditorPage />);
    const titleInput = screen.getByRole('textbox', { name: /event title/i });

    fireEvent.change(titleInput, { target: { value: '   ' } });
    act(() => { vi.advanceTimersByTime(1000); });

    expect(storeState.updateEvent).not.toHaveBeenCalled();
  });
});

describe('EventEditorPage — blur flush', () => {
  beforeEach(() => {
    storeState = buildStore();
    mockParams = { id: '7' };
    mockNavigate.mockClear();
    vi.useFakeTimers({ shouldAdvanceTime: false });
  });

  afterEach(() => {
    vi.runAllTimers();
    vi.useRealTimers();
  });

  it('calls updateEvent immediately on blur when there are unsaved changes', () => {
    render(<EventEditorPage />);
    const titleInput = screen.getByRole('textbox', { name: /event title/i });

    fireEvent.change(titleInput, { target: { value: 'Unsaved title' } });

    act(() => { vi.advanceTimersByTime(400); });
    expect(storeState.updateEvent).not.toHaveBeenCalled();

    fireEvent.blur(titleInput);

    expect(storeState.updateEvent).toHaveBeenCalledWith(
      7,
      expect.objectContaining({ title: 'Unsaved title' })
    );
  });

  it('does NOT call updateEvent on blur when title is empty', () => {
    render(<EventEditorPage />);
    const titleInput = screen.getByRole('textbox', { name: /event title/i });

    fireEvent.change(titleInput, { target: { value: '' } });

    act(() => { vi.advanceTimersByTime(400); });
    fireEvent.blur(titleInput);

    expect(storeState.updateEvent).not.toHaveBeenCalled();
  });
});

describe('EventEditorPage — delete flow', () => {
  beforeEach(() => {
    storeState = buildStore();
    mockParams = { id: '7' };
    mockNavigate.mockClear();
  });

  it('shows the ConfirmDialog when Delete is clicked', async () => {
    render(<EventEditorPage />);
    await userEvent.click(screen.getByRole('button', { name: /^delete$/i }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('hides the ConfirmDialog when Cancel is clicked', async () => {
    render(<EventEditorPage />);
    await userEvent.click(screen.getByRole('button', { name: /^delete$/i }));
    await userEvent.click(screen.getByRole('button', { name: /^cancel$/i }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('calls deleteEvent and navigates to /calendar on confirm', async () => {
    render(<EventEditorPage />);
    await userEvent.click(screen.getByRole('button', { name: /^delete$/i }));
    await userEvent.click(screen.getByRole('button', { name: /^confirm$/i }));

    await waitFor(() => {
      expect(storeState.deleteEvent).toHaveBeenCalledWith(7);
    });

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/calendar');
    });
  });
});

describe('EventEditorPage — 404 redirect', () => {
  beforeEach(() => {
    mockParams = { id: '7' };
    mockNavigate.mockClear();
  });

  it('redirects to /calendar with toast when error contains "not found"', async () => {
    storeState = buildStore({
      selectedEvent: null,
      error: 'Event not found',
    });
    render(<EventEditorPage />);

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/calendar', {
        state: { toast: 'Event not found.' },
      });
    });
  });

  it('redirects to /calendar with toast when error contains "404"', async () => {
    storeState = buildStore({
      selectedEvent: null,
      error: '404: resource not found',
    });
    render(<EventEditorPage />);

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/calendar', {
        state: { toast: 'Event not found.' },
      });
    });
  });
});

describe('EventEditorPage — validation errors', () => {
  beforeEach(() => {
    storeState = buildStore();
    mockParams = { id: '7' };
    mockNavigate.mockClear();
  });

  it('shows validation error indicator when saveStatus is error with VALIDATION_ERROR', async () => {
    storeState = buildStore({
      saveStatus: 'error',
      error: 'API error 422: VALIDATION_ERROR',
    });
    render(<EventEditorPage />);

    await waitFor(() => {
      expect(screen.getByTestId('validation-error')).toBeInTheDocument();
    });
  });

  it('clears field errors when saveStatus transitions to "saved"', async () => {
    storeState = buildStore({
      saveStatus: 'error',
      error: 'API error 422: VALIDATION_ERROR',
    });
    const { rerender } = render(<EventEditorPage />);

    await waitFor(() => {
      expect(screen.getByTestId('validation-error')).toBeInTheDocument();
    });

    // Transition to saved
    storeState = buildStore({ saveStatus: 'saved', error: null });
    rerender(<EventEditorPage />);

    await waitFor(() => {
      expect(screen.queryByTestId('validation-error')).not.toBeInTheDocument();
    });
  });
});
