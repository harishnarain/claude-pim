/**
 * Vitest global setup file.
 * Extends Vitest's expect with @testing-library/jest-dom matchers
 * so that assertions like toBeInTheDocument() are available in JSX tests.
 */
import '@testing-library/jest-dom';
