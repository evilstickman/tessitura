/**
 * Client-side error classes thrown by director fetch functions.
 *
 * These exist so directors can use `error instanceof AuthError` / `instanceof NotFoundError`
 * checks to render specific UI states. They are not serialized over the wire — controllers
 * throw server-side errors from `@/lib/errors` (ValidationError, AuthenticationError,
 * ConflictError), which are converted to HTTP status codes by the controller layer.
 */

export class AuthError extends Error {
  constructor() {
    super('Authentication required');
    this.name = 'AuthError';
  }
}

export class NotFoundError extends Error {
  constructor(message = 'Not found') {
    super(message);
    this.name = 'NotFoundError';
  }
}
