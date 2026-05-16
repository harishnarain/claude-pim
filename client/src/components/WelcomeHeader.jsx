/**
 * WelcomeHeader — presentational component for the Dashboard page header.
 *
 * Displays a time-appropriate greeting (e.g. "Good morning") and today's
 * full date (e.g. "Thursday, 15 May 2026"). Both strings are derived from
 * pure utility functions so the component itself contains no date logic.
 *
 * @returns {JSX.Element}
 */
import React from 'react';
import { getGreeting, formatFullDate } from '../utils/dashboard-dates.js';

/**
 * WelcomeHeader renders the greeting heading and full date line for the
 * Dashboard. It accepts no props and derives all display strings at render time.
 *
 * @returns {JSX.Element}
 */
function WelcomeHeader() {
  const greeting = getGreeting();
  const fullDate = formatFullDate();

  return (
    <div className="mb-6">
      <h1 className="text-2xl font-semibold text-gray-900">{greeting}</h1>
      <p className="mt-1 text-sm text-gray-500">{fullDate}</p>
    </div>
  );
}

export default WelcomeHeader;
