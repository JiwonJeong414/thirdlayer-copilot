// src/app/api/organize/route.ts - FINAL FIXED VERSION
import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@/generated/prisma';
import { DriveService } from '@/lib/DriveService';
import { FileInfo, Cluster, SelectedClusterInfo } from '@/types';

const prisma = new PrismaClient();
const driveService = DriveService.getInstance();

interface FileWithEmbedding {
  fileId: string;
  fileName: string;
  embedding: number[];
  content?: string;
  metadata?: any;
  folderPath?: string;
}

interface FileCluster {
  id: string;
  name: string;
  description: string;
  color: string;
  files: Array<{
    fileId: string;
    fileName: string;
    confidence: number;
    keywords: string[];
  }>;
  suggestedFolderName: string;
  category: 'work' | 'personal' | 'media' | 'documents' | 'archive' | 'mixed';
}

// K-means clustering implementation
class ClusteringService {
  static kMeansClustering(embeddings: number[][], k: number): number[] {
    const numPoints = embeddings.length;
    const dimensions = embeddings[0].length;
    
    // Initialize centroids randomly
    let centroids: number[][] = [];
    for (let i = 0; i < k; i++) {
      const centroid = new Array(dimensions);
      for (let j = 0; j < dimensions; j++) {
        centroid[j] = Math.random() * 2 - 1; // Random between -1 and 1
      }
      centroids.push(centroid);
    }

    let assignments = new Array(numPoints).fill(0);
    let hasChanged = true;
    let iterations = 0;
    const maxIterations = 100;

    while (hasChanged && iterations < maxIterations) {
      hasChanged = false;
      iterations++;

      // Assign each point to nearest centroid
      for (let i = 0; i < numPoints; i++) {
        let minDistance = Infinity;
        let bestCluster = 0;

        for (let j = 0; j < k; j++) {
          const distance = this.euclideanDistance(embeddings[i], centroids[j]);
          if (distance < minDistance) {
            minDistance = distance;
            bestCluster = j;
          }
        }

        if (assignments[i] !== bestCluster) {
          assignments[i] = bestCluster;
          hasChanged = true;
        }
      }

      // Update centroids
      for (let j = 0; j < k; j++) {
        const clusterPoints = embeddings.filter((_, idx) => assignments[idx] === j);
        
        if (clusterPoints.length > 0) {
          for (let dim = 0; dim < dimensions; dim++) {
            centroids[j][dim] = clusterPoints.reduce((sum, point) => sum + point[dim], 0) / clusterPoints.length;
          }
        }
      }
    }

    console.log(`🔄 K-means converged after ${iterations} iterations`);
    return assignments;
  }

  static euclideanDistance(a: number[], b: number[]): number {
    return Math.sqrt(a.reduce((sum, val, i) => sum + Math.pow(val - b[i], 2), 0));
  }

  static analyzeClusterTheme(files: FileWithEmbedding[]): {
    name: string;
    description: string;
    folderName: string;
    category: FileCluster['category'];
    keywords: string[];
  } {
    // Get file metadata for better analysis
    const fileNames = files.map(f => f.fileName.toLowerCase());
    const allText = files.map(f => f.content?.substring(0, 200) || '').join(' ').toLowerCase();

    // Enhanced category detection
    const categoryScores = {
      work: 0,
      personal: 0,
      media: 0,
      documents: 0,
      archive: 0,
      mixed: 0
    };

    // Score based on content and filenames
    const patterns = {
      work: ['meeting', 'report', 'presentation', 'budget', 'project', 'proposal', 'work', 'business', 'company'],
      personal: ['photo', 'vacation', 'family', 'personal', 'diary', 'journal', 'home', 'life'],
      media: ['image', 'video', 'audio', 'photo', '.jpg', '.png', '.mp4', 'media', 'picture'],
      documents: ['document', 'pdf', 'doc', 'text', 'notes', 'manual', 'paper', 'report'],
      archive: ['old', 'backup', 'archive', '2020', '2021', '2022', 'previous']
    };

    for (const [category, keywords] of Object.entries(patterns)) {
      keywords.forEach(keyword => {
        // Check content
        if (allText.includes(keyword)) {
          categoryScores[category as keyof typeof categoryScores] += 1;
        }
        // Check filenames (weighted more heavily)
        if (fileNames.some(name => name.includes(keyword))) {
          categoryScores[category as keyof typeof categoryScores] += 2;
        }
      });
    }

    // Find the best category
    let bestCategory: FileCluster['category'] = 'mixed';
    let maxScore = 0;

    for (const [category, score] of Object.entries(categoryScores)) {
      if (score > maxScore) {
        maxScore = score;
        bestCategory = category as FileCluster['category'];
      }
    }

    // Extract meaningful words for naming
    const commonWords = this.extractCommonWords(fileNames);
    const meaningfulWords = commonWords.filter(word => 
      word.length > 3 && !['file', 'doc', 'pdf', 'txt'].includes(word)
    );

    // Generate theme name and folder name
    let themeName: string;
    let folderName: string;

    if (meaningfulWords.length > 0) {
      const primaryWord = meaningfulWords[0];
      themeName = `${this.capitalizeWords(primaryWord)} Collection`;
      folderName = this.capitalizeWords(primaryWord);
    } else {
      // Use category-based naming only if no meaningful words found
      themeName = `${this.capitalizeWords(bestCategory)} Files`;
      folderName = this.capitalizeWords(bestCategory);
    }

    return {
      name: themeName,
      description: `Collection of ${bestCategory} files`,
      folderName,
      category: bestCategory,
      keywords: meaningfulWords
    };
  }

