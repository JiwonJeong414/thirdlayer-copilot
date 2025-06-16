// src/app/api/cleaner/delete/route.ts - FIXED VERSION
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
    const { userId } = JSON.parse(session.value);

    if (!Array.isArray(fileIds) || fileIds.length === 0) {
      return NextResponse.json({ error: 'No file IDs provided' }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { driveConnection: true },
    });

    if (!user || !user.driveConnection?.isConnected) {
      return NextResponse.json({
        error: 'Drive not connected'
      }, { status: 400 });
    }

    // Authenticate the user with DriveService
    await driveService.authenticateUser(userId);

    let deletedCount = 0;
    let errorCount = 0;
    const deletedFiles: string[] = [];
    const skippedFiles: string[] = [];
    const errorFiles: string[] = [];

    console.log(`🗑️ ${dryRun ? 'DRY RUN: Would delete' : 'Deleting'} ${fileIds.length} files...`);

    for (let i = 0; i < fileIds.length; i++) {
      const fileId = fileIds[i];
      
      try {
        let fileName = `File ${fileId}`;
        let shouldDelete = true;

        try {
          // Try to get file info
          const fileInfo = await driveService.getFileInfo(fileId);
          fileName = fileInfo.name;

          // SAFETY CHECK: Only delete files owned by the user
          if (!fileInfo.ownedByMe) {
            console.log(`⚠️ SKIPPING: File not owned by user: ${fileName}`);
            skippedFiles.push(fileName);
            shouldDelete = false;
          }
        } catch (infoError: any) {
          // File doesn't exist in Drive anymore
          if (infoError.code === 404 || infoError.status === 404 || infoError.message?.includes('File not found')) {
            console.log(`ℹ️ File already deleted from Drive: ${fileId}`);
            fileName = `${fileId} (already deleted)`;
            shouldDelete = false; // Don't try to delete again
            deletedCount++; // Count as successful
            deletedFiles.push(fileName);
          } else {
            throw infoError; // Re-throw other errors
          }
        }

        if (shouldDelete && !dryRun) {
          await driveService.deleteFile(fileId);
          deletedCount++;
          deletedFiles.push(fileName);
          console.log(`✅ Deleted (${i + 1}/${fileIds.length}): ${fileName}`);
        }

        // Clean up database reference regardless
        await prisma.document.deleteMany({
          where: { 
            driveId: fileId,
            userId: user.id 
          }
        });

        // Add small delay for API rate limiting
        if (i < fileIds.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 200));
        }
        
      } catch (error: any) {
        console.error(`❌ Failed to delete ${fileId}:`, error.message);
        errorCount++;
        errorFiles.push(fileId);
      }
    }

    // Log cleanup activity
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
      deleted: deletedCount,
      skipped: skippedFiles.length,
      errors: errorCount,
      details: {
        deletedFiles,
        skippedFiles,
        errorFiles
      }
    });

  } catch (error) {
    console.error('Error in delete operation:', error);
    return NextResponse.json({ 
      error: 'Failed to delete files',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}