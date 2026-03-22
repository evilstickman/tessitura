import { AuthenticationError } from '@/lib/errors';

let seedUserId: string | null = null;

export function resetAuthCache(): void {
  seedUserId = null;
}

export async function getCurrentUserId(): Promise<string> {
  if (process.env.AUTH_SECRET) {
    const { auth } = await import('@/lib/auth.config');
    const session = await auth();
    if (!session?.user?.id) {
      throw new AuthenticationError('Not authenticated');
    }
    return session.user.id;
  }

  if (seedUserId) return seedUserId;
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
