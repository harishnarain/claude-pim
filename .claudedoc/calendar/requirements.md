# Calendar — Requirements

## Problem Statement

The user needs a unified calendar view that surfaces both scheduled appointments and task due dates in one place. Without this, there is no way to see how tasks and calendar commitments relate to each other in time, forcing the user to context-switch between separate tools. The Calendar module provides day, work-week, week, and month views that render both appointment events and tasks together — giving the user a complete picture of their day at a glance.

## User Stories

- As a user, I want to view my appointments and tasks together in a calendar grid so that I can understand my schedule and workload at the same time.
- As a user, I want to switch between day, work-week, week, and month views so that I can zoom in or out depending on what I am planning.
- As a user, I want to quickly create an appointment by clicking a time slot, so that capturing a commitment is as frictionless as possible.
- As a user, I want to expand the quick-create form into a full detail page so that I can fill in all appointment fields without losing what I have already typed.
- As a user, I want to assign a color to each appointment so that I can visually group and distinguish different kinds of events.
- As a user, I want tasks with a due date and time to appear at the correct slot in day/week views so that I can see tasks and appointments flowing together on my timeline.
- As a user, I want to delete an appointment directly from the calendar so that I do not have to navigate to a separate page for a simple action.
- As a user, I want to navigate forward and back through time and snap back to today so that I can plan ahead or review the past.
- As a user, I want overlapping appointments displayed side-by-side in day and week views so that no event is hidden behind another.

## Acceptance Criteria

### Views
- [ ] Four views are available: Day, Work Week (Mon–Fri), Week (7 days), Month grid.
- [ ] The calendar opens on the current day in whichever view was last active (default: Week).
- [ ] A "Today" button snaps navigation back to the current date in any view.
- [ ] Previous and next navigation buttons page by the current view's unit (day / week / month).
- [ ] The active view is highlighted and persisted to localStorage across page reloads.

### Appointments
- [ ] An appointment has: title (required), all-day toggle, start date + time, end date + time, description, location, and color (from a fixed palette of 8 colors).
- [ ] Clicking an empty time slot or day cell opens an inline quick-create form pre-filled with that date/time.
- [ ] The quick-create form has an "Expand" button that navigates to `/calendar/events/:id` (create-first, then navigate — same pattern as TaskEditorPage).
- [ ] The full detail/edit page is reachable from any appointment chip via a click.
- [ ] Appointments can be deleted from the calendar view via a delete action on the event chip; a confirmation dialog is shown before deletion.
- [ ] All-day appointments appear in a dedicated all-day banner row at the top of day/week columns.
- [ ] Overlapping timed appointments render side-by-side within the same time column (not stacked).
- [ ] Color is chosen from a fixed palette of 8 preset colors; the default color is blue.

### Tasks on the Calendar
- [ ] The Tasks module gains an optional **time** field (HH:MM) alongside the existing due date.
- [ ] Tasks with a due date appear on the calendar on their due date.
- [ ] Tasks that have both a due date and a time appear as a timed chip in the day/week timeline at that time slot.
- [ ] Tasks with only a due date (no time) appear in the all-day banner row of their due date.
- [ ] Task chips are visually distinct from appointment chips (e.g. a small checkbox icon, slightly different shape or border style) but use the same general sizing and layout.
- [ ] Clicking a task chip navigates to `/tasks/:id` (the task detail page); tasks cannot be edited directly from the calendar.

### Data loading
- [ ] The API fetches events by date-range window (start date, end date query params) rather than loading all events at once.
- [ ] As the user pages forward or back, the next window is fetched lazily (no pre-loading of the entire calendar).
- [ ] A loading indicator is shown while a window is being fetched.

### General
- [ ] The `/calendar` route is accessible from the sidebar with a calendar icon.
- [ ] The sidebar navigation link is highlighted when on any `/calendar` route.
- [ ] Empty time slots show a subtle hover state to indicate they are clickable.

## Tasks Module Changes

- [ ] Add an optional `time` column (`HH:MM` string, nullable) to the `tasks` table via a new migration.
- [ ] Expose `time` in the Tasks API (GET, POST, PATCH) and in the frontend store and form.
- [ ] Add a time input field to `TaskForm` (visible only when a due date is set).

## Out of Scope

- Recurring events (daily, weekly, monthly recurrence rules).
- Multiple calendars or calendar accounts.
- External calendar sync (iCal import/export, Google Calendar, Outlook).
- Attendees, invites, or RSVPs.
- Reminders or push notifications.
- Drag-and-drop rescheduling of events.
- Event search.
- Time zone selection (all times are local browser time).

## Open Questions

- [ ] **Week start day**: Should the week view begin on Sunday (US convention) or Monday (ISO / EU convention)? Recommend making it configurable in settings, defaulting to Sunday.
- [ ] **Task time field label**: Should the new field in the task editor be labelled "Time" or "Due Time"? Recommend "Due Time" for clarity.
- [ ] **Color palette**: Final 8-color set to confirm during design (suggested: Blue, Green, Red, Yellow, Purple, Pink, Orange, Grey).
- [ ] **Work week days**: Work Week view is Mon–Fri; should weekends be completely hidden or shown as narrow collapsed columns?
