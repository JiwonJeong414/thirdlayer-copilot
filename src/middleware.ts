// src/middleware.ts - Updated for session-based auth
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  // Skip middleware for non-API routes
  if (!request.nextUrl.pathname.startsWith('/api/')) {
    return NextResponse.next();
  }

  // Skip middleware for public auth endpoints
  if (
    request.nextUrl.pathname === '/api/auth/verify' ||
    request.nextUrl.pathname === '/api/auth/google/url' ||
    request.nextUrl.pathname === '/api/auth/status' ||
    request.nextUrl.pathname === '/api/auth/session' ||
    request.nextUrl.pathname === '/api/auth/signout' ||
    request.nextUrl.pathname.startsWith('/api/auth/callback/google') ||
    request.nextUrl.pathname === '/api/models' // Allow models endpoint without auth for initial load
  ) {
    return NextResponse.next();
  }

  try {
    // Check for session cookie instead of Bearer token
    const session = request.cookies.get('session');
    
    if (!session) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    let sessionData;
    try {
      sessionData = JSON.parse(session.value);
    } catch (parseError) {
      return NextResponse.json({ error: 'Invalid session format' }, { status: 401 });
    }

    if (!sessionData.userId || !sessionData.accessToken) {
      return NextResponse.json({ error: 'Invalid session data' }, { status: 401 });
    }

    // For now, we'll pass the userId in headers for API routes that need it
    // Later you can fetch full user data from database if needed
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set('x-user-id', sessionData.userId.toString());

    return NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    });
  } catch (error) {
    console.error('Auth middleware error:', error);
    return NextResponse.json({ error: 'Authentication failed' }, { status: 401 });
  }
}

export const config = {
  matcher: [
    '/api/:path*',
  ],
};