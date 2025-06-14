// src/app/api/drive/connect/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    const session = request.cookies.get('session');
    if (!session) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { userId } = JSON.parse(session.value);
    const { accessToken, refreshToken } = await request.json();

    if (!accessToken) {
      return NextResponse.json({ error: 'Access token required' }, { status: 400 });
    }

    // Find user
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    console.log('Storing Drive credentials for user:', { userId: user.id });

    // Store Drive credentials
    await prisma.driveConnection.upsert({
      where: { userId: user.id },
      update: {
        accessToken,
        refreshToken,
        isConnected: true,
        connectedAt: new Date(),
        updatedAt: new Date(),
      },
      create: {
        userId: user.id,
        accessToken,
        refreshToken,
        isConnected: true,
        connectedAt: new Date(),
        updatedAt: new Date(),
      },
    });

    console.log('Drive credentials stored successfully');
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error connecting Drive:', error);
    return NextResponse.json({ error: 'Failed to connect Drive' }, { status: 500 });
  }
}
