import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';
import { randomBytes } from 'crypto';
import { cookies } from 'next/headers';
import crypto from 'crypto';

// Ensure the redirect URI is properly set
const redirectUri = process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3000/api/auth/callback/google';

// Validate required environment variables
if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
  console.error('Missing required Google OAuth environment variables:', {
    hasClientId: !!process.env.GOOGLE_CLIENT_ID,
    hasClientSecret: !!process.env.GOOGLE_CLIENT_SECRET,
    redirectUri
  });
}

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  redirectUri
);

export async function GET(request: NextRequest) {
  try {
    // Log all environment variables (safely)
    const envCheck = {
      hasClientId: !!process.env.GOOGLE_CLIENT_ID,
      hasClientSecret: !!process.env.GOOGLE_CLIENT_SECRET,
      hasRedirectUri: !!process.env.GOOGLE_REDIRECT_URI,
      clientIdPrefix: process.env.GOOGLE_CLIENT_ID ? process.env.GOOGLE_CLIENT_ID.substring(0, 10) + '...' : 'missing',
      redirectUri: process.env.GOOGLE_REDIRECT_URI
    };
    
    console.log('Environment Variables Check:', envCheck);

    // Ensure redirect URI is properly set
    const redirectUri = process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3000/api/auth/callback/google';
    if (!redirectUri) {
      const error = 'OAuth configuration is missing: Redirect URI not set';
      console.error(error);
      return NextResponse.json({ error, details: envCheck }, { status: 500 });
    }

    // Validate required environment variables
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

    if (!clientId) {
      const error = 'OAuth configuration is missing: Client ID not set';
      console.error(error);
      return NextResponse.json({ error, details: envCheck }, { status: 500 });
    }

    if (!clientSecret) {
      const error = 'OAuth configuration is missing: Client Secret not set';
      console.error(error);
      return NextResponse.json({ error, details: envCheck }, { status: 500 });
    }

    // Log OAuth configuration (safely)
    console.log('OAuth Configuration:', {
      clientId: clientId ? `${clientId.substring(0, 5)}...` : 'missing',
      hasClientSecret: !!clientSecret,
      redirectUri
    });

    // Generate random state for CSRF protection
    const state = crypto.randomBytes(32).toString('hex');
    
    // Construct OAuth URL
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: 'openid email profile https://www.googleapis.com/auth/drive.file',
      access_type: 'offline',
      prompt: 'consent',
      state
    });

    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
    
    console.log('Generated OAuth URL:', {
      url: authUrl,
      state: state.substring(0, 8) + '...',
      redirectUri,
      clientIdPrefix: clientId.substring(0, 10) + '...'
    });

    // Create response with OAuth URL
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
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error generating OAuth URL:', error);
    return NextResponse.json({ 
      error: 'Failed to generate OAuth URL',
      details: errorMessage
    }, { status: 500 });
  }
} 