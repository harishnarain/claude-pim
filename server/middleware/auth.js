/**
 * Authentication middleware for the PIM server.
 *
 * Currently operates in passthrough mode for local-only use.
 * When JWT auth is enabled in a future phase, this middleware will:
 *   1. Read the `Authorization: Bearer <token>` header.
 *   2. Verify the token against the configured JWT secret.
 *   3. Attach the decoded payload to `req.user`.
 *   4. Call `next(err)` with a 401 error if the token is missing or invalid.
 *
 * @module middleware/auth
 */

/**
 * Express middleware that authenticates the incoming request.
 *
 * In local-only mode this is a passthrough — all requests are allowed through
 * without credential verification. Wire up JWT validation here when auth is
 * enabled.
 *
 * @param {import('express').Request}  req  - Express request object.
 * @param {import('express').Response} res  - Express response object.
 * @param {import('express').NextFunction} next - Express next function.
 * @returns {void}
 */
function authenticate(req, res, next) {
  // TODO: validate JWT token from Authorization header when auth is enabled.
  next();
}

export default authenticate;
