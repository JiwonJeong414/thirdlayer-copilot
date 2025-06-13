// src/app/api/drive/sync/route.ts - FAST version that processes only recent files
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
    const maxFiles = limitParam ? parseInt(limitParam) : 10; // Default to 10 files for testing

    const { userId } = JSON.parse(session.value);
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        driveConnection: true,
      },
    });

    if (!user || !user.driveConnection?.isConnected) {
      return NextResponse.json({ error: 'Drive not connected' }, { status: 400 });
    }

    console.log(`🚀 Starting QUICK sync for user ${userId} - processing max ${maxFiles} files`);
    
    // Check if embedding model is available
    const embeddingModelAvailable = await VectorService.checkEmbeddingModel();
    if (!embeddingModelAvailable) {
      console.warn('⚠️  Embedding model not available, files will be synced but not indexed for search');
      // Continue anyway - at least sync the file metadata
    }

    const driveService = new GoogleDriveService({
      access_token: user.driveConnection.accessToken,
      refresh_token: user.driveConnection.refreshToken || undefined,
    });

    // Get only the first page of files (100 max) and limit further
    const response = await driveService.listFiles(100); // Just first page
    const filesToProcess = response.files.slice(0, maxFiles); // Limit to maxFiles

    console.log(`📁 Found ${response.files.length} total files, processing ${filesToProcess.length} files`);

    let processedCount = 0;
    let errorCount = 0;
    let embeddingCount = 0;
    let skippedCount = 0;

    for (const file of filesToProcess) {
      try {
        console.log(`📄 Processing ${processedCount + 1}/${filesToProcess.length}: ${file.name}`);

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

        // Check if we already have embeddings for this file
        if (embeddingModelAvailable) {
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
      message: `Quick sync completed! Processed ${processedCount} files.`,
      totalFilesInDrive: response.files.length,
      processedCount,
      errorCount,
      embeddingCount,
      skippedCount,
      embeddingModelAvailable,
      isQuickSync: true,
      note: `This was a quick sync of ${maxFiles} files. Use ?limit=50 to process more files.`
    };

    console.log('🎉 Quick sync completed:', summary);
    return NextResponse.json(summary);
  } catch (error) {
    console.error('❌ Error in quick sync:', error);
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
    'text/plain',                            // Text files
    // 'application/pdf',                    // PDFs (commented out for now)
    // 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' // Word docs
  ];
  
  return supportedTypes.includes(mimeType);
}
