import { NextRequest, NextResponse } from 'next/server';
import { exchangeCodeForTokens } from '@/lib/driveAuth';
import { PrismaClient } from '@/generated/prisma';

const prisma = new PrismaClient();

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');

    console.log('Drive callback received:', {
      hasCode: !!code,
      hasState: !!state,
      error: error,
      state: state?.substring(0, 8) + '...'
    });

    // Check for OAuth errors
    if (error) {
      console.error('Drive OAuth error:', error);
      return NextResponse.redirect(new URL('/?error=drive_oauth_error', request.url));
    }

    if (!code || !state) {
      console.error('Missing code or state parameter');
      return NextResponse.redirect(new URL('/?error=missing_params', request.url));
    }

    // Verify Drive-specific state parameter
    const storedState = request.cookies.get('drive_oauth_state')?.value;
    console.log('State verification:', {
      received: state.substring(0, 8) + '...',
      stored: storedState?.substring(0, 8) + '...',
      matches: state === storedState
    });

    if (!storedState || state !== storedState) {
      console.error('Invalid Drive state parameter');
      return NextResponse.redirect(new URL('/?error=invalid_drive_state', request.url));
    }

    // Get session to identify user
    const session = request.cookies.get('session');
    if (!session) {
      console.error('No session found during Drive callback');
      return NextResponse.redirect(new URL('/?error=no_session', request.url));
    }

    const { userId } = JSON.parse(session.value);
    console.log('Processing Drive connection for user:', userId);

    // Exchange code for tokens
    const tokens = await exchangeCodeForTokens(code);
    console.log('Received tokens:', {
      hasAccessToken: !!tokens.access_token,
      hasRefreshToken: !!tokens.refresh_token,
      expiryDate: tokens.expiry_date
    });

    if (!tokens.access_token) {
      throw new Error('No access token received from Google');
    }

    // Store Drive credentials in database
    await prisma.driveConnection.upsert({
      where: { userId },
      update: {
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token || undefined,
        isConnected: true,
        connectedAt: new Date(),
        updatedAt: new Date(),
      },
      create: {
        userId,
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token || undefined,
        isConnected: true,
        connectedAt: new Date(),
        updatedAt: new Date(),
      },
    });

    console.log('Drive connection stored successfully');

    // Create success response
    const response = NextResponse.redirect(new URL('/?drive_connected=true', request.url));
    
    // Clear the Drive OAuth state cookie
    response.cookies.delete('drive_oauth_state');
    
    return response;
  } catch (error) {
    console.error('Error in Drive OAuth callback:', error);
    return NextResponse.redirect(new URL('/?error=drive_auth_failed', request.url));
  }
}
