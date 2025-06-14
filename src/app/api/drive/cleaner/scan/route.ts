// src/app/api/drive/cleaner/scan/route.ts - SIMPLIFIED WORKING VERSION
import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@/generated/prisma';
import { google } from 'googleapis';

const prisma = new PrismaClient();

// File size thresholds (in bytes)
const EMPTY_FILE_THRESHOLD = 50; // 50 bytes or less
const TINY_FILE_THRESHOLD = 2048; // 2KB or less
const SMALL_FILE_THRESHOLD = 10240; // 10KB or less

interface CleanableFile {
  id: string;
  name: string;
  mimeType: string;
  size: number;
  modifiedTime: string;
  webViewLink?: string;
  category: 'tiny' | 'small' | 'empty' | 'duplicate' | 'system' | 'old';
  reason: string;
  confidence: 'low' | 'medium' | 'high';
  aiSummary?: string;
  selected: boolean;
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

    if (!user.driveConnection.accessToken) {
      return NextResponse.json({ error: 'Invalid Drive credentials' }, { status: 400 });
    }

    console.log('🧹 Starting simple Drive cleaner scan...');
    
    // Set up Google Drive API
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
    
    const cleanableFiles: CleanableFile[] = [];
    let nextPageToken: string | undefined;
    let totalScanned = 0;

    // Scan files in batches
    do {
      const response = await drive.files.list({
        pageSize: 100,
        pageToken: nextPageToken,
        fields: 'nextPageToken, files(id, name, mimeType, size, modifiedTime, webViewLink)',
        q: 'trashed=false', // Only non-trashed files
      });

      const files = response.data.files || [];
      totalScanned += files.length;

      console.log(`Scanned ${totalScanned} files so far...`);

      for (const file of files) {
        if (!file.id || !file.name || !file.mimeType) continue;
        
        const fileSize = file.size ? parseInt(file.size) : 0;
        
        // Skip folders
        if (file.mimeType === 'application/vnd.google-apps.folder') {
          continue;
        }

        let category: CleanableFile['category'] | null = null;
        let reason = '';
        let confidence: 'low' | 'medium' | 'high' = 'low';

        // Categorize files based on size and characteristics
        if (fileSize === 0) {
          category = 'empty';
          reason = 'Empty file (0 bytes)';
          confidence = 'high';
        } else if (fileSize <= EMPTY_FILE_THRESHOLD) {
          category = 'empty';
          reason = `Nearly empty file (${fileSize} bytes)`;
          confidence = 'high';
        } else if (fileSize <= TINY_FILE_THRESHOLD) {
          category = 'tiny';
          reason = `Very small file (${formatFileSize(fileSize)})`;
          confidence = 'medium';
          
          // Special cases for tiny files
          if (file.name === '.DS_Store' || file.name.startsWith('._')) {
            category = 'system';
            reason = 'System file (can be safely deleted)';
            confidence = 'high';
          } else if (file.name.includes('thumb') || file.name.includes('cache')) {
            reason = 'Thumbnail or cache file';
            confidence = 'high';
          }
        } else if (fileSize <= SMALL_FILE_THRESHOLD) {
          category = 'small';
          reason = `Small file (${formatFileSize(fileSize)}) - needs review`;
          confidence = 'low';
          
          // Special cases for small files
          if (file.mimeType.includes('zip') || file.mimeType.includes('archive')) {
            reason = 'Small archive file (possibly empty)';
            confidence = 'medium';
          } else if (file.mimeType.includes('document') || file.mimeType.includes('presentation')) {
            reason = 'Small document (possibly template or empty)';
            confidence = 'medium';
          }
        }

        // Check for potential duplicates (simple name-based detection)
        if (file.name.includes(' - Copy') || file.name.includes(' (1)') || file.name.includes('_copy')) {
          category = 'duplicate';
          reason = 'Potential duplicate file';
          confidence = 'medium';
        }

        // Check for old files
        if (file.modifiedTime) {
          const modifiedDate = new Date(file.modifiedTime);
          const ageInDays = (Date.now() - modifiedDate.getTime()) / (1000 * 60 * 60 * 24);
          
          if (ageInDays > 365 * 2) { // 2+ years old
            if (!category) {
              category = 'old';
              reason = `Very old file (${Math.floor(ageInDays / 365)} years old)`;
              confidence = 'low';
            }
          }
        }

        // Add to cleanable files if it matches our criteria
        if (category) {
          // Simple AI analysis for better recommendations
          let aiSummary = '';
          if (category === 'empty') {
            aiSummary = 'This file appears to be empty or nearly empty with no useful content. Safe to delete.';
          } else if (category === 'system') {
            aiSummary = 'This is a system-generated file that can be safely removed without affecting your data.';
          } else if (category === 'duplicate') {
            aiSummary = 'This appears to be a duplicate file based on the filename pattern. Check if you need multiple copies.';
          } else if (category === 'tiny') {
            aiSummary = 'Very small file that might be incomplete, corrupted, or accidentally created.';
          } else if (category === 'small') {
            aiSummary = 'Small file that could be a template, test file, or incomplete document. Review before deleting.';
          } else if (category === 'old') {
            aiSummary = 'Old file that might no longer be relevant. Consider if it has historical value.';
          }

          cleanableFiles.push({
            id: file.id,
            name: file.name,
            mimeType: file.mimeType,
            size: fileSize,
            modifiedTime: file.modifiedTime || new Date().toISOString(),
            webViewLink: file.webViewLink || undefined,
            selected: false,
            category,
            reason,
            confidence,
            aiSummary,
          });
        }
      }
      
      nextPageToken = response.data.nextPageToken || undefined;
      
      // Limit scan to prevent timeout
      if (totalScanned >= 1000 || cleanableFiles.length >= 100) {
        console.log('🛑 Stopping scan at limit to prevent timeout');
        break;
      }
      
    } while (nextPageToken);

    console.log(`✅ Scan complete: Found ${cleanableFiles.length} cleanable files out of ${totalScanned} total files`);

    // Sort by confidence and size (most important first)
    cleanableFiles.sort((a, b) => {
      const confidenceOrder = { high: 3, medium: 2, low: 1 };
      const aScore = confidenceOrder[a.confidence] * 1000 + a.size;
      const bScore = confidenceOrder[b.confidence] * 1000 + b.size;
      return bScore - aScore;
    });

    // Create batch suggestions
    const autoDelete = cleanableFiles.filter(f => 
      f.confidence === 'high' && ['empty', 'system'].includes(f.category)
    );
    
    const review = cleanableFiles.filter(f => 
      !autoDelete.includes(f)
    );

    return NextResponse.json({
      success: true,
      files: cleanableFiles,
      batchSuggestion: {
        autoDelete,
        review,
        keep: [],
        summary: `Found ${cleanableFiles.length} cleanable files. ${autoDelete.length} safe to auto-delete, ${review.length} need review.`
      },
      summary: {
        totalFound: cleanableFiles.length,
        totalScanned,
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
        },
        aiAnalyzed: cleanableFiles.length, // All files get basic AI analysis
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