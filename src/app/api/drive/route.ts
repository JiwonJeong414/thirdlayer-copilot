// ===================================================================
// 3. CLEAN API ROUTES - src/app/api/drive/route.ts
// ===================================================================

import { NextRequest, NextResponse } from 'next/server';
import { DriveService } from '@/lib/DriveService';

const driveService = DriveService.getInstance();

// GET /api/drive - Get connection status
export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const status = await driveService.getConnectionStatus(userId);
    return NextResponse.json(status);
  } catch (error) {
    console.error('Error getting drive status:', error);
    return NextResponse.json({ error: 'Failed to get status' }, { status: 500 });
  }
}

// POST /api/drive - Connect drive (handle OAuth callback)
export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { code, state } = await request.json();
    
    if (!code) {
      return NextResponse.json({ error: 'Authorization code required' }, { status: 400 });
    }

    // Exchange code for tokens
    const credentials = await driveService.exchangeCodeForTokens(code);
    
    // Store connection
    await driveService.connectUser(userId, credentials);
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error connecting drive:', error);
    return NextResponse.json({ error: 'Failed to connect drive' }, { status: 500 });
  }
}

// DELETE /api/drive - Disconnect drive
export async function DELETE(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    await driveService.disconnectUser(userId);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error disconnecting drive:', error);
    return NextResponse.json({ error: 'Failed to disconnect drive' }, { status: 500 });
  }
} 