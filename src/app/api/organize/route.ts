// src/app/api/drive/organize/route.ts - FINAL FIXED VERSION
import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@/generated/prisma';
import { GoogleDriveService } from '@/lib/googleDrive';
import { DriveOrganizerService } from '@/lib/driveOrganizer';

const prisma = new PrismaClient();

interface FileInfo {
  fileId: string;
  fileName: string;
  name?: string;
  confidence: number;
  keywords: string[];
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
    const driveService = new GoogleDriveService({
      access_token: user.driveConnection.accessToken,
      refresh_token: user.driveConnection.refreshToken || undefined,
    });

    // Create organizer service
    const organizerService = new DriveOrganizerService(driveService);

    // EXECUTION MODE: If this is execution mode (not dry run) and we have selected clusters
    if (!dryRun && selectedClusters.length > 0) {
      console.log(`🚀 Executing organization for ${selectedClusters.length} selected clusters`);
      
      // Get the original cluster data by running analysis again
      const fullAnalysis = await organizerService.analyzeAndOrganize(userId, {
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
      const selectedClusterData = [];
      
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
            const exactCluster = {
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
            matchingCluster.name = selectedInfo.name;
            matchingCluster.suggestedFolderName = selectedInfo.name.replace(/[^a-zA-Z0-9\s\-_]/g, '').trim();
            selectedClusterData.push(matchingCluster);
            console.log(`✅ Name-based match: "${matchingCluster.name}" with ${matchingCluster.files.length} files`);
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

      // EXECUTE: Use the existing Google Drive API directly instead of non-existent method
      const executionResults = [];
      for (const cluster of selectedClusterData) {
        try {
          console.log(`📁 Processing cluster: ${cluster.name} (${cluster.files.length} files)`);
          
          // Create folder directly at root level (no category subfolder)
          const folderName = cluster.suggestedFolderName || cluster.name.replace(/[^a-zA-Z0-9\s\-_]/g, '').trim();
          
          console.log(`📁 Creating root-level folder: ${folderName}`);
          
          // Use the existing GoogleDriveService to create folder
          const drive = driveService.getDriveClient();
          if (!drive) {
            throw new Error('Drive client not available');
          }

          // Create the folder at root level
          const folderResponse = await drive.files.create({
            requestBody: {
              name: folderName,
              mimeType: 'application/vnd.google-apps.folder'
            },
            fields: 'id,name'
          });

          if (!folderResponse.data.id) {
            throw new Error('Failed to create folder - no ID returned');
          }

          const folderId = folderResponse.data.id;
          console.log(`✅ Created folder: ${folderName} (${folderId})`);
          
          // Move/create shortcuts for all files in this cluster
          let filesOrganized = 0;
          for (const file of cluster.files) {
            try {
              // FIXED: Handle both fileName and name properties
              const fileName = (file as FileInfo).fileName || (file as FileInfo).name;
              console.log(`📄 Creating shortcut for ${fileName} in ${folderName}`);
              
              // First get the target file's metadata to determine its MIME type
              const targetFile = await drive.files.get({
                fileId: file.fileId,
                fields: 'mimeType,name'
              });

              // Create shortcut
              const shortcutResponse = await drive.files.create({
                requestBody: {
                  name: fileName,
                  mimeType: 'application/vnd.google-apps.shortcut',
                  parents: [folderId],
                  shortcutDetails: {
                    targetId: file.fileId,
                    targetMimeType: targetFile.data.mimeType || 'application/octet-stream'
                  }
                },
                fields: 'id'
              });

              if (!shortcutResponse.data.id) {
                throw new Error('Failed to create shortcut - no ID returned');
              }
              
              console.log(`✅ Created shortcut for ${fileName} in ${folderName}`);
              filesOrganized++;
              
            } catch (fileError) {
              const fileName = (file as FileInfo).fileName || (file as FileInfo).name;
              console.error(`❌ Failed to create shortcut for ${fileName}:`, fileError);
            }
          }
          
          executionResults.push({
            clusterName: cluster.name,
            folderName: folderName,
            folderId: folderId,
            filesOrganized: filesOrganized,
            totalFiles: cluster.files.length
          });
          
        } catch (folderError) {
          console.error(`❌ Failed to create folder for cluster ${cluster.name}:`, folderError);
        }
      }

      // Log the organization activity
      try {
        for (const result of executionResults) {
          await prisma.organizationActivity.create({
            data: {
              userId: user.id,
              clusterName: result.clusterName,
              folderName: result.folderName,
              filesMoved: result.filesOrganized,
              method,
              confidence: 0.8, // Default confidence
              metadata: {
                clusterId: `executed_${Date.now()}`,
                category: 'general',
                fileIds: [],
                keywords: []
              },
              timestamp: new Date(),
            },
          });
        }
      } catch (dbError) {
        console.error('Failed to log organization activity:', dbError);
      }

      const totalFilesOrganized = executionResults.reduce((sum, r) => sum + r.filesOrganized, 0);
      const totalFoldersCreated = executionResults.length;

      return NextResponse.json({
        success: true,
        clusters: selectedClusterData,
        summary: {
          totalFiles: totalFilesOrganized,
          clustersCreated: totalFoldersCreated,
          estimatedSavings: totalFoldersCreated * 0.5,
          confidence: 0.8
        },
        actions: {
          createFolders: true,
          moveFiles: true,
          addLabels: false
        },
        executionResults
      });
    }

    // Regular analysis mode (dry run or initial analysis)
    const organizationSuggestion = await organizerService.analyzeAndOrganize(userId, {
      method,
      maxClusters,
      minClusterSize,
      createFolders: createFolders && !dryRun,
      dryRun
    });

    console.log(`✅ Organization analysis complete:`, {
      clustersFound: organizationSuggestion.clusters.length,
      totalFiles: organizationSuggestion.summary.totalFiles,
      confidence: organizationSuggestion.summary.confidence
    });

    return NextResponse.json(organizationSuggestion);

  } catch (error) {
    console.error('💥 Organization error:', error);
    return NextResponse.json({ 
      error: 'Failed to organize files',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
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