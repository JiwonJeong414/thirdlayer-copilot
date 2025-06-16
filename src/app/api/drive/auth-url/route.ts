import { NextRequest, NextResponse } from 'next/server';
import { DriveService } from '@/lib/DriveService';
import crypto from 'crypto';

export async function GET(request: NextRequest) {
  try {
    // Check if user is authenticated
    const session = request.cookies.get('session');
    if (!session) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // Generate state parameter for Drive OAuth
    const state = crypto.randomBytes(32).toString('hex');
    
    // Get Drive-specific OAuth URL
    const driveService = DriveService.getInstance();
    const authUrl = driveService.generateAuthUrl(state);
    
    console.log('Generated Drive OAuth URL:', {
      url: authUrl.substring(0, 100) + '...',
      state: state.substring(0, 8) + '...'
    });

    // Create response with OAuth URL
    const response = NextResponse.json({ url: authUrl });
    
    // Store Drive-specific state in cookie
    response.cookies.set('oauth_state', state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 10, // 10 minutes
      path: '/'
    });

    return response;
  } catch (error) {
    console.error('Error generating Drive OAuth URL:', error);
    return NextResponse.json({ 
      error: 'Failed to generate OAuth URL',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 