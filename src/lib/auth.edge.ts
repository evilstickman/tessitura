/**
 * Edge-safe Auth.js config — used by middleware (Edge Runtime).
 * Does NOT import Prisma (not available in Edge Runtime).
 * Only contains providers and JWT/session callbacks.
 */
import Google from 'next-auth/providers/google';
import type { NextAuthConfig } from 'next-auth';

export const authConfig: NextAuthConfig = {
  providers: [Google],
  session: { strategy: 'jwt' },
  pages: { signIn: '/auth/signin' },
  callbacks: {
    jwt({ token, user }) {
      if (user?.id) token.sub = user.id;
      return token;
    },
    session({ session, token }) {
      if (token.sub && session.user) {
        session.user.id = token.sub;
      }
      return session;
    },
    authorized({ auth }) {
      return !!auth;
    },
  },
};
