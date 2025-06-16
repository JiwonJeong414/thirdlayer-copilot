// src/app/api/drive/sync/route.ts - RESTORED TO WORKING VERSION
import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@/generated/prisma';
import { DriveService } from '@/lib/DriveService';
import { VectorService } from '@/lib/VectorService';

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

    // FAST APPROACH: Use targeted queries instead of fetching everything
    console.log('🎯 Using targeted file search for faster sync...');
    
    let filesToProcess: any[] = [];
    let totalFilesFound = 0;
    let processableFilesFound = 0;

    if (forceReindex) {
      console.log(`🔄 Force reindex mode: fetching first ${targetNewDocs} processable files`);
      // Get any files, limited count
      const someFiles = await driveService.listFiles({
        pageSize: Math.min(targetNewDocs * 3, 100), // Get 3x target to account for non-processable files
        orderBy: 'modifiedTime desc' // Get most recently modified first
      });
      
      const processableFiles = someFiles.filter(file => file.mimeType && shouldProcessFile(file.mimeType));
      filesToProcess = processableFiles.slice(0, targetNewDocs);
      totalFilesFound = someFiles.length;
      processableFilesFound = processableFiles.length;
      
      console.log(`🔄 Found ${filesToProcess.length} files to force reindex`);
    } else {
      console.log(`🆕 Normal mode: searching for new files to process`);
      
      // Strategy: Get recently modified files first (most likely to be new)
      const recentFiles = await driveService.listFiles({
        pageSize: Math.min(targetNewDocs * 5, 200), // Get more to find unprocessed ones
        orderBy: 'modifiedTime desc',
        q: 'trashed=false' // Only non-trashed files
      });
      
      totalFilesFound = recentFiles.length;
      const processableFiles = recentFiles.filter(file => file.mimeType && shouldProcessFile(file.mimeType));
      processableFilesFound = processableFiles.length;
      
      // Filter out already processed files
      const unprocessedFiles = processableFiles.filter(file => file.id && !processedFileIds.has(file.id));
      filesToProcess = unprocessedFiles.slice(0, targetNewDocs);
      
      console.log(`📊 Recent files scan: ${totalFilesFound} total, ${processableFiles.length} processable, ${unprocessedFiles.length} unprocessed`);
      
      // If we don't have enough from recent files, try a broader search
      if (filesToProcess.length < targetNewDocs && filesToProcess.length < unprocessedFiles.length) {
        console.log(`🔍 Not enough recent files, searching more broadly...`);
        
        // Search for specific document types to be more targeted
        const docTypes = [
          'application/vnd.google-apps.document',
          'application/vnd.google-apps.spreadsheet', 
          'application/vnd.google-apps.presentation'
        ];
        
        for (const mimeType of docTypes) {
          if (filesToProcess.length >= targetNewDocs) break;
          
          const typeFiles = await driveService.listFiles({
            pageSize: 50,
            q: `mimeType='${mimeType}' and trashed=false`,
            orderBy: 'modifiedTime desc'
          });
          
          const newUnprocessed = typeFiles.filter(file => 
            file.id && !processedFileIds.has(file.id) && 
            !filesToProcess.some(f => f.id === file.id)
          );
          
          filesToProcess.push(...newUnprocessed.slice(0, targetNewDocs - filesToProcess.length));
          console.log(`   📄 Found ${newUnprocessed.length} new ${mimeType.split('.').pop()} files`);
        }
      }
      
      if (filesToProcess.length === 0) {
        return NextResponse.json({
          success: true,
          message: 'All recent files have already been indexed! Your Drive is up to date.',
          strategy: 'new_files_only',
          targetDocuments: targetNewDocs,
          totalFilesInDrive: totalFilesFound,
          processableFilesInDrive: processableFilesFound,
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
          
          // More lenient content check - even metadata is useful for search
          if (content && content.trim().length > 20) {
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
        } catch (embeddingError) {
          console.error(`   ❌ Failed to create embeddings for ${file.name}:`, embeddingError);
          // Don't count this as total failure - file record was still updated
          errorCount++;
        }

        processedCount++;
      } catch (error) {
        console.error(`💥 ERROR processing file ${file.id} (${file.name}):`, error);
        errorCount++;
      }
    }

    // Update sync time
    await prisma.driveConnection.update({
      where: { userId: user.id },
      data: {
        lastSyncAt: new Date(),
        updatedAt: new Date(),
      },
    });

    // Get final count of indexed files
    const finalIndexedFiles = await prisma.documentEmbedding.findMany({
      where: { userId: user.id },
      select: { fileId: true },
      distinct: ['fileId']
    });

    const summary = {
      success: true,
      message: `Sync completed! Successfully indexed ${embeddingCount} documents.`,
      strategy: forceReindex ? 'force_reindex' : 'new_files_only',
      targetDocuments: targetNewDocs,
      totalFilesInDrive: totalFilesFound,
      processableFilesInDrive: processableFilesFound,
      newFilesAvailable: filesToProcess.length,
      processedCount,
      embeddingCount,
      skippedCount,
      errorCount,
      processedFiles: processedFiles.slice(0, 10), // Show first 10
      totalIndexedFiles: finalIndexedFiles.length,
      embeddingModelAvailable,
      debug: {
        selectedFilesCount: filesToProcess.length,
        startingIndexedFiles: processedFileIds.size,
        finalIndexedFiles: finalIndexedFiles.length,
      }
    };

    console.log('🎉 Sync completed successfully:', {
      embeddingCount,
      skippedCount,
      errorCount,
      totalIndexed: finalIndexedFiles.length
    });

    return NextResponse.json(summary);
  } catch (error) {
    console.error('💥 CRITICAL ERROR in sync:', error);
    return NextResponse.json({ 
      error: 'Failed to sync Drive',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

function shouldProcessFile(mimeType: string): boolean {
  const supportedTypes = [
    'application/vnd.google-apps.document',      // Google Docs - FULL TEXT
    'application/vnd.google-apps.spreadsheet',  // Google Sheets - FULL TEXT
    'application/vnd.google-apps.presentation', // Google Slides - FULL TEXT
    'text/plain',                               // Text files - FULL TEXT
  ];
  
  return supportedTypes.includes(mimeType);
}