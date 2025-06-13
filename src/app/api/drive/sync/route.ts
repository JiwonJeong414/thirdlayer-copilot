// src/app/api/drive/sync/route.ts - ACTUALLY FIXED to check database properly
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

    console.log(`FIXED sync for user ${userId} - targeting ${targetNewDocs} NEW documents (force: ${forceReindex})`);
    
    // Check embedding model
    const embeddingModelAvailable = await VectorService.checkEmbeddingModel();
    if (!embeddingModelAvailable) {
      return NextResponse.json({ 
        error: 'Embedding model not available',
        details: 'Please run: ollama pull mxbai-embed-large'
      }, { status: 400 });
    }

    const driveService = new GoogleDriveService({
      access_token: user.driveConnection.accessToken,
      refresh_token: user.driveConnection.refreshToken || undefined,
    });

    // FIXED: Get ALL indexed file IDs from documentEmbedding table
    const existingEmbeddings = await prisma.documentEmbedding.findMany({
      where: { userId: user.id },
      select: { fileId: true },
      distinct: ['fileId']
    });
    
    const indexedFileIds = new Set(existingEmbeddings.map(doc => doc.fileId));
    console.log(`Currently indexed files in database: ${indexedFileIds.size}`);
    
    // Debug: Log some indexed file IDs
    const sampleIndexedIds = Array.from(indexedFileIds).slice(0, 3);
    console.log(`Sample indexed file IDs: ${sampleIndexedIds.join(', ')}`);

    // Fetch files from Drive
    let allFiles: any[] = [];
    let nextPageToken: string | undefined;
    let newProcessableFilesFound = 0;
    const maxPagesToFetch = 50;
    let pagesFetched = 0;

    do {
      const response = await driveService.listFiles(100, nextPageToken);
      const pageFiles = response.files;
      
      allFiles = allFiles.concat(pageFiles);
      
      // Count ACTUALLY NEW processable files
      const actuallyNewProcessableFiles = pageFiles.filter(file => {
        const isNewFile = !indexedFileIds.has(file.id);
        const isProcessable = shouldProcessFile(file.mimeType);
        const isActuallyNew = isNewFile && isProcessable;
        
        if (isActuallyNew) {
          console.log(`Found NEW processable file: ${file.name} (${file.id.substring(0, 15)}...)`);
        }
        
        return isActuallyNew;
      }).length;
      
      newProcessableFilesFound += actuallyNewProcessableFiles;
      
      console.log(`Page ${pagesFetched + 1}: ${pageFiles.length} total files, ${actuallyNewProcessableFiles} ACTUALLY new processable files`);
      
      nextPageToken = response.nextPageToken;
      pagesFetched++;
      
      // Keep going until we have enough ACTUALLY new files
    } while (
      nextPageToken && 
      newProcessableFilesFound < targetNewDocs && 
      pagesFetched < maxPagesToFetch
    );

    console.log(`Finished searching: ${allFiles.length} total files, ${newProcessableFilesFound} ACTUALLY new processable files found`);

    // FIXED: Select files with proper database check
    let filesToProcess: any[] = [];
    
    if (forceReindex) {
      // Force mode: take first N processable files regardless of indexing status
      filesToProcess = allFiles
        .filter(file => shouldProcessFile(file.mimeType))
        .slice(0, targetNewDocs);
      console.log(`Force reindex mode: selected ${filesToProcess.length} processable files`);
    } else {
      // Normal mode: ONLY files that are NOT in the database
      const trulyNewFiles = allFiles.filter(file => {
        const isNotIndexed = !indexedFileIds.has(file.id);
        const isProcessable = shouldProcessFile(file.mimeType);
        return isNotIndexed && isProcessable;
      });
      
      filesToProcess = trulyNewFiles.slice(0, targetNewDocs);
      
      console.log(`NEW FILES MODE: Selected ${filesToProcess.length} files from ${trulyNewFiles.length} truly new processable files`);
      
      // Debug: Log selected files
      filesToProcess.forEach((file, i) => {
        console.log(`  ${i + 1}. ${file.name} (${file.id.substring(0, 15)}...) - NOT in database: ${!indexedFileIds.has(file.id)}`);
      });
      
      if (trulyNewFiles.length < targetNewDocs) {
        console.log(`WARNING: Only ${trulyNewFiles.length} truly new files available, requested ${targetNewDocs}`);
      }
    }

    if (filesToProcess.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No new files to process - all supported files are already indexed!',
        strategy: forceReindex ? 'force_reindex' : 'new_files_only',
        targetDocuments: targetNewDocs,
        totalFilesInDrive: allFiles.length,
        newFilesAvailable: 0,
        processedCount: 0,
        embeddingCount: 0,
        skippedCount: 0,
        errorCount: 0,
        processedFiles: [],
        totalIndexedFiles: indexedFileIds.size,
        embeddingModelAvailable,
      });
    }

    // Process the selected files
    let processedCount = 0;
    let errorCount = 0;
    let embeddingCount = 0;
    let actuallySkipped = 0;
    const processedFiles: string[] = [];

    for (let i = 0; i < filesToProcess.length; i++) {
      const file = filesToProcess[i];
      
      try {
        console.log(`\nProcessing ${i + 1}/${filesToProcess.length}: ${file.name}`);
        console.log(`  File ID: ${file.id}`);
        console.log(`  In database? ${indexedFileIds.has(file.id) ? 'YES' : 'NO'}`);

        // Update file record in documents table
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

        // Handle embeddings - Double check database again for safety
        const existingEmbeddingCheck = await prisma.documentEmbedding.findFirst({
          where: { 
            fileId: file.id,
            userId: user.id 
          },
          select: { id: true }
        });
        
        const hasExistingEmbedding = existingEmbeddingCheck !== null;
        console.log(`  Embedding check: ${hasExistingEmbedding ? 'HAS EXISTING' : 'NO EXISTING'}`);

        if (forceReindex && hasExistingEmbedding) {
          console.log(`  FORCE MODE: Deleting existing embeddings for ${file.name}`);
          await prisma.documentEmbedding.deleteMany({
            where: { fileId: file.id, userId: user.id }
          });
        }

        // Process embeddings
        if (!hasExistingEmbedding || forceReindex) {
          try {
            console.log(`  Creating embeddings for: ${file.name}`);
            const content = await driveService.getFileContent(file.id);
            
            if (content && content.trim().length > 50) {
              await VectorService.storeDocumentEmbeddings(
                user.id,
                file.id,
                file.name,
                content
              );
              embeddingCount++;
              processedFiles.push(file.name);
              console.log(`  SUCCESS: Embeddings created for ${file.name} (${content.length} chars)`);
            } else {
              console.log(`  SKIP: Insufficient content in ${file.name} (${content?.length || 0} chars)`);
              actuallySkipped++;
            }
          } catch (embeddingError) {
            console.error(`  ERROR: Failed to create embeddings for ${file.name}:`, embeddingError);
            actuallySkipped++;
          }
        } else {
          console.log(`  ERROR: File ${file.name} already has embeddings - this should not happen in NEW mode!`);
          actuallySkipped++;
        }

        processedCount++;
      } catch (error) {
        console.error(`ERROR processing file ${file.id}:`, error);
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

    // Get ACCURATE final count
    const finalIndexedCount = await prisma.documentEmbedding.findMany({
      where: { userId: user.id },
      select: { fileId: true },
      distinct: ['fileId']
    });

    const summary = {
      success: true,
      message: `Smart sync completed! Indexed ${embeddingCount} new documents.`,
      strategy: forceReindex ? 'force_reindex' : 'new_files_only',
      targetDocuments: targetNewDocs,
      totalFilesInDrive: allFiles.length,
      newFilesAvailable: allFiles.filter(f => !indexedFileIds.has(f.id) && shouldProcessFile(f.mimeType)).length,
      processedCount,
      embeddingCount,
      skippedCount: actuallySkipped,
      errorCount,
      processedFiles: processedFiles.slice(0, 10),
      totalIndexedFiles: finalIndexedCount.length,
      embeddingModelAvailable,
      debug: {
        pagesSearched: pagesFetched,
        processableFilesFound: newProcessableFilesFound,
        startingIndexedFiles: indexedFileIds.size,
        finalIndexedFiles: finalIndexedCount.length,
        selectedFilesWereNew: filesToProcess.every(f => !indexedFileIds.has(f.id)),
      }
    };

    console.log('FIXED sync completed:', summary);
    return NextResponse.json(summary);
  } catch (error) {
    console.error('ERROR in FIXED sync:', error);
    return NextResponse.json({ 
      error: 'Failed to sync Drive',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

function shouldProcessFile(mimeType: string): boolean {
  const supportedTypes = [
    'application/vnd.google-apps.document',
    'application/vnd.google-apps.spreadsheet', 
    'application/vnd.google-apps.presentation',
    'text/plain',
  ];
  
  return supportedTypes.includes(mimeType);
}