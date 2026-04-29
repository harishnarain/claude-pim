/**
 * Minimal logger utility for the PIM server.
 * Wraps console methods so they can be swapped out or silenced uniformly.
 * @module logger
 */

const LEVELS = { info: 'INFO', warn: 'WARN', error: 'ERROR' };

/**
 * Format a log message with an ISO timestamp and level prefix.
 * @param {string} level - Log level label.
 * @param {string} message - Human-readable message.
 * @returns {string} Formatted log line.
 */
function format(level, message) {
  return `[${new Date().toISOString()}] [${level}] ${message}`;
}

const logger = {
  /**
   * Log an informational message.
   * @param {string} message - Message to log.
   */
  info(message) {
    process.stdout.write(format(LEVELS.info, message) + '\n');
  },

  /**
   * Log a warning message.
   * @param {string} message - Message to log.
   */
  warn(message) {
    process.stderr.write(format(LEVELS.warn, message) + '\n');
  },

  /**
   * Log an error message.
   * @param {string} message - Message to log.
   * @param {Error} [err] - Optional Error object for stack trace.
   */
  error(message, err) {
    process.stderr.write(format(LEVELS.error, message) + '\n');
    if (err && err.stack) {
      process.stderr.write(err.stack + '\n');
    }
  },
};

export default logger;
