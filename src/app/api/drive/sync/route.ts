// src/app/api/drive/sync/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@/generated/prisma';
import { GoogleDriveService } from '@/lib/googleDrive';
import { VectorService } from '@/lib/vectorService';

const prisma = new PrismaClient();

export async function POST(request: NextRequest) {
  try {
    const session = request.cookies.get('session');
    if (!session) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { userId } = JSON.parse(session.value);
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        driveConnection: true,
      },
    });

    if (!user || !user.driveConnection?.isConnected) {
      console.log('Drive sync failed: User not found or Drive not connected', { userId, hasUser: !!user, hasConnection: !!user?.driveConnection?.isConnected });
      return NextResponse.json({ error: 'Drive not connected' }, { status: 400 });
    }

    console.log('Starting Drive sync for user:', { userId: user.id });
    
    // Check if the access token is expired (using updatedAt as a proxy for expiry)
    const tokenAge = Date.now() - user.driveConnection.updatedAt.getTime();
    if (tokenAge > 3600 * 1000) { // Token older than 1 hour
      console.log('Access token may be expired, attempting to refresh...');
      // TODO: Implement token refresh logic
      return NextResponse.json({ error: 'Access token expired. Please reconnect your Drive account.' }, { status: 401 });
    }

    const driveService = new GoogleDriveService({
      access_token: user.driveConnection.accessToken,
      refresh_token: user.driveConnection.refreshToken || undefined,
    });

    console.log('Drive service initialized with token:', {
      hasAccessToken: !!user.driveConnection.accessToken,
      hasRefreshToken: !!user.driveConnection.refreshToken,
      tokenAge: Math.round(tokenAge / 1000 / 60) + ' minutes',
    });

    let allFiles: any[] = [];
    let nextPageToken: string | undefined;

    do {
      const response = await driveService.listFiles(100, nextPageToken);
      allFiles = allFiles.concat(response.files);
      nextPageToken = response.nextPageToken;
    } while (nextPageToken);

    console.log(`Found ${allFiles.length} files in Drive`);

    // Process files and update database
    const vectorService = new VectorService();
    let processedCount = 0;
    let errorCount = 0;

    for (const file of allFiles) {
      try {
        // Update or create file record
        await prisma.document.upsert({
          where: { driveId: file.id },
          update: {
            name: file.name,
            mimeType: file.mimeType,
            modifiedTime: new Date(file.modifiedTime),
            size: file.size ? parseInt(file.size) : null,
            webViewLink: file.webViewLink,
            updatedAt: new Date(),
          },
          create: {
            driveId: file.id,
            name: file.name,
            mimeType: file.mimeType,
            modifiedTime: new Date(file.modifiedTime),
            size: file.size ? parseInt(file.size) : null,
            webViewLink: file.webViewLink,
            userId: user.id,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        });

        processedCount++;
      } catch (error) {
        console.error('Error processing file:', file.id, error);
        errorCount++;
      }
    }

    // Update last sync time
    await prisma.driveConnection.update({
      where: { userId: user.id },
      data: {
        lastSyncAt: new Date(),
        updatedAt: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      totalFiles: allFiles.length,
      processedCount,
      errorCount,
    });
  } catch (error) {
    console.error('Error syncing Drive:', error);
    return NextResponse.json({ error: 'Failed to sync Drive' }, { status: 500 });
  }
} 