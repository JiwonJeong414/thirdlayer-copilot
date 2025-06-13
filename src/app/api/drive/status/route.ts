// src/app/api/drive/status/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@/generated/prisma';

const prisma = new PrismaClient();

export async function GET(request: NextRequest) {
  try {
    const uid = request.headers.get('uid');
    if (!uid) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { uid },
      include: {
        driveConnection: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const driveConnection = user.driveConnection;
    
    return NextResponse.json({
      isConnected: driveConnection?.isConnected || false,
      connectedAt: driveConnection?.connectedAt || null,
      lastSyncAt: driveConnection?.lastSyncAt || null,
    });
  } catch (error) {
    console.error('Error getting Drive status:', error);
    return NextResponse.json({ error: 'Failed to get Drive status' }, { status: 500 });
  }
} 