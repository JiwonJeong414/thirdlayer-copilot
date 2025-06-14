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

    const { maxFiles = 50, includeContent = true, enableAI = true } = await request.json();
    const { userId } = JSON.parse(session.value);

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { driveConnection: true },
    });

    if (!user || !user.driveConnection?.isConnected) {
      return NextResponse.json({ error: 'Drive not connected' }, { status: 400 });
    }

    console.log(`🧹 Starting AI-powered cleaner scan for user ${userId}`);
    console.log(`Settings: maxFiles=${maxFiles}, includeContent=${includeContent}, enableAI=${enableAI}`);

    const driveService = new GoogleDriveService({
      access_token: user.driveConnection.accessToken,
      refresh_token: user.driveConnection.refreshToken || undefined,
    });

    const cleanerService = new DriveCleanerService(driveService);

    const cleanableFiles = await cleanerService.scanForCleanableFiles(userId, {
      maxFiles,
      includeContent,
      enableAI,
    });

    const batchSuggestion = await cleanerService.getBatchCleanupSuggestion(cleanableFiles);

    console.log(`✅ Cleaner scan complete: Found ${cleanableFiles.length} cleanable files`);
    console.log(`Batch suggestion: ${batchSuggestion.autoDelete.length} auto-delete, ${batchSuggestion.review.length} review`);

    return NextResponse.json({
      success: true,
      files: cleanableFiles,
      batchSuggestion,
      summary: {
        totalFound: cleanableFiles.length,
        highConfidence: cleanableFiles.filter(f => f.confidence === 'high').length,
        mediumConfidence: cleanableFiles.filter(f => f.confidence === 'medium').length,
        lowConfidence: cleanableFiles.filter(f => f.confidence === 'low').length,
        categories: {
          empty: cleanableFiles.filter(f => f.category === 'empty').length,
          system: cleanableFiles.filter(f => f.category === 'system').length,
          duplicates: cleanableFiles.filter(f => f.category === 'duplicate').length,
          tiny: cleanableFiles.filter(f => f.category === 'tiny').length,
          small: cleanableFiles.filter(f => f.category === 'small').length,
          old: cleanableFiles.filter(f => f.category === 'old').length,
          lowQuality: cleanableFiles.filter(f => f.category === 'low_quality').length,
        },
        aiAnalyzed: cleanableFiles.filter(f => f.aiSummary).length,
      }
    });

  } catch (error) {
    console.error('Error in AI cleaner scan:', error);
    return NextResponse.json({ 
      error: 'Failed to scan drive for cleanup',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
