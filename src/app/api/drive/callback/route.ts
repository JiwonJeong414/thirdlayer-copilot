import { NextRequest, NextResponse } from 'next/server';
import { getTokens, verifyState } from '@/lib/googleAuth';
import { PrismaClient } from '@/generated/prisma';

const prisma = new PrismaClient();

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

    if (!code || !state) {
      return NextResponse.redirect(new URL('/?error=missing_params', request.url));
    }

    // Verify state parameter
    if (!verifyState(state)) {
      console.error('Invalid state parameter');
      return NextResponse.redirect(new URL('/?error=invalid_state', request.url));
    }

    // Get session to identify user
    const session = request.cookies.get('session');
    if (!session) {
      return NextResponse.redirect(new URL('/?error=no_session', request.url));
    }

    const { userId } = JSON.parse(session.value);

    // Exchange code for tokens
    const tokens = await getTokens(code, state);

    if (!tokens.access_token) {
      throw new Error('No access token received');
    }

    // Store Drive credentials
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

    return NextResponse.redirect(new URL('/?drive_connected=true', request.url));
  } catch (error) {
    console.error('Error in Drive OAuth callback:', error);
    return NextResponse.redirect(new URL('/?error=drive_auth_failed', request.url));
  }
} 