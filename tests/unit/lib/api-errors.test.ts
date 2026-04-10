import { describe, it, expect } from 'vitest';
import { AuthError, NotFoundError } from '@/lib/api-errors';

describe('AuthError', () => {
  it('extends Error with name "AuthError"', () => {
    const err = new AuthError();
    expect(err).toBeInstanceOf(Error);
    expect(err.name).toBe('AuthError');
  });

  it('has a default message', () => {
    expect(new AuthError().message).toBe('Authentication required');
  });

  it('is instanceof-checkable for error discrimination', () => {
    const err: unknown = new AuthError();
    expect(err instanceof AuthError).toBe(true);
    expect(err instanceof NotFoundError).toBe(false);
  });
});

describe('NotFoundError', () => {
  it('extends Error with name "NotFoundError"', () => {
    const err = new NotFoundError();
    expect(err).toBeInstanceOf(Error);
    expect(err.name).toBe('NotFoundError');
  });

  it('has a default message', () => {
    expect(new NotFoundError().message).toBe('Not found');
  });

  it('accepts a custom message', () => {
    expect(new NotFoundError('Grid not found').message).toBe('Grid not found');
  });

  it('is instanceof-checkable for error discrimination', () => {
    const err: unknown = new NotFoundError();
    expect(err instanceof NotFoundError).toBe(true);
    expect(err instanceof AuthError).toBe(false);
  });
});