  static extractCommonWords(fileNames: string[]): string[] {
    const wordCount = new Map<string, number>();
    
    fileNames.forEach(name => {
      const words = name.toLowerCase()
        .replace(/[^\w\s]/g, ' ')
        .split(/\s+/)
        .filter(word => word.length > 3 && !['file', 'document', 'untitled'].includes(word));
      
      words.forEach(word => {
        wordCount.set(word, (wordCount.get(word) || 0) + 1);
      });
    });

    return Array.from(wordCount.entries())
      .filter(([word, count]) => count >= Math.max(2, fileNames.length * 0.3))
      .sort(([, a], [, b]) => b - a)
      .map(([word]) => word)
      .slice(0, 3);
  }

  static capitalizeWords(str: string): string {
    return str.split(' ').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
    ).join(' ');
  }

  static getClusterColor(index: number): string {
    const colors = [
      '#3B82F6', '#EF4444', '#10B981', '#F59E0B',
      '#8B5CF6', '#06B6D4', '#F97316', '#84CC16'
    ];
    return colors[index % colors.length];
  }
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

    // Authenticate user with DriveService
    await driveService.authenticateUser(userId);

    // EXECUTION MODE: If this is execution mode (not dry run) and we have selected clusters
    if (!dryRun && selectedClusters.length > 0) {
      console.log(`🚀 Executing organization for ${selectedClusters.length} selected clusters`);
      
      // Instead of re-running analysis, use the selectedClusterInfo directly from the UI
      // This avoids the non-deterministic clustering issue
      console.log('📋 Selected Cluster Info from UI:');
      selectedClusterInfo.forEach((info: SelectedClusterInfo, idx: number) => {
        console.log(`  ${idx}: { name: "${info.name}", fileCount: ${info.fileCount}, files: [${info.files?.slice(0, 3).map(f => f.fileName).join(', ')}${info.files && info.files.length > 3 ? '...' : ''}] }`);
      });

      if (selectedClusterInfo.length === 0) {
        return NextResponse.json({ 
          error: 'No cluster information provided for execution',
          details: 'The UI must send selectedClusterInfo with file details for execution'
        }, { status: 400 });
      }

      // Convert selectedClusterInfo directly to FileCluster format for execution
      const selectedClusterData: FileCluster[] = selectedClusterInfo.map((info: SelectedClusterInfo) => ({
        id: info.id,
        name: info.name,
        description: `Selected cluster: ${info.name}`,
        color: '#3B82F6', // Default color
        suggestedFolderName: info.name.replace(/[^a-zA-Z0-9\s\-_]/g, '').trim(),
        category: (info.category as FileCluster['category']) || 'mixed',
        files: info.files.map(f => ({
          fileId: f.fileId,
          fileName: f.fileName,
          confidence: f.confidence || 0.8,
          keywords: f.keywords || []
        }))
      }));

      console.log(`📋 Executing with ${selectedClusterData.length} clusters directly from UI:`, 
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
              await driveService.createShortcut(file.fileId, folderId, file.fileName);
              console.log(`   ✅ Moved ${file.fileName}`);
            } catch (error) {
              console.error(`   ❌ Failed to move ${file.fileName}:`, error);
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
  // Get all indexed files with embeddings using the existing API
  const fileData = await getFileDataWithEmbeddings(userId);
  
  if (fileData.length < 10) {
    throw new Error(`Need at least 10 files for meaningful organization. Currently have ${fileData.length} files with embeddings.`);
  }

  console.log(`📊 Analyzing ${fileData.length} files for organization`);

  let clusters: FileCluster[] = [];

  switch (options.method) {
    case 'folders':
      clusters = await organizeByExistingStructure(fileData);
      break;
    case 'clustering':
      clusters = await organizeByKMeans(fileData, options.maxClusters, options.minClusterSize);
      break;
    case 'hybrid':
      const folderClusters = await organizeByExistingStructure(fileData);
      const contentClusters = await organizeByKMeans(fileData, options.maxClusters - folderClusters.length, options.minClusterSize);
      clusters = [...folderClusters, ...contentClusters];
      break;
  }

  // Calculate organization metrics
  const summary = calculateOrganizationMetrics(fileData, clusters);

  return {
    clusters,
    summary,
    actions: {
      createFolders: options.createFolders,
      moveFiles: !options.dryRun,
      addLabels: true
    }
  };
}

async function getFileDataWithEmbeddings(userId: string): Promise<FileWithEmbedding[]> {
  // Get embeddings directly from database instead of calling API
  const embeddings = await prisma.documentEmbedding.findMany({
    where: { userId },
    select: {
      fileId: true,
      fileName: true,
      embedding: true,
      content: true,
      metadata: true,
    },
    distinct: ['fileId'], // One per file
  });

  console.log(`📄 Found ${embeddings.length} embeddings for user ${userId}`);

  const fileEmbeddings = embeddings.map(e => ({
    fileId: e.fileId,
    fileName: e.fileName,
    embedding: Array.isArray(e.embedding) ? e.embedding : JSON.parse(e.embedding || '[]'),
    content: e.content,
    metadata: e.metadata as any,
    folderPath: (e.metadata as any)?.folderPath || 'Root'
  }));

  // Filter out files with invalid embeddings
  const validEmbeddings = fileEmbeddings.filter(file => 
    Array.isArray(file.embedding) && file.embedding.length > 0
  );

  console.log(`✅ Valid embeddings for clustering: ${validEmbeddings.length}`);
  return validEmbeddings;
}

async function organizeByKMeans(
  fileData: FileWithEmbedding[],
  k: number,
  minClusterSize: number
): Promise<FileCluster[]> {
  console.log(`🧮 Running K-means clustering with k=${k}`);

  // Extract embeddings for clustering
  const embeddings = fileData.map(f => f.embedding);
  const clusters = ClusteringService.kMeansClustering(embeddings, k);

  // Group files by cluster
  const fileClusters: FileCluster[] = [];
  
  for (let i = 0; i < k; i++) {
    const clusterFiles = fileData
      .map((file, idx) => ({ file, cluster: clusters[idx] }))
      .filter(item => item.cluster === i)
      .map(item => item.file);

    if (clusterFiles.length < minClusterSize) {
      console.log(`⚠️ Cluster ${i} too small (${clusterFiles.length} files), merging with others`);
      continue;
    }

    // Analyze cluster content to determine theme
    const theme = ClusteringService.analyzeClusterTheme(clusterFiles);
    
    fileClusters.push({
      id: `cluster_${i}`,
      name: theme.name,
      description: theme.description,
      color: ClusteringService.getClusterColor(i),
      suggestedFolderName: theme.folderName,
      category: theme.category,
      files: clusterFiles.map(f => ({
        fileId: f.fileId,
        fileName: f.fileName,
        confidence: 0.8, // K-means confidence
        keywords: theme.keywords
      }))
    });
  }

  console.log(`✅ Created ${fileClusters.length} content-based clusters`);
  return fileClusters;
}

async function organizeByExistingStructure(fileData: FileWithEmbedding[]): Promise<FileCluster[]> {
  console.log(`📁 Analyzing existing folder structure`);

  // Group files by their current folder structure
  const folderGroups = new Map<string, FileWithEmbedding[]>();
  
  for (const file of fileData) {
    const folderPath = file.folderPath || 'Root';
    if (!folderGroups.has(folderPath)) {
      folderGroups.set(folderPath, []);
    }
    folderGroups.get(folderPath)!.push(file);
  }

  const clusters: FileCluster[] = [];
  let clusterIndex = 0;

  for (const [folderPath, files] of folderGroups) {
    if (files.length < 2) continue; // Skip single files

    const theme = ClusteringService.analyzeClusterTheme(files);
    
    clusters.push({
      id: `folder_${clusterIndex++}`,
      name: `${folderPath} Organization`,
      description: `Files from ${folderPath} folder`,
      color: ClusteringService.getClusterColor(clusterIndex),
      suggestedFolderName: improveFolderName(folderPath, theme),
      category: theme.category,
      files: files.map(f => ({
        fileId: f.fileId,
        fileName: f.fileName,
        confidence: 0.9, // High confidence for existing structure
        keywords: theme.keywords
      }))
    });
  }

  console.log(`✅ Created ${clusters.length} folder-based clusters`);
  return clusters;
}

function improveFolderName(currentPath: string, theme: any): string {
  if (currentPath === 'Root') return theme.folderName;
  
  const pathParts = currentPath.split('/').filter(Boolean);
  const lastPart = pathParts[pathParts.length - 1];
  
  return `${lastPart} - Organized`;
}

function calculateOrganizationMetrics(files: FileWithEmbedding[], clusters: FileCluster[]): {
  totalFiles: number;
  clustersCreated: number;
  estimatedSavings: number;
  confidence: number;
} {
  const totalFiles = files.length;
  const organizedFiles = clusters.reduce((sum, cluster) => sum + cluster.files.length, 0);
  const averageConfidence = clusters.reduce((sum, cluster) => {
    const clusterConfidence = cluster.files.reduce((cSum, file) => cSum + file.confidence, 0) / cluster.files.length;
    return sum + clusterConfidence;
  }, 0) / clusters.length;

  // Estimate time savings (rough heuristic)
  const estimatedSavings = Math.floor((organizedFiles / totalFiles) * 2); // 2 hours max

  return {
    totalFiles,
    clustersCreated: clusters.length,
    estimatedSavings,
    confidence: averageConfidence || 0.5
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