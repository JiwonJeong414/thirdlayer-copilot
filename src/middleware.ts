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
    request.nextUrl.pathname.startsWith('/api/auth/callback/google')
  ) {
    return NextResponse.next();
  }

  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const token = authHeader.split('Bearer ')[1];
    
    // Verify token using our API route
    const verifyResponse = await fetch(`${request.nextUrl.origin}/api/auth/verify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ token }),
    });

    if (!verifyResponse.ok) {
      return NextResponse.json({ error: 'Invalid authentication token' }, { status: 401 });
    }

    const { uid, email } = await verifyResponse.json();
    
    // Create new headers with user info
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set('uid', uid);
    requestHeaders.set('email', email || '');

    // Return response with modified headers
    return NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    });
  } catch (error) {
    console.error('Auth middleware error:', error);
    return NextResponse.json({ error: 'Invalid authentication token' }, { status: 401 });
  }
}

export const config = {
  matcher: [
    '/api/:path*',
  ],
}; 