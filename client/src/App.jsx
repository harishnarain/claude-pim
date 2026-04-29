/**
 * Root application component.
 * Provides the router context; routes are added in later tasks.
 */
import React from 'react';
import { BrowserRouter } from 'react-router-dom';

/**
 * App — root component wrapping the entire PIM UI.
 * @returns {JSX.Element} The application shell.
 */
function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-gray-50 text-gray-900">
        <h1 className="p-4 text-2xl font-bold">PIM</h1>
        {/* Routes will be added in Task 10 */}
      </div>
    </BrowserRouter>
  );
}

export default App;
