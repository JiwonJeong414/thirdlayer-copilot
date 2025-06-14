import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@/generated/prisma';
import { GoogleDriveService, DriveConnection } from '@/lib/googleDrive';
import { DriveCleanerService, CleanableFile } from '@/lib/driveCleaner';

const prisma = new PrismaClient();
const driveService = new GoogleDriveService();
const cleanerService = new DriveCleanerService();

export async function POST(request: NextRequest) {
  try {
    const session = request.cookies.get('session');
    if (!session) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { userId } = JSON.parse(session.value);
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { driveConnection: true },
    });

    if (!user || !user.driveConnection?.isConnected) {
      return NextResponse.json({ error: 'Drive not connected' }, { status: 400 });
    }

    const files = await driveService.listFiles(user.driveConnection as DriveConnection);
    const suggestions = await cleanerService.analyzeFiles(files);

    const categories = suggestions.reduce((acc: Record<string, { count: number; totalSize: number; files: CleanableFile[] }>, file: CleanableFile) => {
      const category = file.category || 'uncategorized';
      if (!acc[category]) {
        acc[category] = {
          count: 0,
          totalSize: 0,
          files: []
        };
      }
      acc[category].count++;
      acc[category].totalSize += typeof file.size === 'string' ? parseInt(file.size) : 0;
      acc[category].files.push(file);
      return acc;
    }, {});

    const totalSize = suggestions.reduce((sum: number, file: CleanableFile) => {
      return sum + (typeof file.size === 'string' ? parseInt(file.size) : 0);
    }, 0);

    return NextResponse.json({
      success: true,
      totalFiles: suggestions.length,
      totalSize,
      categories,
      suggestions: suggestions.slice(0, 100) // Limit initial suggestions
    });

  } catch (error) {
    console.error('Error in batch suggest:', error);
    return NextResponse.json({ 
      error: 'Failed to get suggestions',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 