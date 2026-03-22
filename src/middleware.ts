import { auth } from '@/lib/auth.config';

export default auth((req) => {
  if (!req.auth && req.nextUrl.pathname !== '/auth/signin') {
    const signInUrl = new URL('/auth/signin', req.nextUrl.origin);
    return Response.redirect(signInUrl);
  }
});

export const config = {
  matcher: ['/((?!api/auth|_next/static|_next/image|favicon\\.ico|auth/).*)'],
};
