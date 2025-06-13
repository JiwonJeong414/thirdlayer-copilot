// src/app/api/drive/connect/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@/generated/prisma';

const prisma = new PrismaClient();

export async function POST(request: NextRequest) {
  try {
    const uid = request.headers.get('uid');
    if (!uid) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { accessToken, refreshToken } = await request.json();

    if (!accessToken) {
      return NextResponse.json({ error: 'Access token required' }, { status: 400 });
    }

    // Find user
    const user = await prisma.user.findUnique({
      where: { uid },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Store Drive credentials
    await prisma.driveConnection.upsert({
      where: { userId: user.id },
      update: {
        accessToken,
        refreshToken,
        isConnected: true,
        connectedAt: new Date(),
      },
      create: {
        userId: user.id,
        accessToken,
        refreshToken,
        isConnected: true,
        connectedAt: new Date(),
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error connecting Drive:', error);
    return NextResponse.json({ error: 'Failed to connect Drive' }, { status: 500 });
  }
}
