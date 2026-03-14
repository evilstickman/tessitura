import { afterEach, afterAll } from 'vitest';
import { cleanDatabase, disconnectTestDb } from './helpers/db';

afterEach(async () => {
  await cleanDatabase();
});

afterAll(async () => {
  await disconnectTestDb();
});
