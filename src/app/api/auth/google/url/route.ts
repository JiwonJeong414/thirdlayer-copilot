// Generates Google OAuth URL and sets CSRF state cookie
import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';
import crypto from 'crypto';

const redirectUri = process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3000/api/auth/callback/google';

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  redirectUri
);

export async function GET(request: NextRequest) {
  try {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      return NextResponse.json({ 
        error: 'OAuth configuration missing' 
      }, { status: 500 });
    }

    // Generate random state for CSRF protection
    const state = crypto.randomBytes(32).toString('hex');
    
    // FIXED: Include full Drive scope for delete permissions
    const scopes = [
      'openid',
      'email', 
      'profile',
      'https://www.googleapis.com/auth/drive', // Full Drive access including delete
    ];
    
    // Construct OAuth URL with delete permissions
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: scopes.join(' '),
      access_type: 'offline',
      prompt: 'consent', // Force consent to get refresh token and new permissions
      state
    });

    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
    
    console.log('Generated OAuth URL with FULL Drive scope for delete permissions');

    const response = NextResponse.json({ url: authUrl });
    
    // Store state in cookie for verification
    response.cookies.set('oauth_state', state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 10 // 10 minutes
    });

    return response;
  } catch (error) {
    console.error('Error generating OAuth URL:', error);
    return NextResponse.json({ 
      error: 'Failed to generate OAuth URL',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}