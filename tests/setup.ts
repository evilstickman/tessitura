import { afterAll, afterEach } from 'vitest';
import { cleanDatabase, disconnectTestDb, hasTestPrisma } from './helpers/db';

afterEach(async () => {
  if (hasTestPrisma()) {
    await cleanDatabase();
  }
});

afterAll(async () => {
  await disconnectTestDb();
});
