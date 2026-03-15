import { afterAll, afterEach } from 'vitest';
import { cleanDatabase, disconnectTestDb, hasTestPrisma } from './helpers/db';
import { resetAuthCache } from '@/lib/auth';

afterEach(async () => {
  resetAuthCache();
  if (hasTestPrisma()) {
    await cleanDatabase();
  }
});

afterAll(async () => {
  await disconnectTestDb();
});
