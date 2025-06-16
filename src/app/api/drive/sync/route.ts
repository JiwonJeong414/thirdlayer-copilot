// src/app/api/drive/sync/route.ts - FIXED VERSION
import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@/generated/prisma';
import { DriveService } from '@/lib/DriveService';
import { VectorService } from '@/lib/vectorService';

const prisma = new PrismaClient();

export async function POST(request: NextRequest) {
  try {
    const session = request.cookies.get('session');
    if (!session) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const url = new URL(request.url);
    const targetNewDocs = parseInt(url.searchParams.get('limit') || '10');
    const forceReindex = url.searchParams.get('force') === 'true';

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

    console.log(`🚀 Starting sync for user ${userId} - targeting ${targetNewDocs} documents (force: ${forceReindex})`);
    
    // Check embedding model
    const embeddingModelAvailable = await VectorService.checkEmbeddingModel();
    if (!embeddingModelAvailable) {
      return NextResponse.json({ 
        error: 'Embedding model not available',
        details: 'Please run: ollama pull mxbai-embed-large'
      }, { status: 400 });
    }

    const driveService = DriveService.getInstance();
    await driveService.authenticateUser(userId);

    // Get existing embeddings (files that have been processed for embeddings)
    const existingEmbeddings = await prisma.documentEmbedding.findMany({
      where: { userId: user.id },
      select: { fileId: true },
      distinct: ['fileId']
    });
    
    const processedFileIds = new Set(existingEmbeddings.map(doc => doc.fileId));
    console.log(`📊 Currently processed files: ${processedFileIds.size}`);

    // Fetch files from Drive
    let allFiles: any[] = [];
    let nextPageToken: string | undefined;
    let processableFilesFound = 0;
    const maxPagesToFetch = 20; // Reduced to be more reasonable
    let pagesFetched = 0;

    console.log('🔍 Fetching files from Google Drive...');

    do {
      const pageFiles = await driveService.listFiles({
        pageToken: nextPageToken
      });
      
      if (!pageFiles || pageFiles.length === 0) {
        console.log('No more files found, breaking...');
        break;
      }
      
      allFiles = allFiles.concat(pageFiles);
      
      // Count processable files on this page
      const pageProcessableFiles = pageFiles.filter((file: any) => shouldProcessFile(file.mimeType));
      processableFilesFound += pageProcessableFiles.length;
      
      console.log(`📄 Page ${pagesFetched + 1}: ${pageFiles.length} total files, ${pageProcessableFiles.length} processable files`);
      console.log(`   Sample files: ${pageFiles.slice(0, 3).map((f: any) => `${f.name} (${f.mimeType})`).join(', ')}`);
      
      pagesFetched++;
      
      // Continue until we have enough processable files OR hit the page limit
    } while (pagesFetched < maxPagesToFetch);

    console.log(`📈 Total files fetched: ${allFiles.length}, processable: ${allFiles.filter(f => shouldProcessFile(f.mimeType)).length}`);

    // Filter to get processable files
    const processableFiles = allFiles.filter(file => shouldProcessFile(file.mimeType));
    
    // Select files to process based on mode
    let filesToProcess: any[] = [];
    
    if (forceReindex) {
      // Force mode: take first N processable files regardless of processing status
      filesToProcess = processableFiles.slice(0, targetNewDocs);
      console.log(`🔄 Force reindex mode: selected ${filesToProcess.length} processable files`);
    } else {
      // Normal mode: only files that haven't been processed for embeddings
      const unprocessedFiles = processableFiles.filter(file => !processedFileIds.has(file.id));
      filesToProcess = unprocessedFiles.slice(0, targetNewDocs);
      
      console.log(`🆕 New files mode: found ${unprocessedFiles.length} unprocessed files, selected ${filesToProcess.length}`);
      
      if (unprocessedFiles.length === 0) {
        return NextResponse.json({
          success: true,
          message: 'All processable files have already been indexed!',
          strategy: 'new_files_only',
          targetDocuments: targetNewDocs,
          totalFilesInDrive: allFiles.length,
          processableFilesInDrive: processableFiles.length,
          newFilesAvailable: 0,
          processedCount: 0,
          embeddingCount: 0,
          skippedCount: 0,
          errorCount: 0,
          processedFiles: [],
          totalIndexedFiles: processedFileIds.size,
          embeddingModelAvailable,
        });
      }
    }

    // Process the selected files
    let processedCount = 0;
    let errorCount = 0;
    let embeddingCount = 0;
    let skippedCount = 0;
    const processedFiles: string[] = [];

    console.log(`🎯 Processing ${filesToProcess.length} selected files...`);

    for (let i = 0; i < filesToProcess.length; i++) {
      const file = filesToProcess[i];
      
      try {
        console.log(`\n📁 Processing ${i + 1}/${filesToProcess.length}: ${file.name}`);
        console.log(`   File ID: ${file.id}`);
        console.log(`   File Type: ${file.mimeType}`);

        // Update file record in documents table (this is separate from embeddings)
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

        // Handle embeddings
        if (forceReindex) {
          // In force mode, delete existing embeddings first
          const deletedCount = await prisma.documentEmbedding.deleteMany({
            where: { fileId: file.id, userId: user.id }
          });
          if (deletedCount.count > 0) {
            console.log(`   🗑️  Deleted ${deletedCount.count} existing embeddings for force reindex`);
          }
        }

        // Always try to create embeddings (they shouldn't exist at this point)
        try {
          console.log(`   📝 Extracting content from ${file.name}...`);
          const content = await driveService.getFileContent(file.id);
          
          if (content && content.trim().length > 50) {
            console.log(`   🧠 Creating embeddings for ${file.name} (${content.length} chars)...`);
            await VectorService.storeDocumentEmbeddings(
              user.id,
              file.id,
              file.name,
              content
            );
            embeddingCount++;
            processedFiles.push(file.name);
            console.log(`   ✅ Successfully processed ${file.name}`);
          } else {
            console.log(`   ⚠️  Insufficient content in ${file.name} (${content?.length || 0} chars) - skipping`);
            skippedCount++;
          }
        } catch (error) {
          console.error(`   ❌ Error processing ${file.name}:`, error);
          errorCount++;
        }
      } catch (error) {
        console.error(`   ❌ Error processing ${file.name}:`, error);
        errorCount++;
      }
    }

    // Update last sync time
    await prisma.driveConnection.update({
      where: { userId: user.id },
      data: { lastSyncAt: new Date() }
    });

    return NextResponse.json({
      success: true,
      message: 'Sync completed successfully',
      strategy: forceReindex ? 'force_reindex' : 'new_files_only',
      targetDocuments: targetNewDocs,
      totalFilesInDrive: allFiles.length,
      processableFilesInDrive: processableFiles.length,
      newFilesAvailable: processableFiles.length - processedFileIds.size,
      processedCount: filesToProcess.length,
      embeddingCount,
      skippedCount,
      errorCount,
      processedFiles,
      totalIndexedFiles: processedFileIds.size + embeddingCount,
      embeddingModelAvailable,
    });
  } catch (error) {
    console.error('Error during sync:', error);
    return NextResponse.json({ 
      error: 'Sync failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

function shouldProcessFile(mimeType: string): boolean {
  const processableTypes = [
    'application/vnd.google-apps.document',
    'application/vnd.google-apps.spreadsheet',
    'application/vnd.google-apps.presentation',
    'text/plain',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation'
  ];
  return processableTypes.includes(mimeType);
}