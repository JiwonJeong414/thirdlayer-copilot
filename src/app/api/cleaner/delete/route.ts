// src/app/api/cleaner/delete/route.ts - FIXED with ownership check
import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@/generated/prisma';
import { DriveService } from '@/lib/DriveService';

const prisma = new PrismaClient();
const driveService = DriveService.getInstance();

export async function POST(request: NextRequest) {
  try {
    const session = request.cookies.get('session');
    if (!session) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { fileIds, dryRun = false } = await request.json();
    
    if (!fileIds || !Array.isArray(fileIds) || fileIds.length === 0) {
      return NextResponse.json({ error: 'No files specified for deletion' }, { status: 400 });
    }

    if (fileIds.length > 20) {
      return NextResponse.json({ 
        error: 'Too many files selected. Please delete in smaller batches (max 20).' 
      }, { status: 400 });
    }

    const { userId } = JSON.parse(session.value);
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { driveConnection: true },
    });

    if (!user || !user.driveConnection?.isConnected) {
      return NextResponse.json({ error: 'Drive not connected' }, { status: 400 });
    }

    console.log(`🗑️ ${dryRun ? 'DRY RUN:' : ''} Deleting ${fileIds.length} files for user ${userId}`);

    if (dryRun) {
      return NextResponse.json({
        success: true,
        dryRun: true,
        wouldDelete: fileIds.length,
        message: `Would delete ${fileIds.length} files. Use dryRun=false to actually delete.`
      });
    }

    // Authenticate the user with DriveService
    await driveService.authenticateUser(userId);

    let deletedCount = 0;
    let errorCount = 0;
    const errors: string[] = [];
    const deletedFiles: string[] = [];
    const skippedFiles: string[] = [];

    for (let i = 0; i < fileIds.length; i++) {
      const fileId = fileIds[i];
      
      try {
        // Check file ownership before deleting
        const fileInfo = await driveService.getFileInfo(fileId);

        // SAFETY CHECK: Only delete files owned by the user
        if (!fileInfo.ownedByMe) {
          console.log(`⚠️ SKIPPING: File not owned by user: ${fileInfo.name}`);
          skippedFiles.push(fileInfo.name || fileId);
          continue;
        }

        await driveService.deleteFile(fileId);
        
        deletedCount++;
        deletedFiles.push(fileInfo.name || fileId);
        
        console.log(`✅ Deleted (${i + 1}/${fileIds.length}): ${fileInfo.name} (${fileInfo.size} bytes)`);
        
        if (i < fileIds.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 200)); // Slower for safety
        }
        
      } catch (error) {
        errorCount++;
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        errors.push(`${fileId}: ${errorMsg}`);
        console.error(`❌ Failed to delete file ${fileId}:`, error);
        
        // If it's a permission error, mention it
        if (errorMsg.includes('write access') || errorMsg.includes('403')) {
          console.error(`🚫 Permission denied for file ${fileId} - likely not owned by user`);
        }
      }
    }

    try {
      await prisma.cleanupActivity.create({
        data: {
          userId: user.id,
          filesDeleted: deletedCount,
          filesRequested: fileIds.length,
          errors: errorCount,
          deletedFileNames: deletedFiles,
          timestamp: new Date(),
        },
      });
    } catch (dbError) {
      console.error('Failed to log cleanup activity:', dbError);
    }

    console.log(`🏁 Deletion complete: ${deletedCount} deleted, ${skippedFiles.length} skipped, ${errorCount} errors`);

    return NextResponse.json({
      success: true,
      deletedCount,
      errorCount,
      skippedCount: skippedFiles.length,
      totalRequested: fileIds.length,
      errors: errors.slice(0, 5),
      deletedFiles: deletedFiles.slice(0, 10),
      skippedFiles: skippedFiles.slice(0, 5),
      message: errorCount === 0 && skippedFiles.length === 0
        ? `Successfully deleted all ${deletedCount} files!`
        : `Deleted ${deletedCount} files. ${skippedFiles.length} skipped (not owned), ${errorCount} errors.`
    });

  } catch (error) {
    console.error('Error in delete operation:', error);
    return NextResponse.json({ 
      error: 'Failed to delete files',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 