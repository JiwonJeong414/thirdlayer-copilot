// src/app/api/drive/cleaner/delete/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@/generated/prisma';
import { GoogleDriveService } from '@/lib/googleDrive';
import { google } from 'googleapis';

const prisma = new PrismaClient();

export async function POST(request: NextRequest) {
  try {
    const session = request.cookies.get('session');
    if (!session) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { fileIds } = await request.json();
    
    if (!fileIds || !Array.isArray(fileIds) || fileIds.length === 0) {
      return NextResponse.json({ error: 'No files specified for deletion' }, { status: 400 });
    }

    const { userId } = JSON.parse(session.value);
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { driveConnection: true },
    });

    if (!user || !user.driveConnection?.isConnected) {
      return NextResponse.json({ error: 'Drive not connected' }, { status: 400 });
    }

    // Create OAuth client for deletion
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

    console.log(`🗑️ Starting deletion of ${fileIds.length} files...`);

    let deletedCount = 0;
    let errorCount = 0;
    const errors: string[] = [];

    // Delete files one by one (could be optimized with batch requests)
    for (let i = 0; i < fileIds.length; i++) {
      const fileId = fileIds[i];
      
      try {
        await drive.files.delete({
          fileId: fileId,
        });
        deletedCount++;
        console.log(`✅ Deleted file ${i + 1}/${fileIds.length}: ${fileId}`);
      } catch (error) {
        errorCount++;
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        errors.push(`File ${fileId}: ${errorMsg}`);
        console.error(`❌ Failed to delete file ${fileId}:`, error);
      }
    }

    console.log(`🏁 Deletion complete: ${deletedCount} deleted, ${errorCount} errors`);

    return NextResponse.json({
      success: true,
      deletedCount,
      errorCount,
      errors: errors.slice(0, 10), // Limit error list
      message: `Successfully deleted ${deletedCount} out of ${fileIds.length} files${errorCount > 0 ? ` (${errorCount} errors)` : ''}`
    });

  } catch (error) {
    console.error('Error deleting files:', error);
    return NextResponse.json({ 
      error: 'Failed to delete files',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}