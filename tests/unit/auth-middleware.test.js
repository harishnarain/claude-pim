/**
 * Unit tests for the auth middleware stub.
 * Verifies that in local-only (passthrough) mode the middleware calls next()
 * without modifying the request or response.
 */

import { describe, it, expect, vi } from 'vitest';
import authenticate from '../../server/middleware/auth.js';

describe('authenticate middleware (passthrough mode)', () => {
  it('calls next() without arguments', () => {
    const req = {};
    const res = {};
    const next = vi.fn();

    authenticate(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(next).toHaveBeenCalledWith();
  });

  it('does not modify the request object', () => {
    const req = { originalProp: true };
    const res = {};
    const next = vi.fn();

    authenticate(req, res, next);

    expect(req).toEqual({ originalProp: true });
  });

  it('exports a default function', () => {
    expect(typeof authenticate).toBe('function');
  });
});
