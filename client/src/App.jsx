/**
 * Root application component.
 * Provides the router context and mounts the top-level route tree alongside
 * the persistent Sidebar navigation and top navbar.
 *
 * Routes:
 *   /contacts              → ContactsPage (list view)
 *   /contacts/new          → ContactDetailPage in create mode
 *   /contacts/:id          → ContactDetailPage for an existing contact
 *   /notes                 → NotesPage (list view)
 *   /notes/new             → NoteEditorPage in create mode
 *   /notes/:id             → NoteEditorPage for an existing note
 *   /tasks                 → TasksPage (list view)
 *   /tasks/new             → TaskEditorPage in create mode
 *   /tasks/:id             → TaskEditorPage for an existing task
 *   /calendar              → CalendarPage (month view)
 *   /calendar/events/:id   → EventEditorPage for an existing or new event
 *   /search                → SearchPage (global search results)
 */
import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Sidebar from './components/Sidebar.jsx';
import TopNavbar from './components/TopNavbar.jsx';
import ContactsPage from './pages/ContactsPage.jsx';
import ContactDetailPage from './pages/ContactDetailPage.jsx';
import NotesPage from './pages/NotesPage.jsx';
import NoteEditorPage from './pages/NoteEditorPage.jsx';
import TasksPage from './pages/TasksPage.jsx';
import TaskEditorPage from './pages/TaskEditorPage.jsx';
import CalendarPage from './pages/CalendarPage.jsx';
import EventEditorPage from './pages/EventEditorPage.jsx';
import SearchPage from './pages/SearchPage.jsx';

/**
 * App — root component wrapping the entire PIM UI.
 * Renders a full-height column with TopNavbar at the top, then a row
 * containing the Sidebar and the main routed content area below it.
 *
 * @returns {JSX.Element} The application shell with navbar, sidebar, and routed content.
 */
function App() {
  return (
    <BrowserRouter>
      <div className="flex h-screen flex-col overflow-hidden bg-gray-50 text-gray-900">
        <TopNavbar />
        <div className="flex flex-1 overflow-hidden">
          <Sidebar />
          <main className="flex-1 overflow-y-auto">
            <Routes>
              {/* Redirect the root path to /contacts */}
              <Route path="/" element={<Navigate to="/contacts" replace />} />

              {/* Contacts list view */}
              <Route path="/contacts" element={<ContactsPage />} />

              {/* Contact detail / edit / create view.
                  When :id is 'new', ContactDetailPage renders in create mode. */}
              <Route path="/contacts/:id" element={<ContactDetailPage />} />

              {/* Notes list view */}
              <Route path="/notes" element={<NotesPage />} />

              {/* Note editor — create mode */}
              <Route path="/notes/new" element={<NoteEditorPage />} />

              {/* Note editor — edit mode */}
              <Route path="/notes/:id" element={<NoteEditorPage />} />

              {/* Tasks list view */}
              <Route path="/tasks" element={<TasksPage />} />

              {/* Task editor — create mode */}
              <Route path="/tasks/new" element={<TaskEditorPage />} />

              {/* Task editor — edit mode */}
              <Route path="/tasks/:id" element={<TaskEditorPage />} />

              {/* Calendar month view */}
              <Route path="/calendar" element={<CalendarPage />} />

              {/* Event editor — create or edit mode */}
              <Route path="/calendar/events/:id" element={<EventEditorPage />} />

              {/* Global search results */}
              <Route path="/search" element={<SearchPage />} />
            </Routes>
          </main>
        </div>
      </div>
    </BrowserRouter>
  );
}

export default App;
