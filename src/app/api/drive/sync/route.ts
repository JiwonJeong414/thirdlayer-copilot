// src/app/api/drive/sync/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@/generated/prisma';
import { GoogleDriveService } from '@/lib/googleDrive';
import { VectorService } from '@/lib/vectorService';

const prisma = new PrismaClient();

export async function POST(request: NextRequest) {
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

    if (!user || !user.driveConnection?.isConnected) {
      return NextResponse.json({ error: 'Drive not connected' }, { status: 400 });
    }

    const driveService = new GoogleDriveService({
      access_token: user.driveConnection.accessToken,
      refresh_token: user.driveConnection.refreshToken || undefined,
    });

    let allFiles: any[] = [];
    let nextPageToken: string | undefined;

    // Get all files from Drive
    do {
      const { files, nextPageToken: token } = await driveService.listFiles(50, nextPageToken);
      allFiles = [...allFiles, ...files];
      nextPageToken = token;
    } while (nextPageToken);

    let processedCount = 0;
    let errorCount = 0;

    // Process each file
    for (const file of allFiles) {
      try {
        // Check if file is already processed
        const existingEmbedding = await prisma.documentEmbedding.findFirst({
          where: {
            fileId: file.id,
            userId: user.id,
          },
        });

        // Skip if already processed and not modified
        if (existingEmbedding && 
            existingEmbedding.updatedAt >= new Date(file.modifiedTime)) {
          continue;
        }

        // Get file content
        const content = await driveService.getFileContent(file.id);
        
        // Skip empty files
        if (!content || content.trim().length < 50) {
          continue;
        }

        // Generate and store embeddings
        await VectorService.storeDocumentEmbeddings(
          user.id,
          file.id,
          file.name,
          content
        );

        processedCount++;
      } catch (error) {
        console.error(`Error processing file ${file.name}:`, error);
        errorCount++;
      }
    }

    // Update last sync time
    await prisma.driveConnection.update({
      where: { id: user.driveConnection.id },
      data: { lastSyncAt: new Date() },
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