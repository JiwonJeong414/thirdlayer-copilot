// src/app/api/cleaner/scan/route.ts - NO DRIVE CALLS, DATABASE ONLY
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

    const { maxFiles = 50 } = await request.json();
    const { userId } = JSON.parse(session.value);
    
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { driveConnection: true },
    });

    if (!user || !user.driveConnection?.isConnected) {
      return NextResponse.json({ error: 'Drive not connected' }, { status: 400 });
    }

    console.log('🧹 Starting FAST database-only cleaner scan...');
    
    const cleanableFiles: CleanableFile[] = [];

    // Query 1: Small files (≤10KB to catch more files)
    console.log('📊 Scanning for small files...');
    const smallFiles = await prisma.document.findMany({
      where: {
        userId: user.id,
        size: {
          lte: 10240 // 10KB
        }
      },
      take: 20,
      orderBy: { size: 'asc' } // Smallest first
    });
    console.log(`   Found ${smallFiles.length} small files`);

    // Query 2: "Untitled" documents (likely drafts/test files)
    console.log('📊 Scanning for untitled files...');
    const untitledFiles = await prisma.document.findMany({
      where: {
        userId: user.id,
        name: {
          contains: 'Untitled',
          mode: 'insensitive'
        }
      },
      take: 15
    });
    console.log(`   Found ${untitledFiles.length} untitled files`);

    // Query 3: Test/temp files
    console.log('📊 Scanning for test/temp files...');
    const testFiles = await prisma.document.findMany({
      where: {
        userId: user.id,
        OR: [
          { name: { contains: 'test', mode: 'insensitive' } },
          { name: { contains: 'temp', mode: 'insensitive' } },
          { name: { contains: 'draft', mode: 'insensitive' } },
          { name: { startsWith: 'Copy of' } }
        ]
      },
      take: 15
    });
    console.log(`   Found ${testFiles.length} test/temp files`);

    // Query 4: Old small files (6+ months old and under 50KB)
    console.log('📊 Scanning for old files...');
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    
    const oldFiles = await prisma.document.findMany({
      where: {
        userId: user.id,
        modifiedTime: {
          lt: sixMonthsAgo
        },
        size: {
          lte: 51200 // 50KB
        }
      },
      take: 15,
      orderBy: { modifiedTime: 'asc' } // Oldest first
    });
    console.log(`   Found ${oldFiles.length} old files`);

    // Combine all files and remove duplicates
    const allFiles = [
      ...smallFiles.map(f => ({ ...f, source: 'small' })),
      ...untitledFiles.map(f => ({ ...f, source: 'untitled' })),
      ...testFiles.map(f => ({ ...f, source: 'test' })),
      ...oldFiles.map(f => ({ ...f, source: 'old' }))
    ];

    // Remove duplicates by driveId
    const uniqueFiles = allFiles.filter((file, index, self) => 
      index === self.findIndex(f => f.driveId === file.driveId)
    );

    console.log(`📊 Found ${uniqueFiles.length} unique files to analyze`);

    // Analyze each file
    for (const file of uniqueFiles) {
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

    console.log(`✅ Found ${cleanableFiles.length} cleanable files`);

    // Sort by confidence and size
    cleanableFiles.sort((a, b) => {
      const confidenceOrder = { high: 3, medium: 2, low: 1 };
      const aScore = confidenceOrder[a.confidence] * 1000 + a.size;
      const bScore = confidenceOrder[b.confidence] * 1000 + b.size;
      return bScore - aScore;
    });

    // Limit results
    const limitedFiles = cleanableFiles.slice(0, maxFiles);

    // Create suggestions
    const autoDelete = limitedFiles.filter(f => 
      f.confidence === 'high' && ['empty', 'system', 'tiny'].includes(f.category)
    );
    
    const review = limitedFiles.filter(f => !autoDelete.includes(f));

    return NextResponse.json({
      success: true,
      files: limitedFiles,
      batchSuggestion: {
        autoDelete,
        review,
        keep: [],
        summary: `Found ${limitedFiles.length} potentially cleanable files from your ${uniqueFiles.length} candidates. ${autoDelete.length} safe to auto-delete, ${review.length} need review.`
      },
      summary: {
        totalFound: limitedFiles.length,
        scanMethod: 'Database-only scan (no Drive API calls)',
        highConfidence: limitedFiles.filter(f => f.confidence === 'high').length,
        mediumConfidence: limitedFiles.filter(f => f.confidence === 'medium').length,
        lowConfidence: limitedFiles.filter(f => f.confidence === 'low').length,
        categories: {
          empty: limitedFiles.filter(f => f.category === 'empty').length,
          system: limitedFiles.filter(f => f.category === 'system').length,
          duplicate: limitedFiles.filter(f => f.category === 'duplicate').length,
          tiny: limitedFiles.filter(f => f.category === 'tiny').length,
          small: limitedFiles.filter(f => f.category === 'small').length,
          old: limitedFiles.filter(f => f.category === 'old').length,
        }
      }
    });

  } catch (error) {
    console.error('Error in database scan:', error);
    return NextResponse.json({ 
      error: 'Failed to scan database',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// Analysis function - looks for any patterns that might indicate cleanable files
function analyzeFile(file: any): {
  category: CleanableFile['category'];
  reason: string;
  confidence: 'low' | 'medium' | 'high';
  aiSummary: string;
} | null {
  const fileName = file.name || '';
  const fileSize = file.size || 0;

  // Tiny files (≤1KB)
  if (fileSize <= 1024) {
    return {
      category: 'tiny',
      reason: `Tiny file (${formatFileSize(fileSize)})`,
      confidence: 'high',
      aiSummary: 'This file is very small and might be incomplete or a test file.'
    };
  }

  // Small files (≤5KB)
  if (fileSize <= 5120) {
    return {
      category: 'small',
      reason: `Small file (${formatFileSize(fileSize)}) - worth reviewing`,
      confidence: 'medium',
      aiSummary: 'This small file might be a draft, test, or incomplete document.'
    };
  }

  // Untitled files
  if (fileName.toLowerCase().includes('untitled')) {
    return {
      category: 'small',
      reason: `Untitled document (${formatFileSize(fileSize)}) - likely test/draft`,
      confidence: 'medium',
      aiSummary: 'Untitled documents are often test files or incomplete drafts.'
    };
  }

  // Test/temp files
  if (isTestFile(fileName)) {
    return {
      category: 'small',
      reason: `Test/temporary file (${formatFileSize(fileSize)})`,
      confidence: 'medium',
      aiSummary: 'This appears to be a test or temporary file that might no longer be needed.'
    };
  }

  // Old files
  if (file.modifiedTime) {
    const ageInMonths = (Date.now() - new Date(file.modifiedTime).getTime()) / (1000 * 60 * 60 * 24 * 30);
    if (ageInMonths > 6 && fileSize <= 51200) { // 6+ months old and ≤50KB
      return {
        category: 'old',
        reason: `Old file (${Math.floor(ageInMonths)} months old, ${formatFileSize(fileSize)})`,
        confidence: 'low',
        aiSummary: 'This file hasn\'t been modified in a while and might no longer be relevant.'
      };
    }
  }

  return null;
}

function isTestFile(filename: string): boolean {
  const testPatterns = [
    /test/i, /temp/i, /draft/i, /^Copy of/i, /backup/i
  ];
  return testPatterns.some(pattern => pattern.test(filename));
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}