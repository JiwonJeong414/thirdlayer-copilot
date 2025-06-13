import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/firebase-admin';

export async function POST(request: Request) {
  try {
    const { token } = await request.json();
    
    if (!token) {
      console.error('No token provided');
      return NextResponse.json({ error: 'Token is required' }, { status: 400 });
    }

    console.log('Verifying token...');
    const decodedToken = await auth.verifyIdToken(token);
    console.log('Token verified successfully:', {
      uid: decodedToken.uid,
      email: decodedToken.email,
    });
    
    return NextResponse.json({
      uid: decodedToken.uid,
      email: decodedToken.email,
    });
  } catch (error: any) {
    console.error('Token verification error:', {
      name: error.name,
      message: error.message,
      code: error.code,
      stack: error.stack,
    });
    
    // Return more specific error messages
    if (error.code === 'auth/id-token-expired') {
      return NextResponse.json({ error: 'Token has expired' }, { status: 401 });
    }
    if (error.code === 'auth/invalid-id-token') {
      return NextResponse.json({ error: 'Invalid token format' }, { status: 401 });
    }
    if (error.code === 'auth/argument-error') {
      return NextResponse.json({ error: 'Invalid token argument' }, { status: 401 });
    }
    
    return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
  }
} 