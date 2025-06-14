// src/app/api/drive/cleaner/delete/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@/generated/prisma';
import { google } from 'googleapis';

const prisma = new PrismaClient();

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

    if (fileIds.length > 100) {
      return NextResponse.json({ 
        error: 'Too many files selected. Please delete in smaller batches (max 100).' 
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

    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    );

    oauth2Client.setCredentials({
      access_token: user.driveConnection.accessToken,
      refresh_token: user.driveConnection.refreshToken,
    });

    const drive = google.drive({ version: 'v3', auth: oauth2Client });

    let deletedCount = 0;
    let errorCount = 0;
    const errors: string[] = [];
    const deletedFiles: string[] = [];

    for (let i = 0; i < fileIds.length; i++) {
      const fileId = fileIds[i];
      
      try {
        const fileInfo = await drive.files.get({
          fileId,
          fields: 'name, size, mimeType'
        });

        await drive.files.delete({ fileId });
        
        deletedCount++;
        deletedFiles.push(fileInfo.data.name || fileId);
        
        console.log(`✅ Deleted (${i + 1}/${fileIds.length}): ${fileInfo.data.name} (${fileInfo.data.size} bytes)`);
        
        if (i < fileIds.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
        
      } catch (error) {
        errorCount++;
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        errors.push(`${fileId}: ${errorMsg}`);
        console.error(`❌ Failed to delete file ${fileId}:`, error);
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

    console.log(`🏁 Deletion complete: ${deletedCount} deleted, ${errorCount} errors`);

    return NextResponse.json({
      success: true,
      deletedCount,
      errorCount,
      totalRequested: fileIds.length,
      errors: errors.slice(0, 10),
      deletedFiles: deletedFiles.slice(0, 10),
      message: errorCount === 0 
        ? `Successfully deleted all ${deletedCount} files!`
        : `Deleted ${deletedCount} out of ${fileIds.length} files (${errorCount} errors)`
    });

  } catch (error) {
    console.error('Error in file deletion:', error);
    return NextResponse.json({ 
      error: 'Failed to delete files',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}