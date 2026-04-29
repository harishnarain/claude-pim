/**
 * Root application component.
 * Provides the router context and mounts the top-level route tree alongside
 * the persistent Sidebar navigation.
 *
 * Routes:
 *   /contacts        → ContactsPage (list view)
 *   /contacts/new    → ContactDetailPage in create mode
 *   /contacts/:id    → ContactDetailPage for an existing contact
 */
import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Sidebar from './components/Sidebar.jsx';
import ContactsPage from './pages/ContactsPage.jsx';
import ContactDetailPage from './pages/ContactDetailPage.jsx';

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

            {/* Create new contact — must come before :id so "new" is not
                treated as a numeric id by ContactDetailPage */}
            <Route path="/contacts/new" element={<ContactDetailPage />} />

            {/* Contact detail / edit view */}
            <Route path="/contacts/:id" element={<ContactDetailPage />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}

export default App;
