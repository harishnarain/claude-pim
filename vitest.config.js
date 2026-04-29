/**
 * Vitest configuration for the PIM monorepo.
 * Supports both Node.js tests (.test.js) and jsdom-based React component
 * tests (.test.jsx). JSX is transformed by the React Vite plugin.
 */
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      react: '/Users/harish/repos/claude-pim/node_modules/react',
      'react-dom': '/Users/harish/repos/claude-pim/node_modules/react-dom',
      'react-router-dom': '/Users/harish/repos/claude-pim/client/node_modules/react-router-dom',
      'react-router': '/Users/harish/repos/claude-pim/client/node_modules/react-router',
    },
  },
  test: {
    include: [
      'tests/unit/**/*.test.js',
      'tests/unit/**/*.test.jsx',
    ],
    environmentMatchGlobs: [
      ['tests/unit/**/*.test.jsx', 'jsdom'],
    ],
    environment: 'node',
    globals: true,
    setupFiles: [],
  },
});
