/**
 * Root application component.
 * Provides the router context and mounts the top-level route tree alongside
 * the persistent Sidebar navigation.
 *
 * Routes:
 *   /contacts        → ContactsPage (list view)
 *   /contacts/new    → ContactDetailPage in create mode
 *   /contacts/:id    → ContactDetailPage for an existing contact
 *   /notes           → NotesPage (list view)
 *   /notes/new       → NoteEditorPage in create mode
 *   /notes/:id       → NoteEditorPage for an existing note
 */
import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Sidebar from './components/Sidebar.jsx';
import ContactsPage from './pages/ContactsPage.jsx';
import ContactDetailPage from './pages/ContactDetailPage.jsx';
import NotesPage from './pages/NotesPage.jsx';
import NoteEditorPage from './pages/NoteEditorPage.jsx';

/**
 * App — root component wrapping the entire PIM UI.
 * @returns {JSX.Element} The application shell with sidebar and routed content.
 */
function App() {
  return (
    <BrowserRouter>
      <div className="flex h-screen overflow-hidden bg-gray-50 text-gray-900">
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
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}

export default App;
