/**
 * Full Auth.js config — used by route handler and auth() helper (Node.js runtime).
 * Imports Prisma adapter for user/account persistence.
 * Extends the edge-safe config with the adapter.
 */
import NextAuth from 'next-auth';
import { PrismaAdapter } from '@auth/prisma-adapter';
import { prisma } from '@/lib/db';
import { authConfig } from '@/lib/auth.edge';

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  adapter: PrismaAdapter(prisma),
});
