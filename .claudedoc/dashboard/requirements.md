# Dashboard — Requirements

## Problem Statement
The PIM currently opens to the Contacts list, giving the user no sense of what demands their attention right now. A developer at a tech firm opens their PIM first thing in the morning and needs to instantly see what is happening today, what tasks they have dropped, and what is coming up this week — without clicking into four separate modules. The Dashboard solves this by becoming the home screen: a single, scannable view that surfaces time-sensitive and high-priority information from all four modules on every app load.

## User Stories
- As a user, I want a welcoming home screen that greets me and shows today's date so that opening the app feels oriented and purposeful.
- As a user, I want to see today's calendar events and tasks due today in one place so that I know exactly what is on my plate without visiting two separate pages.
- As a user, I want a clear list of overdue tasks so that I can see at a glance what I have dropped and take action.
- As a user, I want to see upcoming calendar events for the next seven days so that I can anticipate what is coming without opening the calendar.
- As a user, I want to see tasks due in the next seven days so that I can plan my week without opening the task list.
- As a user, I want quick access to my pinned notes and tasks so that the items I have explicitly flagged as important are one click away from the home screen.
- As a user, I want every item on the dashboard to be clickable and navigate to its detail page so that I can act on anything I see without extra navigation steps.

## Acceptance Criteria

### Routing and navigation
- [ ] Navigating to `/` renders the Dashboard page (replaces any existing redirect to `/contacts`).
- [ ] The Sidebar contains a "Dashboard" navigation link at the top, above Contacts.
- [ ] The active Sidebar link is highlighted correctly when `/` is the current route.

### Welcome header
- [ ] The header displays a time-of-day greeting: "Good morning" (05:00–11:59), "Good afternoon" (12:00–16:59), "Good evening" (17:00–04:59).
- [ ] The header displays today's full date formatted as "Weekday, D Month YYYY" (e.g. "Thursday, 15 May 2026").
- [ ] No user name is shown (there is no auth/profile yet).

### Today's Agenda widget
- [ ] Displays calendar events whose `start_at` date (UTC) is today, in ascending time order.
- [ ] Displays tasks whose `due_date` is today and whose `status` is not `'Completed'` or `'Cancelled'`, sorted by priority descending (High → Medium → Low).
- [ ] Events and tasks are shown in separate labelled sub-sections ("Events today", "Tasks due today") within the same widget.
- [ ] If there are no events today, the events sub-section shows "No events today".
- [ ] If there are no tasks due today, the tasks sub-section shows "No tasks due today".
- [ ] Each event row shows: start time (HH:MM), title, and location (if set).
- [ ] Each task row shows: title, priority badge, and status badge.
- [ ] Clicking an event row navigates to `/calendar`.
- [ ] Clicking a task row navigates to `/tasks/:id`.
- [ ] Each event and task row is capped at 5 items; if more exist a "View all" link appears that navigates to the relevant module page.

### Overdue Tasks widget
- [ ] Displays tasks where `due_date` is before today (UTC) and `status` is not `'Completed'` or `'Cancelled'`.
- [ ] Sorted by `due_date` ascending (oldest first), then priority descending within the same date.
- [ ] Each row shows: title, relative due date (e.g. "3 days ago"), and priority badge.
- [ ] If there are no overdue tasks, shows the message "You're all caught up." and no rows.
- [ ] Capped at 5 rows; if more exist a "View all" link appears.
- [ ] Clicking a row navigates to `/tasks/:id`.

### Upcoming Events widget
- [ ] Displays calendar events whose `start_at` date (UTC) is between tomorrow and 7 days from today (inclusive), sorted ascending by `start_at`.
- [ ] Each row shows: a day label ("Tomorrow" or short weekday + date, e.g. "Fri 17"), start time (HH:MM), title, and location (if set).
- [ ] If there are no upcoming events, shows "No upcoming events."
- [ ] Capped at 5 rows; if more exist a "View calendar" link appears.
- [ ] Clicking a row navigates to `/calendar`.

### Upcoming Tasks widget
- [ ] Displays tasks where `due_date` is between tomorrow and 7 days from today (inclusive) and `status` is not `'Completed'` or `'Cancelled'`.
- [ ] Sorted by `due_date` ascending, then priority descending within the same date.
- [ ] Each row shows: title, relative due date label ("Tomorrow", "In 3 days", short weekday), and priority badge.
- [ ] If there are no upcoming tasks, shows "No upcoming tasks."
- [ ] Capped at 5 rows; if more exist a "View all tasks" link appears.
- [ ] Clicking a row navigates to `/tasks/:id`.

### Pinned Items widget
- [ ] Displays pinned notes (`is_pinned = 1`) and pinned tasks (`is_pinned = 1`) combined, sorted by `updated_at` descending.
- [ ] Each row shows: a type icon (reuse `TypeIcon`), the item title (first line of content for notes), and a module badge ("Note" or "Task").
- [ ] The widget is hidden entirely when there are no pinned items.
- [ ] Capped at 6 rows; if more exist a "View all" link appears (navigates to `/notes` or `/tasks` respectively, or just shows all 6 without a link if mixed).
- [ ] Clicking a note row navigates to `/notes/:id`.
- [ ] Clicking a task row navigates to `/tasks/:id`.

### Layout
- [ ] Widgets are arranged in a responsive two-column grid on viewports ≥ 1024 px wide, and a single column on narrower viewports.
- [ ] Column assignment: Left — Today's Agenda, Overdue Tasks. Right — Upcoming Events, Upcoming Tasks, Pinned Items.
- [ ] Each widget is a visually distinct card with a heading and consistent padding.
- [ ] The page uses the same `TopNavbar` and `Sidebar` layout as all other pages.

### Data freshness
- [ ] All widget data is fetched when the Dashboard page mounts (no stale cache from a previous visit).
- [ ] No real-time polling or websocket updates are required.

## Out of Scope
- User-specific greetings (no auth/profile in this phase).
- Drag-and-drop widget reordering or user-configurable widget visibility.
- Inline editing of tasks or events from the dashboard.
- Contacts widget (contacts are not time-sensitive in the same way).
- A dedicated `/dashboard` API endpoint — widgets query existing REST endpoints.
- Notifications or push alerts.
- Stats or charts (task counts by status, etc.) — pure data, not actionable.

## Open Questions
- None — all decisions confirmed.
