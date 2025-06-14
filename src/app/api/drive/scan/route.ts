// src/app/api/drive/cleaner/scan/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@/generated/prisma';
import { GoogleDriveService } from '@/lib/googleDrive';

const prisma = new PrismaClient();

// File size thresholds (in bytes)
const EMPTY_FILE_THRESHOLD = 50; // 50 bytes or less
const TINY_FILE_THRESHOLD = 2048; // 2KB or less
const SMALL_FILE_THRESHOLD = 10240; // 10KB or less

interface SmallFile {
  id: string;
  name: string;
  mimeType: string;
  size: number;
  modifiedTime: string;
  webViewLink?: string;
  selected: boolean;
  category: 'tiny' | 'small' | 'empty' | 'duplicate';
  reason: string;
}

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

    const driveService = new GoogleDriveService({
      access_token: user.driveConnection.accessToken,
      refresh_token: user.driveConnection.refreshToken || undefined,
    });

    console.log('🧹 Starting Drive cleaner scan...');
    
    const smallFiles: SmallFile[] = [];
    let nextPageToken: string | undefined;
    let totalScanned = 0;

    // Scan files in batches
    do {
      const response = await driveService.listFiles(100, nextPageToken);
      const files = response.files;
      totalScanned += files.length;

      console.log(`Scanned ${totalScanned} files so far...`);

      for (const file of files) {
        const fileSize = file.size ? parseInt(file.size) : 0;
        
        // Skip folders
        if (file.mimeType === 'application/vnd.google-apps.folder') {
          continue;
        }

        let category: 'tiny' | 'small' | 'empty' | 'duplicate' | null = null;
        let reason = '';

        // Categorize files based on size and characteristics
        if (fileSize === 0) {
          category = 'empty';
          reason = 'Empty file (0 bytes)';
        } else if (fileSize <= EMPTY_FILE_THRESHOLD) {
          category = 'empty';
          reason = `Nearly empty file (${fileSize} bytes)`;
        } else if (fileSize <= TINY_FILE_THRESHOLD) {
          category = 'tiny';
          reason = `Very small file (${formatFileSize(fileSize)})`;
          
          // Special cases for tiny files
          if (file.name === '.DS_Store' || file.name.startsWith('._')) {
            reason = 'System file (can be safely deleted)';
          } else if (file.name.includes('thumb') || file.name.includes('cache')) {
            reason = 'Thumbnail or cache file';
          }
        } else if (fileSize <= SMALL_FILE_THRESHOLD) {
          category = 'small';
          reason = `Suspiciously small file (${formatFileSize(fileSize)})`;
          
          // Special cases for small files
          if (file.mimeType.includes('zip') || file.mimeType.includes('archive')) {
            reason = 'Small archive file (possibly empty)';
          } else if (file.mimeType.includes('document') || file.mimeType.includes('presentation')) {
            reason = 'Small document (possibly template or empty)';
          }
        }

        // Check for potential duplicates (simple name-based detection)
        if (file.name.includes(' - Copy') || file.name.includes(' (1)') || file.name.includes('_copy')) {
          category = 'duplicate';
          reason = 'Potential duplicate file';
        }

        // Add to small files if it matches our criteria
        if (category) {
          smallFiles.push({
            id: file.id,
            name: file.name,
            mimeType: file.mimeType,
            size: fileSize,
            modifiedTime: file.modifiedTime,
            webViewLink: file.webViewLink,
            selected: false,
            category,
            reason,
          });
        }
      }

      nextPageToken = response.nextPageToken;
      
      // Limit scan to prevent timeout (adjust as needed)
      if (totalScanned >= 1000) {
        console.log('🛑 Stopping scan at 1000 files to prevent timeout');
        break;
      }
      
    } while (nextPageToken);

    console.log(`✅ Scan complete: Found ${smallFiles.length} cleanable files out of ${totalScanned} total files`);

    // Sort by size (largest first) for better UX
    smallFiles.sort((a, b) => b.size - a.size);

    return NextResponse.json({
      success: true,
      files: smallFiles,
      totalScanned,
      summary: {
        emptyFiles: smallFiles.filter(f => f.category === 'empty').length,
        tinyFiles: smallFiles.filter(f => f.category === 'tiny').length,
        smallFiles: smallFiles.filter(f => f.category === 'small').length,
        duplicateFiles: smallFiles.filter(f => f.category === 'duplicate').length,
      }
    });

  } catch (error) {
    console.error('Error scanning drive for cleanup:', error);
    return NextResponse.json({ 
      error: 'Failed to scan drive',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}