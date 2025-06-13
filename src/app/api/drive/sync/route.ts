// src/app/api/drive/sync/route.ts - Updated to generate embeddings
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
      return NextResponse.json({ error: 'Access token expired. Please reconnect your Drive account.' }, { status: 401 });
    }

    // Check if embedding model is available
    const embeddingModelAvailable = await VectorService.checkEmbeddingModel();
    if (!embeddingModelAvailable) {
      console.warn('Embedding model not available, files will be synced but not indexed for search');
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

    // Get all files from Drive
    do {
      const response = await driveService.listFiles(100, nextPageToken);
      allFiles = allFiles.concat(response.files);
      nextPageToken = response.nextPageToken;
    } while (nextPageToken);

    console.log(`Found ${allFiles.length} files in Drive`);

    // Process files and update database
    let processedCount = 0;
    let errorCount = 0;
    let embeddingCount = 0;

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

        // Generate embeddings for supported file types if model is available
        if (embeddingModelAvailable && shouldProcessFile(file.mimeType)) {
          try {
            console.log(`Processing embeddings for: ${file.name}`);
            const content = await driveService.getFileContent(file.id);
            
            if (content && content.trim().length > 0) {
              await VectorService.storeDocumentEmbeddings(
                user.id,
                file.id,
                file.name,
                content
              );
              embeddingCount++;
              console.log(`✅ Embeddings created for: ${file.name}`);
            } else {
              console.log(`⚠️  No content extracted from: ${file.name}`);
            }
          } catch (embeddingError) {
            console.error(`❌ Error processing embeddings for ${file.name}:`, embeddingError);
            // Continue with other files even if embedding fails
          }
        }

        processedCount++;
        
        // Progress logging every 10 files
        if (processedCount % 10 === 0) {
          console.log(`Progress: ${processedCount}/${allFiles.length} files processed, ${embeddingCount} embeddings created`);
        }
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

    const summary = {
      success: true,
      totalFiles: allFiles.length,
      processedCount,
      errorCount,
      embeddingCount,
      embeddingModelAvailable,
    };

    console.log('Sync completed:', summary);

    return NextResponse.json(summary);
  } catch (error) {
    console.error('Error syncing Drive:', error);
    return NextResponse.json({ error: 'Failed to sync Drive' }, { status: 500 });
  }
}

// Helper function to determine if a file should be processed for embeddings
function shouldProcessFile(mimeType: string): boolean {
  const supportedTypes = [
    'application/vnd.google-apps.document',  // Google Docs
    'text/plain',                            // Text files
    'application/pdf',                       // PDFs (if you add PDF processing)
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document' // Word docs
  ];
  
  return supportedTypes.includes(mimeType);
}
