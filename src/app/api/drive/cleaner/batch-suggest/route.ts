// src/app/api/drive/cleaner/batch-suggest/route.ts - SIMPLE WORKING VERSION
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

    console.log('🧹 Starting simple batch cleaner scan...');

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
    
    const cleanableFiles: any[] = [];

    // SIMPLE: Just run a few targeted queries for different types of cleanable files
    const queries = [
      // Empty and very small files
      {
        query: `trashed=false and "me" in owners and size <= 1024`,
        description: 'Empty/tiny files (≤1KB)',
        category: 'empty'
      },
      // Duplicates
      {
        query: `trashed=false and "me" in owners and (name contains "copy" or name contains "Copy" or name contains "(1)" or name contains "backup")`,
        description: 'Potential duplicates',
        category: 'duplicate'
      },
      // System files
      {
        query: `trashed=false and "me" in owners and (name = ".DS_Store" or name = "Thumbs.db" or name = "desktop.ini")`,
        description: 'System files',
        category: 'system'
      },
      // Old small files
      {
        query: `trashed=false and "me" in owners and modifiedTime < "2022-01-01T00:00:00Z" and size <= 5120`,
        description: 'Old small files',
        category: 'old'
      }
    ];

    for (const { query, description, category } of queries) {
      try {
        console.log(`🔍 ${description}...`);
        
        const response = await drive.files.list({
          pageSize: 20, // Keep it small for speed
          fields: 'files(id, name, mimeType, size, modifiedTime, webViewLink, ownedByMe)',
          q: query,
        });

        const files = response.data.files || [];
        console.log(`   Found ${files.length} files`);

        for (const file of files) {
          if (!file.id || !file.ownedByMe) continue;
          
          const fileSize = file.size ? parseInt(file.size) : 0;
          
          // Skip folders and very large files
          if (file.mimeType === 'application/vnd.google-apps.folder' || fileSize > 10 * 1024 * 1024) {
            continue;
          }

          // Simple categorization
          let reason = '';
          let confidence = 'medium';
          let aiSummary = '';

          if (category === 'empty') {
            if (fileSize === 0) {
              reason = 'Empty file (0 bytes)';
              confidence = 'high';
              aiSummary = 'This file is completely empty and can be safely deleted.';
            } else {
              reason = `Very small file (${formatFileSize(fileSize)})`;
              confidence = 'medium';
              aiSummary = 'This file is very small and might be incomplete or corrupted.';
            }
          } else if (category === 'duplicate') {
            reason = `Potential duplicate file (${formatFileSize(fileSize)})`;
            confidence = 'medium';
            aiSummary = 'This appears to be a duplicate based on the filename pattern.';
          } else if (category === 'system') {
            reason = 'System/junk file';
            confidence = 'high';
            aiSummary = 'This is a system-generated file that can be safely removed.';
          } else if (category === 'old') {
            const ageYears = Math.floor((Date.now() - new Date(file.modifiedTime || '').getTime()) / (365 * 24 * 60 * 60 * 1000));
            reason = `Old small file (${ageYears} years old, ${formatFileSize(fileSize)})`;
            confidence = 'low';
            aiSummary = 'This is an old small file that might no longer be relevant.';
          }

          cleanableFiles.push({
            id: file.id,
            name: file.name,
            mimeType: file.mimeType,
            size: fileSize,
            modifiedTime: file.modifiedTime || new Date().toISOString(),
            webViewLink: file.webViewLink,
            category,
            reason,
            confidence,
            aiSummary,
            selected: false,
          });
        }
        
      } catch (queryError) {
        console.error(`❌ Error in query for ${description}:`, queryError);
        continue;
      }

      // Stop if we have enough files
      if (cleanableFiles.length >= 50) {
        console.log('🛑 Found enough files for batch processing');
        break;
      }
    }

    console.log(`✅ Simple batch scan complete: ${cleanableFiles.length} files found`);

    // Group files by category for the response
    const categories = cleanableFiles.reduce((acc: Record<string, any>, file: any) => {
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

    // Create simple batch suggestions
    const autoDelete = cleanableFiles.filter((f: any) => 
      f.confidence === 'high' && ['empty', 'system'].includes(f.category)
    );
    
    const review = cleanableFiles.filter((f: any) => !autoDelete.includes(f));

    const batchSuggestion = {
      autoDelete: autoDelete.slice(0, 20), // Limit auto-delete suggestions
      review: review.slice(0, 30), // Limit review suggestions  
      keep: [],
      summary: `Found ${cleanableFiles.length} cleanable files. ${autoDelete.length} can be safely auto-deleted, ${review.length} need review.`,
    };

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
        keepCount: 0,
        scanMethod: 'Simple Google Drive queries',
        totalScanned: `Found ${cleanableFiles.length} cleanable files across ${Object.keys(categories).length} categories`
      }
    });

  } catch (error) {
    console.error('Error in simple batch suggest:', error);
    return NextResponse.json({ 
      error: 'Failed to get suggestions',
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