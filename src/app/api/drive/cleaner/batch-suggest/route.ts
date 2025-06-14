// src/app/api/drive/cleaner/batch-suggest/route.ts - FIXED
import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@/generated/prisma';
import { GoogleDriveService } from '@/lib/googleDrive';
import { DriveCleanerService } from '@/lib/driveCleanerService';

const prisma = new PrismaClient();

export async function POST(request: NextRequest) {
  try {
    const session = request.cookies.get('session');
    if (!session) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { userId } = JSON.parse(session.value);
    
    // FIXED: Get user with drive connection properly
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { driveConnection: true },
    });

    if (!user || !user.driveConnection?.isConnected) {
      return NextResponse.json({ error: 'Drive not connected' }, { status: 400 });
    }

    // FIXED: Check if we have valid credentials
    if (!user.driveConnection.accessToken) {
      return NextResponse.json({ error: 'Invalid Drive credentials' }, { status: 400 });
    }

    console.log('🧹 Starting batch cleaner scan...');

    // FIXED: Create DriveService with proper credentials
    const driveService = new GoogleDriveService({
      access_token: user.driveConnection.accessToken,
      refresh_token: user.driveConnection.refreshToken || undefined,
    });

    // FIXED: Create DriveCleanerService and scan for real files
    const cleanerService = new DriveCleanerService(driveService);
    
    const cleanableFiles = await cleanerService.scanForCleanableFiles(userId, {
      maxFiles: 100, // Scan up to 100 files
      includeContent: true,
      enableAI: true,
    });

    console.log(`✅ Found ${cleanableFiles.length} cleanable files`);

    // Group files by category
    const categories = cleanableFiles.reduce((acc: Record<string, { count: number; totalSize: number; files: any[] }>, file: any) => {
      const category = file.category || 'uncategorized';
      if (!acc[category]) {
        acc[category] = {
          count: 0,
          totalSize: 0,
          files: []
        };
      }
      acc[category].count++;
      acc[category].totalSize += file.size || 0;
      acc[category].files.push(file);
      return acc;
    }, {});

    const totalSize = cleanableFiles.reduce((sum: number, file: any) => {
      return sum + (file.size || 0);
    }, 0);

    // Get batch cleanup suggestions
    const batchSuggestion = await cleanerService.getBatchCleanupSuggestion(cleanableFiles);

    return NextResponse.json({
      success: true,
      totalFiles: cleanableFiles.length,
      totalSize,
      categories,
      suggestions: cleanableFiles.slice(0, 50), // Limit for performance
      batchSuggestion,
      summary: {
        autoDeleteCount: batchSuggestion.autoDelete.length,
        reviewCount: batchSuggestion.review.length,
        keepCount: batchSuggestion.keep.length,
      }
    });

  } catch (error) {
    console.error('Error in batch suggest:', error);
    return NextResponse.json({ 
      error: 'Failed to get suggestions',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}