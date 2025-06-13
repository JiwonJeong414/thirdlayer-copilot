// src/app/api/drive/sync/route.ts - FIXED VERSION with better file type handling
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

    // Parse query parameters for limiting
    const url = new URL(request.url);
    const limitParam = url.searchParams.get('limit');
    const maxFiles = limitParam ? parseInt(limitParam) : 50; // Increased default to 50

    const { userId } = JSON.parse(session.value);
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        driveConnection: true,
      },
    });

    if (!user || !user.driveConnection?.isConnected) {
      console.log('Drive sync failed: User not found or Drive not connected');
      return NextResponse.json({ error: 'Drive not connected' }, { status: 400 });
    }

    console.log(`🚀 Starting sync for user ${userId} - processing max ${maxFiles} files`);
    
    // Check if embedding model is available
    const embeddingModelAvailable = await VectorService.checkEmbeddingModel();
    if (!embeddingModelAvailable) {
      console.warn('⚠️  Embedding model not available, files will be synced but not indexed for search');
    }

    const driveService = new GoogleDriveService({
      access_token: user.driveConnection.accessToken,
      refresh_token: user.driveConnection.refreshToken || undefined,
    });

    // Get files from Drive - remove the file type filter to get ALL files
    const response = await driveService.listFiles(Math.min(maxFiles, 100)); // Get up to 100 files per page
    const allFiles = response.files;

    console.log(`📁 Found ${allFiles.length} total files in Drive`);

    if (allFiles.length === 0) {
      console.log('⚠️  No files found in Drive. This might be a permissions issue.');
      return NextResponse.json({
        success: false,
        message: 'No files found in your Google Drive. Please check permissions.',
        totalFiles: 0,
        processedCount: 0,
        embeddingCount: 0,
        skippedCount: 0,
        errorCount: 0,
        embeddingModelAvailable,
      });
    }

    // Process only the first maxFiles
    const filesToProcess = allFiles.slice(0, maxFiles);
    console.log(`📄 Processing ${filesToProcess.length} files...`);

    let processedCount = 0;
    let errorCount = 0;
    let embeddingCount = 0;
    let skippedCount = 0;

    for (const file of filesToProcess) {
      try {
        console.log(`\n📄 Processing ${processedCount + 1}/${filesToProcess.length}: ${file.name} (${file.mimeType})`);

        // Update or create file record in database
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

        // Generate embeddings if model is available and file type is supported
        if (embeddingModelAvailable) {
          // Check if we already have embeddings
          const existingEmbeddings = await prisma.documentEmbedding.findFirst({
            where: { fileId: file.id },
            select: { id: true }
          });

          if (existingEmbeddings) {
            console.log(`⏭️  Embeddings already exist for: ${file.name}`);
            skippedCount++;
          } else if (shouldProcessFile(file.mimeType)) {
            try {
              console.log(`🔄 Creating embeddings for: ${file.name}`);
              const content = await driveService.getFileContent(file.id);
              
              if (content && content.trim().length > 50) { // Minimum content length
                await VectorService.storeDocumentEmbeddings(
                  user.id,
                  file.id,
                  file.name,
                  content
                );
                embeddingCount++;
                console.log(`✅ Embeddings created for: ${file.name} (${content.length} chars)`);
              } else {
                console.log(`⚠️  Insufficient content in: ${file.name} (${content?.length || 0} chars)`);
                skippedCount++;
              }
            } catch (embeddingError) {
              console.error(`❌ Error processing embeddings for ${file.name}:`, embeddingError);
              skippedCount++;
            }
          } else {
            console.log(`⏭️  Skipping unsupported file type: ${file.name} (${file.mimeType})`);
            skippedCount++;
          }
        }

        processedCount++;
      } catch (error) {
        console.error(`❌ Error processing file ${file.id}:`, error);
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
      message: `Sync completed! Processed ${processedCount} files, created ${embeddingCount} embeddings.`,
      totalFilesInDrive: allFiles.length,
      processedCount,
      errorCount,
      embeddingCount,
      skippedCount,
      embeddingModelAvailable,
      supportedTypes: [
        'Google Docs',
        'Google Sheets', 
        'Google Slides',
        'Text files'
      ],
      note: `Processed ${maxFiles} most recent files. Use ?limit=X to process more.`
    };

    console.log('\n🎉 Sync completed:', summary);
    return NextResponse.json(summary);
  } catch (error) {
    console.error('❌ Error in sync:', error);
    return NextResponse.json({ 
      error: 'Failed to sync Drive',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// Helper function to determine if a file should be processed for embeddings
function shouldProcessFile(mimeType: string): boolean {
  const supportedTypes = [
    'application/vnd.google-apps.document',  // Google Docs
    'application/vnd.google-apps.spreadsheet', // Google Sheets  
    'application/vnd.google-apps.presentation', // Google Slides
    'text/plain',                            // Text files
    // Note: PDF and Word docs are more complex to process, excluded for now
  ];
  
  return supportedTypes.includes(mimeType);
}