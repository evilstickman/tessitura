// TODO(M1.8): Replace with real session auth (NextAuth.js).
// This is a placeholder that returns the dev seed user's ID.
// Every controller must call this function — no hardcoded user IDs elsewhere.
//
// Auth failure contract (intentional, not accidental):
//   - getCurrentUserId() throws AuthenticationError when no user can be resolved
//   - Controllers catch AuthenticationError and return 401
//   - This contract is permanent — M1.8 changes the mechanism, not the behavior

import { AuthenticationError } from '@/lib/errors';

let seedUserId: string | null = null;

/**
 * Resets the cached seed user ID. Used by test setup to prevent stale cache
 * after database cleanup between tests.
 */
export function resetAuthCache(): void {
  seedUserId = null;
}

/**
 * Returns the current user's ID.
 *
 * Pre-M1.8: Returns the dev seed user. Throws AuthenticationError if seed
 * user doesn't exist (deliberate 401, not accidental 500).
 *
 * Post-M1.8: Will resolve from session. Same AuthenticationError on failure.
 */
export async function getCurrentUserId(): Promise<string> {
  if (seedUserId) return seedUserId;

  // Lazy-load to avoid circular imports with db.ts
  const { prisma } = await import('@/lib/db');
  const user = await prisma.user.findFirst({
    where: { email: 'dev-placeholder@tessitura.local' },
  });

  if (!user) {
    throw new AuthenticationError(
      'Not authenticated. Dev seed user not found — run `npx prisma db seed` to create it.',
    );
  }

  seedUserId = user.id;
  return seedUserId;
}
