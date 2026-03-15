// TODO(M1.8): Replace with real session auth.
// This is a placeholder that returns the dev seed user's ID.
// Every controller must call this function — no hardcoded user IDs elsewhere.

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
 * Before M1.8 (auth), this returns the dev seed user.
 */
export async function getCurrentUserId(): Promise<string> {
  if (seedUserId) return seedUserId;

  // Lazy-load to avoid circular imports with db.ts
  const { prisma } = await import('@/lib/db');
  const user = await prisma.user.findFirst({
    where: { email: 'dev-placeholder@tessitura.local' },
  });

  if (!user) {
    throw new Error(
      'Dev seed user not found. Run `npx prisma db seed` to create it.',
    );
  }

  seedUserId = user.id;
  return seedUserId;
}
