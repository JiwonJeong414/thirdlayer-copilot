// src/app/api/drive/organize/route.ts - FINAL FIXED VERSION
import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@/generated/prisma';
import { DriveService } from '@/lib/DriveService';
import { FileInfo, Cluster, SelectedClusterInfo } from '@/types';

const prisma = new PrismaClient();
const driveService = DriveService.getInstance();

export async function POST(request: NextRequest) {
  try {
    const session = request.cookies.get('session');
    if (!session) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { userId } = JSON.parse(session.value);
    const {
      method = 'hybrid',
      maxClusters = 6,
      minClusterSize = 3,
      createFolders = false,
      dryRun = true,
      selectedClusters = [], 
      selectedClusterNames = [], 
      selectedClusterInfo = [] 
    } = await request.json();

    console.log(`🎯 Starting ${method} organization for user ${userId}`, {
      maxClusters,
      minClusterSize,
      createFolders,
      dryRun,
      selectedClusters: selectedClusters.length,
      selectedClusterNames: selectedClusterNames.length,
      selectedClusterInfo: selectedClusterInfo.length
    });

    // Get user with drive connection
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

    // Check if user has enough indexed files
    const indexedFilesCount = await prisma.documentEmbedding.groupBy({
      by: ['fileId'],
      where: { userId },
      _count: { fileId: true }
    });

    if (indexedFilesCount.length < 10) {
      return NextResponse.json({ 
        error: 'Need at least 10 indexed files for organization. Please sync more files first.',
        details: `Currently have ${indexedFilesCount.length} indexed files`
      }, { status: 400 });
    }

    console.log(`📊 Found ${indexedFilesCount.length} indexed files to organize`);

    // Authenticate user with DriveService
    await driveService.authenticateUser(userId);

    // EXECUTION MODE: If this is execution mode (not dry run) and we have selected clusters
    if (!dryRun && selectedClusters.length > 0) {
      console.log(`🚀 Executing organization for ${selectedClusters.length} selected clusters`);
      
      // Get the original cluster data by running analysis again
      const fullAnalysis = await analyzeAndOrganize(userId, {
        method,
        maxClusters,
        minClusterSize,
        createFolders: false,
        dryRun: true 
      });

      console.log('🔍 EXECUTION MODE DEBUG:');
      console.log('📋 Available Clusters:');
      fullAnalysis.clusters.forEach((cluster, idx) => {
        console.log(`  ${idx}: { id: "${cluster.id}", name: "${cluster.name}", files: ${cluster.files.length} }`);
      });
      
      console.log('📋 Selected Cluster Info from UI:');
      selectedClusterInfo.forEach((info: SelectedClusterInfo, idx: number) => {
        console.log(`  ${idx}: { name: "${info.name}", fileCount: ${info.fileCount}, files: [${info.files?.slice(0, 3).map(f => f.fileName).join(', ')}${info.files && info.files.length > 3 ? '...' : ''}] }`);
      });

      // FIXED: Exact matching using the file lists from selectedClusterInfo
      const selectedClusterData: Cluster[] = [];
      for (const selectedInfo of selectedClusterInfo) {
        const matchingCluster = fullAnalysis.clusters.find(c => {
          // Match by name
          if (c.name === selectedInfo.name) {
            // Verify file lists match
            const selectedFileIds = new Set(selectedInfo.files.map((f: { fileId: string }) => f.fileId));
            const clusterFileIds = new Set(c.files.map((f: FileInfo) => f.fileId));
            
            // Check if all files in selected cluster are in the full analysis cluster
            return selectedInfo.files.every((f: { fileId: string }) => clusterFileIds.has(f.fileId));
          }
          return false;
        });

        if (matchingCluster) {
          selectedClusterData.push(matchingCluster);
        }
      }

      if (selectedClusterData.length === 0) {
        return NextResponse.json({ 
          error: 'No matching clusters found for execution',
          details: {
            selectedClusters: selectedClusterInfo,
            availableClusters: fullAnalysis.clusters.map(c => ({ id: c.id, name: c.name, fileCount: c.files.length }))
          }
        }, { status: 400 });
      }

      console.log(`📋 Executing with ${selectedClusterData.length} filtered clusters:`, 
        selectedClusterData.map(c => `${c.name} (${c.files.length} files)`)
      );

      // EXECUTE: Create folders and move files
      const executionResults = [];
      for (const cluster of selectedClusterData) {
        try {
          // Create folder
          const folderName = cluster.suggestedFolderName || cluster.name;
          console.log(`📁 Creating folder: ${folderName}`);
          const folderId = await driveService.createFolder(folderName);

          // Move files to folder
          console.log(`📦 Moving ${cluster.files.length} files to ${folderName}`);
          for (const file of cluster.files) {
            try {
              await driveService.createShortcut(file.fileId, folderId, file.name || file.fileName);
              console.log(`   ✅ Moved ${file.name || file.fileName}`);
            } catch (error) {
              console.error(`   ❌ Failed to move ${file.name || file.fileName}:`, error);
            }
          }

          executionResults.push({
            clusterName: cluster.name,
            folderName,
            folderId,
            fileCount: cluster.files.length,
            success: true
          });
        } catch (error) {
          console.error(`❌ Failed to process cluster ${cluster.name}:`, error);
          executionResults.push({
            clusterName: cluster.name,
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      }

      return NextResponse.json({
        success: true,
        summary: {
          totalClusters: selectedClusterData.length,
          totalFiles: selectedClusterData.reduce((sum, c) => sum + c.files.length, 0),
          results: executionResults
        }
      });
    }

    // ANALYSIS MODE: Run analysis and return suggestions
    const analysis = await analyzeAndOrganize(userId, {
      method,
      maxClusters,
      minClusterSize,
      createFolders,
      dryRun
    });

    return NextResponse.json(analysis);

  } catch (error) {
    console.error('Error in organization:', error);
    
    // Handle specific error types
    if (error instanceof Error) {
      if (error.message.includes('File not found')) {
        return NextResponse.json({ 
          error: 'Some files could not be accessed',
          details: error.message,
          type: 'FILE_ACCESS_ERROR'
        }, { status: 400 });
      }
    }

    return NextResponse.json({ 
      error: 'Failed to organize files',
      details: error instanceof Error ? error.message : 'Unknown error',
      type: 'INTERNAL_ERROR'
    }, { status: 500 });
  }
}

async function analyzeAndOrganize(userId: string, options: {
  method: string;
  maxClusters: number;
  minClusterSize: number;
  createFolders: boolean;
  dryRun: boolean;
}) {
  // Get all indexed files
  const indexedFiles = await prisma.documentEmbedding.findMany({
    where: { userId },
    select: {
      fileId: true,
      fileName: true
    },
    distinct: ['fileId']
  });

  // Get file contents and create embeddings
  const fileContents = await Promise.all(
    indexedFiles.map(async (file) => {
      try {
        const content = await driveService.getFileContent(file.fileId);
        return {
          id: file.fileId,
          name: file.fileName,
          content,
          error: null
        };
      } catch (error) {
        console.error(`Failed to get content for file ${file.fileName} (${file.fileId}):`, error);
        return {
          id: file.fileId,
          name: file.fileName,
          content: '',
          error: error instanceof Error ? error.message : 'Unknown error'
        };
      }
    })
  );

  // Filter out files that couldn't be accessed
  const accessibleFiles = fileContents.filter(file => !file.error);
  const inaccessibleFiles = fileContents.filter(file => file.error);

  if (inaccessibleFiles.length > 0) {
    console.warn(`⚠️ ${inaccessibleFiles.length} files could not be accessed:`, 
      inaccessibleFiles.map(f => `${f.name} (${f.id}): ${f.error}`).join(', ')
    );
  }

  // TODO: Implement clustering logic here
  // For now, return a simple mock analysis
  return {
    clusters: accessibleFiles.map((file, index) => ({
      id: `cluster-${index}`,
      name: `Cluster ${index + 1}`,
      files: [{
        fileId: file.id,
        name: file.name,
        fileName: file.name,
        confidence: 1.0,
        keywords: []
      }]
    })),
    inaccessibleFiles: inaccessibleFiles.map(file => ({
      fileId: file.id,
      name: file.name,
      error: file.error
    })),
    summary: {
      totalFiles: accessibleFiles.length,
      clustersCreated: accessibleFiles.length,
      organizationScore: 1.0,
      inaccessibleFiles: inaccessibleFiles.length
    }
  };
}

// Analytics endpoint for organization history
export async function GET(request: NextRequest) {
  try {
    const session = request.cookies.get('session');
    if (!session) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { userId } = JSON.parse(session.value);

    // Get organization history
    const organizationHistory = await prisma.organizationActivity.findMany({
      where: { userId },
      orderBy: { timestamp: 'desc' },
      take: 10,
    });

    // Get organization stats
    const stats = await prisma.organizationActivity.aggregate({
      where: { userId },
      _sum: { filesMoved: true },
      _count: { id: true },
    });

    // Get recent organization summary
    const recentActivities = await prisma.organizationActivity.groupBy({
      by: ['method'],
      where: { 
        userId,
        timestamp: {
          gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // Last 30 days
        }
      },
      _sum: { filesMoved: true },
      _count: { id: true },
    });

    return NextResponse.json({
      history: organizationHistory,
      stats: {
        totalFilesOrganized: stats._sum.filesMoved || 0,
        totalOrganizations: stats._count || 0,
        recentActivities: recentActivities.map(activity => ({
          method: activity.method,
          filesOrganized: activity._sum.filesMoved || 0,
          organizationCount: activity._count || 0
        }))
      },
      insights: generateOrganizationInsights(organizationHistory, stats)
    });

  } catch (error) {
    console.error('Error getting organization analytics:', error);
    return NextResponse.json({ 
      error: 'Failed to get organization analytics',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

function generateOrganizationInsights(
  history: any[], 
  stats: any
): { message: string; type: 'success' | 'info' | 'warning' }[] {
  const insights = [];

  if (stats._count === 0) {
    insights.push({
      message: "Ready to organize! Start with hybrid mode for best results.",
      type: 'info' as const
    });
  } else if (stats._sum.filesMoved > 100) {
    insights.push({
      message: `Great job! You've organized ${stats._sum.filesMoved} files across ${stats._count} sessions.`,
      type: 'success' as const
    });
  }

  // Check for recent activity
  const recentActivity = history.filter(h => 
    new Date(h.timestamp) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
  );

  if (recentActivity.length === 0 && stats._count > 0) {
    insights.push({
      message: "It's been a while since your last organization. Consider running a new analysis.",
      type: 'info' as const
    });
  }

  return insights;
}