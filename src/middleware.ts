import { NextRequest, NextResponse } from 'next/server';

export async function middleware(request: NextRequest) {
  // Get the token from the Authorization header
  const token = request.headers.get('Authorization')?.split('Bearer ')[1];

  // Check for special token first
  if (token === process.env.SPECIAL_TOKEN) {
    return NextResponse.next();
  }

  // If no token is present, return 401
  if (!token) {
    return NextResponse.json(
      { message: 'Authentication required' },
      { status: 401 }
    );
  }

  try {
    // Verify the token with Firebase
    const response = await fetch(
      `https://identitytoolkit.googleapis.com/v1/tokens:verify?key=${process.env.NEXT_PUBLIC_FIREBASE_API_KEY}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ idToken: token }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error?.message || 'Invalid token');
    }

    // Add user info to headers
    const headers = new Headers(request.headers);
    headers.set('uid', data.localId);
    headers.set('email', data.email);

    return NextResponse.next({
      request: {
        headers,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { message: 'Invalid authentication token' },
      { status: 401 }
    );
  }
}

export const config = {
  matcher: [
    '/api/auth/:path*',
    '/api/chats/:path*',
    '/api/models/:path*',
    '/api/embed/:path*',
  ],
}; 