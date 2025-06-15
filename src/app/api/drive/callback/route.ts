// src/app/api/drive/auth-url/route.ts - Updated to include flow type in state

import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';
import crypto from 'crypto';

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI // Same redirect URI for both flows
);

export async function GET(request: NextRequest) {
  try {
    // Check if user is authenticated
    const session = request.cookies.get('session');
    if (!session) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // Generate state parameter with flow type indicator
    const baseState = crypto.randomBytes(32).toString('hex');
    const state = `drive_${baseState}`; // Prefix to indicate this is for Drive auth
    
    const scopes = [
      'https://www.googleapis.com/auth/drive.readonly',
      'https://www.googleapis.com/auth/drive.metadata.readonly'
    ];

    const authUrl = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: scopes,
      prompt: 'consent',
      state: state,
      include_granted_scopes: true
    });
    
    console.log('Generated Drive OAuth URL:', {
      url: authUrl.substring(0, 100) + '...',
      state: state.substring(0, 12) + '...',
      isDriveFlow: state.startsWith('drive_')
    });

    // Create response with OAuth URL
    const response = NextResponse.json({ url: authUrl });
    
    // Store Drive-specific state in cookie
    response.cookies.set('drive_oauth_state', state, {
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