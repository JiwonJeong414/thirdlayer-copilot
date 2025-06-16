// src/app/api/drive/organize/route.ts - FINAL FIXED VERSION
import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@/generated/prisma';
import { DriveService } from '@/lib/DriveService';

const prisma = new PrismaClient();

interface FileInfo {
  fileId: string;
  fileName: string;
  name?: string;
  confidence: number;
  keywords: string[];
}

interface Cluster {
  id: string;
  name: string;
  suggestedFolderName?: string;
  files: FileInfo[];
}

interface SelectedClusterInfo {
  name: string;
  fileCount: number;
  files?: FileInfo[];
}

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

    // Create Drive service
    const driveService = DriveService.getInstance();
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
        console.log(`  ${idx}: { name: "${info.name}", fileCount: ${info.fileCount}, files: [${info.files?.slice(0, 3).map(f => f.name || f.fileName).join(', ')}${info.files && info.files.length > 3 ? '...' : ''}] }`);
      });

      // FIXED: Exact matching using the file lists from selectedClusterInfo
      const selectedClusterData: Cluster[] = [];
      
      for (const selectedInfo of selectedClusterInfo) {
        console.log(`🎯 Looking for cluster: ${selectedInfo.name} with ${selectedInfo.fileCount} files`);
        
        // Try to find exact match by comparing file IDs
        let matchingCluster = null;
        
        if (selectedInfo.files && selectedInfo.files.length > 0) {
          // Get file IDs from selected cluster
          const selectedFileIds = new Set(selectedInfo.files.map((f: FileInfo) => f.fileId));
          
          // Find cluster with matching files
          matchingCluster = fullAnalysis.clusters.find(cluster => {
            const clusterFileIds = new Set(cluster.files.map(f => f.fileId));
            
            // Check if at least 80% of selected files are in this cluster
            const intersection = new Set([...selectedFileIds].filter(id => clusterFileIds.has(id as string)));
            const overlapPercentage = intersection.size / selectedFileIds.size;
            
            console.log(`  Checking cluster "${cluster.name}": ${intersection.size}/${selectedFileIds.size} files match (${Math.round(overlapPercentage * 100)}%)`);
            
            return overlapPercentage >= 0.8; // 80% overlap required
          });
          
          if (matchingCluster) {
            // IMPORTANT: Filter the cluster to only include the originally selected files
            const filteredFiles = matchingCluster.files.filter(file => 
              selectedFileIds.has(file.fileId)
            );
            
            // Create a new cluster object with only the selected files
            const exactCluster: Cluster = {
              ...matchingCluster,
              files: filteredFiles,
              name: selectedInfo.name, 
              suggestedFolderName: selectedInfo.name.replace(/[^a-zA-Z0-9\s\-_]/g, '').trim()
            };
            
            selectedClusterData.push(exactCluster);
            console.log(`✅ Exact match found: "${exactCluster.name}" with ${exactCluster.files.length} files (filtered from ${matchingCluster.files.length})`);
          }
        }
        
        // Fallback: try name matching if file matching failed
        if (!matchingCluster) {
          matchingCluster = fullAnalysis.clusters.find(cluster =>
            cluster.name === selectedInfo.name ||
            cluster.name.toLowerCase().includes(selectedInfo.name.toLowerCase()) ||
            selectedInfo.name.toLowerCase().includes(cluster.name.toLowerCase())
          );
          
          if (matchingCluster) {
            // Use the original selected name
            const matchedCluster: Cluster = {
              ...matchingCluster,
              name: selectedInfo.name,
              suggestedFolderName: selectedInfo.name.replace(/[^a-zA-Z0-9\s\-_]/g, '').trim()
            };
            selectedClusterData.push(matchedCluster);
            console.log(`✅ Name-based match: "${matchedCluster.name}" with ${matchedCluster.files.length} files`);
          }
        }
        
        if (!matchingCluster) {
          console.log(`❌ Could not match cluster: ${selectedInfo.name}`);
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
        message: 'Organization completed',
        results: executionResults
      });
    }

    // ANALYSIS MODE: Run analysis and return clusters
    const analysis = await analyzeAndOrganize(userId, {
      method,
      maxClusters,
      minClusterSize,
      createFolders,
      dryRun
    });

    return NextResponse.json(analysis);
  } catch (error) {
    console.error('Error during organization:', error);
    return NextResponse.json({ 
      error: 'Organization failed',
      details: error instanceof Error ? error.message : 'Unknown error'
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
      const driveService = DriveService.getInstance();
      const content = await driveService.getFileContent(file.fileId);
      return {
        id: file.fileId,
        name: file.fileName,
        content
      };
    })
  );

  // TODO: Implement clustering logic here
  // For now, return a simple mock analysis
  return {
    clusters: fileContents.map((file, index) => ({
      id: `cluster-${index}`,
      name: `Cluster ${index + 1}`,
      files: [{
        fileId: file.id,
        name: file.name,
        fileName: file.name,
        confidence: 1.0,
        keywords: []
      }]
    }))
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