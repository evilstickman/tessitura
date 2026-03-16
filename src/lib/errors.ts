export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

/**
 * Thrown when user authentication/identification fails.
 *
 * TEMPORARY (pre-M1.8): Currently thrown by the dev-seed-user placeholder
 * when the seed user doesn't exist. Controllers catch this and return 401.
 *
 * POST-M1.8: Will be thrown by real session auth when no valid session exists.
 * The 401 contract is intentional and permanent — only the auth mechanism changes.
 */
export class AuthenticationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AuthenticationError';
  }
}
