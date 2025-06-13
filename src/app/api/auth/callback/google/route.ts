import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';
import { PrismaClient } from '@/generated/prisma';

const prisma = new PrismaClient();
const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');

    // Check for OAuth errors
    if (error) {
      console.error('OAuth error:', error);
      return NextResponse.redirect(new URL('/?error=oauth_error', request.url));
    }

    // Verify state to prevent CSRF
    const storedState = request.cookies.get('oauth_state')?.value;
    if (!state || !storedState || state !== storedState) {
      console.error('Invalid state parameter');
      return NextResponse.redirect(new URL('/?error=invalid_state', request.url));
    }

    if (!code) {
      return NextResponse.redirect(new URL('/?error=no_code', request.url));
    }

    // Exchange code for tokens
    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);

    // Get user info
    const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
    const { data: userInfo } = await oauth2.userinfo.get();

    if (!userInfo.email || !userInfo.id) {
      throw new Error('Failed to get user info');
    }

    // Create or update user in database
    const user = await prisma.user.upsert({
      where: { uid: userInfo.id },
      update: {
        email: userInfo.email,
        displayName: userInfo.name || '',
        photoURL: userInfo.picture || '',
        updatedAt: new Date(),
      },
      create: {
        uid: userInfo.id,
        email: userInfo.email,
        displayName: userInfo.name || '',
        photoURL: userInfo.picture || '',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });

    // Store tokens in session
    const response = NextResponse.redirect(new URL('/', request.url));
    
    // Clear the OAuth state cookie
    response.cookies.delete('oauth_state');
    
    // Set the session cookie
    const sessionData = {
      userId: user.id,
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
    };
    
    console.log('Setting session cookie for user:', user.id);
    
    response.cookies.set('session', JSON.stringify(sessionData), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60, // 7 days
    });

    console.log('Session cookie set successfully');
    return response;
  } catch (error) {
    console.error('Error in Google OAuth callback:', error);
    return NextResponse.redirect(new URL('/?error=auth_failed', request.url));
  }
} 