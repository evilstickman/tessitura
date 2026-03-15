import { describe, it, expect, afterEach } from 'vitest';
import { getCurrentUserId, resetAuthCache } from '@/lib/auth';

describe('getCurrentUserId', () => {
  afterEach(() => {
    resetAuthCache();
  });

  it('throws when seed user does not exist', async () => {
    // The test database is cleaned between tests by setup.ts,
    // so if we call getCurrentUserId without creating the seed user, it should throw.
    // But the import of @/lib/db initializes the Prisma client which tries to connect.
    // We're in a unit test context — the test DB is available but empty after cleanup.
    await expect(getCurrentUserId()).rejects.toThrow('Dev seed user not found');
  });
});
