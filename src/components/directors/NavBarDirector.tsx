'use client';

import { useSession, signOut } from 'next-auth/react';
import { NavBar } from '@/components/presentation/NavBar';

export function NavBarDirector() {
  const { data: session } = useSession();

  const handleSignOut = () => signOut({ callbackUrl: '/auth/signin' });

  // Don't render nav on sign-in page (no session)
  if (!session) return null;

  return <NavBar onSignOut={handleSignOut} />;
}
