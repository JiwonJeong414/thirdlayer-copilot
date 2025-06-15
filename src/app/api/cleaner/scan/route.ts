// src/app/api/cleaner/scan/route.ts - SIMPLE WORKING VERSION
import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@/generated/prisma';

const prisma = new PrismaClient();

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

    console.log('🧹 Starting simple Drive cleaner scan from database...');
    
    const cleanableFiles: CleanableFile[] = [];

    // Query 1: Empty and very small files
    const tinyFiles = await prisma.document.findMany({
      where: {
        userId: user.id,
        size: {
          lte: 2048 // 2KB or smaller
        }
      },
      take: 15
    });

    // Query 2: Duplicates based on common patterns
    const duplicateFiles = await prisma.document.findMany({
      where: {
        userId: user.id,
        name: {
          contains: 'copy',
          mode: 'insensitive'
        }
      },
      take: 10
    });

    // Query 3: System and junk files
    const systemFiles = await prisma.document.findMany({
      where: {
        userId: user.id,
        name: {
          in: ['.DS_Store', 'Thumbs.db', 'desktop.ini']
        }
      },
      take: 10
    });

    // Query 4: Very old small files
    const oldFiles = await prisma.document.findMany({
      where: {
        userId: user.id,
        modifiedTime: {
          lt: new Date('2022-01-01')
        },
        size: {
          lte: 10240 // 10KB
        }
      },
      take: 10
    });

    // Process tiny files
    for (const file of tinyFiles) {
      const analysis = analyzeFile(file);
      if (analysis) {
        cleanableFiles.push({
          id: file.driveId,
          name: file.name,
          mimeType: file.mimeType,
          size: file.size || 0,
          modifiedTime: file.modifiedTime.toISOString(),
          webViewLink: file.webViewLink || undefined,
          selected: false,
          ...analysis
        });
      }
    }

    // Process duplicate files
    for (const file of duplicateFiles) {
      const analysis = analyzeFile(file);
      if (analysis) {
        cleanableFiles.push({
          id: file.driveId,
          name: file.name,
          mimeType: file.mimeType,
          size: file.size || 0,
          modifiedTime: file.modifiedTime.toISOString(),
          webViewLink: file.webViewLink || undefined,
          selected: false,
          ...analysis
        });
      }
    }

    // Process system files
    for (const file of systemFiles) {
      const analysis = analyzeFile(file);
      if (analysis) {
        cleanableFiles.push({
          id: file.driveId,
          name: file.name,
          mimeType: file.mimeType,
          size: file.size || 0,
          modifiedTime: file.modifiedTime.toISOString(),
          webViewLink: file.webViewLink || undefined,
          selected: false,
          ...analysis
        });
      }
    }

    // Process old files
    for (const file of oldFiles) {
      const analysis = analyzeFile(file);
      if (analysis) {
        cleanableFiles.push({
          id: file.driveId,
          name: file.name,
          mimeType: file.mimeType,
          size: file.size || 0,
          modifiedTime: file.modifiedTime.toISOString(),
          webViewLink: file.webViewLink || undefined,
          selected: false,
          ...analysis
        });
      }
    }

    console.log(`✅ Database scan complete: Found ${cleanableFiles.length} cleanable files`);

    // Sort by confidence and category importance
    cleanableFiles.sort((a, b) => {
      const confidenceOrder = { high: 3, medium: 2, low: 1 };
      const categoryOrder = { empty: 5, system: 4, duplicate: 3, tiny: 2, small: 1, old: 1 };
      
      const aScore = confidenceOrder[a.confidence] * 10 + categoryOrder[a.category];
      const bScore = confidenceOrder[b.confidence] * 10 + categoryOrder[b.category];
      
      return bScore - aScore;
    });

    // Create batch suggestions
    const autoDelete = cleanableFiles.filter(f => 
      f.confidence === 'high' && ['empty', 'system'].includes(f.category)
    );
    
    const review = cleanableFiles.filter(f => !autoDelete.includes(f));

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
        scanMethod: 'Database queries',
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
        }
      }
    });

  } catch (error) {
    console.error('Error in database cleanup scan:', error);
    return NextResponse.json({ 
      error: 'Failed to scan database',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// Simple file analysis function
function analyzeFile(file: any): {
  category: CleanableFile['category'];
  reason: string;
  confidence: 'low' | 'medium' | 'high';
  aiSummary: string;
} | null {
  const fileName = file.name || '';
  const fileSize = file.size || 0;

  // Empty files
  if (fileSize === 0) {
    return {
      category: 'empty',
      reason: 'Empty file (0 bytes)',
      confidence: 'high',
      aiSummary: 'This file is completely empty and can be safely deleted.'
    };
  }

  // Nearly empty files
  if (fileSize <= 100) {
    return {
      category: 'empty',
      reason: `Nearly empty file (${formatFileSize(fileSize)})`,
      confidence: 'high',
      aiSummary: 'This file is nearly empty with minimal content.'
    };
  }

  // System files
  if (isSystemFile(fileName)) {
    return {
      category: 'system',
      reason: 'System/junk file',
      confidence: 'high',
      aiSummary: 'This is a system-generated file that can be safely removed.'
    };
  }

  // Duplicates
  if (isPotentialDuplicate(fileName)) {
    return {
      category: 'duplicate',
      reason: `Potential duplicate file (${formatFileSize(fileSize)})`,
      confidence: 'medium',
      aiSummary: 'This appears to be a duplicate based on the filename pattern.'
    };
  }

  // Very small files
  if (fileSize <= 2048) { // 2KB
    return {
      category: 'tiny',
      reason: `Very small file (${formatFileSize(fileSize)})`,
      confidence: 'medium',
      aiSummary: 'This is a very small file that might be incomplete or corrupted.'
    };
  }

  // Old files
  if (file.modifiedTime && isVeryOld(file.modifiedTime) && fileSize <= 10240) { // Old files under 10KB
    const ageYears = Math.floor((Date.now() - new Date(file.modifiedTime).getTime()) / (365 * 24 * 60 * 60 * 1000));
    return {
      category: 'old',
      reason: `Old small file (${ageYears} years old, ${formatFileSize(fileSize)})`,
      confidence: 'low',
      aiSummary: 'This is an old small file that might no longer be relevant.'
    };
  }

  // Small files with certain patterns
  if (fileSize <= 10240 && hasSuspiciousPattern(fileName)) { // 10KB
    return {
      category: 'small',
      reason: `Small file with suspicious name (${formatFileSize(fileSize)})`,
      confidence: 'low',
      aiSummary: 'This small file has characteristics that suggest it might be cleanable.'
    };
  }

  // File doesn't meet cleanable criteria
  return null;
}

// Helper functions
function isSystemFile(filename: string): boolean {
  const systemFiles = ['.DS_Store', 'Thumbs.db', 'desktop.ini', '.directory', 'Icon\r'];
  const systemPatterns = [/^\._.+/, /^~\$.*/, /^\._/, /\.tmp$/i, /\.temp$/i];
  
  return systemFiles.includes(filename) || systemPatterns.some(pattern => pattern.test(filename));
}

function isPotentialDuplicate(filename: string): boolean {
  const duplicatePatterns = [
    / - Copy/i, / \(\d+\)$/, /_copy/i, /_backup$/i, /^Copy of /i,
    / backup$/i, / old$/i, /backup\d*\./i, /old\d*\./i, / - version/i
  ];
  
  return duplicatePatterns.some(pattern => pattern.test(filename));
}

function isVeryOld(modifiedTime: string): boolean {
  const modifiedDate = new Date(modifiedTime);
  const ageInYears = (Date.now() - modifiedDate.getTime()) / (1000 * 60 * 60 * 24 * 365);
  return ageInYears > 2; // More than 2 years old
}

function hasSuspiciousPattern(filename: string): boolean {
  const suspiciousPatterns = [
    /temp/i, /test/i, /draft/i, /bak$/i, /\.old$/i
  ];
  
  return suspiciousPatterns.some(pattern => pattern.test(filename));
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
} 