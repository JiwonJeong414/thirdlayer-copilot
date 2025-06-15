import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@/generated/prisma';

const prisma = new PrismaClient();

// API route to check Google Drive connection status for the authenticated user
export async function GET(request: NextRequest) {
  try {
    // Verify user authentication by checking session cookie
    const session = request.cookies.get('session');
    if (!session) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { userId } = JSON.parse(session.value);
    
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        driveConnection: true, // Include the related Drive connection data
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Extract Drive connection data from user record
    const driveConnection = user.driveConnection;
    
    // Return Drive connection status with timestamps
    // If no connection exists, return default values
    return NextResponse.json({
      isConnected: driveConnection?.isConnected || false,  // Whether Drive is connected
      connectedAt: driveConnection?.connectedAt || null,   // When Drive was connected
      lastSyncAt: driveConnection?.lastSyncAt || null,    // When Drive was last synced
    });
  } catch (error) {
    console.error('Error getting Drive status:', error);
    return NextResponse.json({ error: 'Failed to get Drive status' }, { status: 500 });
  }
} 