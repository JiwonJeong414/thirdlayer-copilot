// Next.js middleware for handling API route authentication
// This middleware intercepts API requests to enforce authentication
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  // Only apply middleware to API routes
  if (!request.nextUrl.pathname.startsWith('/api/')) {
    return NextResponse.next();
  }

  // List of public endpoints that don't require authentication
  // These include auth-related endpoints and the models endpoint
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
    // Verify authentication by checking for session cookie
    const session = request.cookies.get('session');
    
    if (!session) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // Parse session data from cookie
    let sessionData;
    try {
      sessionData = JSON.parse(session.value);
    } catch (parseError) {
      return NextResponse.json({ error: 'Invalid session format' }, { status: 401 });
    }

    // Validate required session data
    if (!sessionData.userId || !sessionData.accessToken) {
      return NextResponse.json({ error: 'Invalid session data' }, { status: 401 });
    }

    // Add user ID to request headers for downstream API routes
    // This allows API routes to identify the authenticated user
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set('x-user-id', sessionData.userId.toString());

    // Continue the request with modified headers
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

// Configure middleware to run only on API routes
export const config = {
  matcher: [
    '/api/:path*',
  ],
};