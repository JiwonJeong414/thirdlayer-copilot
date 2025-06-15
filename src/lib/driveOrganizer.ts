// src/lib/driveOrganizer.ts - AI-powered folder organization
import { GoogleDriveService } from '@/lib/googleDrive';
import { VectorService } from '@/lib/vectorService';
import { PrismaClient } from '@/generated/prisma';
import { google } from 'googleapis';

const prisma = new PrismaClient();

export interface FileCluster {
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
  selected: boolean;
}

export interface OrganizationSuggestion {
  clusters: FileCluster[];
  summary: {
    totalFiles: number;
    clustersCreated: number;
    estimatedSavings: number;
    confidence: number;
  };
  actions: {
    createFolders: boolean;
    moveFiles: boolean;
    addLabels: boolean;
  };
}

interface OrganizationOptions {
  method: 'folders' | 'clustering' | 'hybrid';
  maxClusters: number;
  minClusterSize: number;
  createFolders: boolean;
  dryRun: boolean;
  clusters: FileCluster[];
}

export class DriveOrganizerService {
  private driveService: GoogleDriveService;

  constructor(driveService: GoogleDriveService) {
    this.driveService = driveService;
  }

  // ===================================================================
  // MAIN ORGANIZATION WORKFLOW
  // ===================================================================
  
  async analyzeAndOrganize(
    userId: string,
    options: {
      method?: 'folders' | 'clustering' | 'hybrid';
      maxClusters?: number;
      minClusterSize?: number;
      createFolders?: boolean;
      dryRun?: boolean;
    } = {}
  ): Promise<OrganizationSuggestion> {
    const {
      method = 'hybrid',
      maxClusters = 8,
      minClusterSize = 3,
      createFolders = false,
      dryRun = true
    } = options;

    console.log(`🎯 Starting ${method} organization analysis for user ${userId}`);

    // Get all indexed files with embeddings
    const fileData = await this.getFileDataWithEmbeddings(userId);
    
    if (fileData.length < 10) {
      throw new Error('Need at least 10 files for meaningful organization');
    }

    console.log(`📊 Analyzing ${fileData.length} files for organization`);

    let clusters: FileCluster[] = [];

    switch (method) {
      case 'folders':
        clusters = await this.organizeByExistingStructure(fileData);
        break;
      case 'clustering':
        clusters = await this.organizeByKMeans(fileData, maxClusters, minClusterSize);
        break;
      case 'hybrid':
        const folderClusters = await this.organizeByExistingStructure(fileData);
        const contentClusters = await this.organizeByKMeans(fileData, maxClusters - folderClusters.length, minClusterSize);
        clusters = [...folderClusters, ...contentClusters];
        break;
    }

    // Enhance clusters with AI analysis
    clusters = await this.enhanceClustersWithAI(clusters);

    // Calculate organization metrics
    const summary = this.calculateOrganizationMetrics(fileData, clusters);

    const suggestion: OrganizationSuggestion = {
      clusters,
      summary,
      actions: {
        createFolders,
        moveFiles: !dryRun,
        addLabels: true
      }
    };

    // Execute organization if not dry run
    if (!dryRun && createFolders) {
      await this.executeOrganization(userId, {
        method,
        maxClusters,
        minClusterSize,
        createFolders,
        dryRun,
        clusters
      });
    }

    return suggestion;
  }

  // ===================================================================
  // K-MEANS CLUSTERING APPROACH
  // ===================================================================
  
  async organizeByKMeans(
    fileData: FileWithEmbedding[],
    k: number,
    minClusterSize: number
  ): Promise<FileCluster[]> {
    console.log(`🧮 Running K-means clustering with k=${k}`);

    // Extract embeddings for clustering
    const embeddings = fileData.map(f => f.embedding);
    const clusters = this.kMeansClustering(embeddings, k);

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
      const theme = await this.analyzeClusterTheme(clusterFiles);
      
      fileClusters.push({
        id: `cluster_${i}`,
        name: theme.name,
        description: theme.description,
        color: this.getClusterColor(i),
        suggestedFolderName: theme.folderName,
        category: theme.category,
        files: clusterFiles.map(f => ({
          fileId: f.fileId,
          fileName: f.fileName,
          confidence: 0.8, // K-means confidence
          keywords: theme.keywords
        })),
        selected: true
      });
    }

    console.log(`✅ Created ${fileClusters.length} content-based clusters`);
    return fileClusters;
  }

  private kMeansClustering(embeddings: number[][], k: number): number[] {
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

  private euclideanDistance(a: number[], b: number[]): number {
    return Math.sqrt(a.reduce((sum, val, i) => sum + Math.pow(val - b[i], 2), 0));
  }

  // ===================================================================
  // FOLDER-BASED ORGANIZATION
  // ===================================================================
  
  async organizeByExistingStructure(fileData: FileWithEmbedding[]): Promise<FileCluster[]> {
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

      const theme = await this.analyzeClusterTheme(files);
      
      clusters.push({
        id: `folder_${clusterIndex++}`,
        name: `${folderPath} Organization`,
        description: `Files from ${folderPath} folder`,
        color: this.getClusterColor(clusterIndex),
        suggestedFolderName: this.improveFolderName(folderPath, theme),
        category: theme.category,
        files: files.map(f => ({
          fileId: f.fileId,
          fileName: f.fileName,
          confidence: 0.9, // High confidence for existing structure
          keywords: theme.keywords
        })),
        selected: true
      });
    }

    console.log(`✅ Created ${clusters.length} folder-based clusters`);
    return clusters;
  }

  // ===================================================================
  // AI ENHANCEMENT
  // ===================================================================
  
  async enhanceClustersWithAI(clusters: FileCluster[]): Promise<FileCluster[]> {
    console.log(`🤖 Enhancing clusters with AI analysis`);

    for (const cluster of clusters) {
      try {
        const enhancement = await this.getAIClusterEnhancement(cluster);
        
        cluster.name = enhancement.improvedName || cluster.name;
        cluster.description = enhancement.improvedDescription || cluster.description;
        cluster.suggestedFolderName = enhancement.betterFolderName || cluster.suggestedFolderName;
        cluster.category = enhancement.category || cluster.category;

        // Add AI-suggested tags to files
        cluster.files.forEach(file => {
          file.keywords = [...file.keywords, ...enhancement.additionalKeywords];
        });

      } catch (error) {
        console.log(`⚠️ AI enhancement failed for cluster ${cluster.id}:`, error);
      }
    }

    return clusters;
  }

  private async getAIClusterEnhancement(cluster: FileCluster): Promise<{
    improvedName?: string;
    improvedDescription?: string;
    betterFolderName?: string;
    category?: FileCluster['category'];
    additionalKeywords: string[];
  }> {
    const fileNames = cluster.files.map(f => f.fileName).join(', ');
    
    const prompt = `Analyze this group of files and suggest better organization:

Files: ${fileNames}
Current name: ${cluster.name}
Current folder: ${cluster.suggestedFolderName}

Please suggest:
1. A better cluster name (max 30 chars)
2. A better folder name (max 25 chars, no special chars)
3. Category (work/personal/media/documents/archive/mixed)
4. 3-5 relevant keywords
5. Brief description

Format your response as:
NAME: [improved name]
FOLDER: [better folder name]
CATEGORY: [category]
KEYWORDS: [keyword1, keyword2, keyword3]
DESCRIPTION: [brief description]`;

    try {
      const response = await fetch(`${process.env.OLLAMA_ENDPOINT}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'llama3.2:1b',
          prompt,
          stream: false,
          options: { temperature: 0.3, num_predict: 200 }
        }),
      });

      if (!response.ok) throw new Error('AI enhancement failed');

      const data = await response.json();
      return this.parseAIEnhancement(data.response);
    } catch (error) {
      return { additionalKeywords: [] };
    }
  }

  private parseAIEnhancement(response: string): {
    improvedName?: string;
    improvedDescription?: string;
    betterFolderName?: string;
    category?: FileCluster['category'];
    additionalKeywords: string[];
  } {
    const lines = response.split('\n');
    const result: any = { additionalKeywords: [] };

    for (const line of lines) {
      const [key, ...valueParts] = line.split(':');
      const value = valueParts.join(':').trim();

      switch (key.trim().toUpperCase()) {
        case 'NAME':
          result.improvedName = value;
          break;
        case 'FOLDER':
          result.betterFolderName = value.replace(/[^a-zA-Z0-9\s\-_]/g, '');
          break;
        case 'CATEGORY':
          const validCategories = ['work', 'personal', 'media', 'documents', 'archive', 'mixed'];
          if (validCategories.includes(value.toLowerCase())) {
            result.category = value.toLowerCase();
          }
          break;
        case 'KEYWORDS':
          result.additionalKeywords = value.split(',').map(k => k.trim().toLowerCase()).filter(Boolean);
          break;
        case 'DESCRIPTION':
          result.improvedDescription = value;
          break;
      }
    }

    return result;
  }

  // ===================================================================
  // EXECUTION METHODS
  // ===================================================================
  
  async executeOrganization(
    userId: string,
    options: OrganizationOptions
  ): Promise<OrganizationSuggestion> {
    // Get the drive client from the service
    const drive = this.driveService.getDriveClient();
    if (!drive) {
      throw new Error('Failed to access Google Drive client');
    }

    // Create folders and move files
    for (const cluster of options.clusters) {
      try {
        // Skip if cluster is not selected
        if (!cluster.selected) {
          console.log(`⏭️ Skipping unselected cluster: ${cluster.name}`);
          continue;
        }

        // Create category folder first
        const categoryFolderResponse = await drive.files.create({
          requestBody: {
            name: this.capitalizeWords(cluster.category),
            mimeType: 'application/vnd.google-apps.folder',
          },
        });

        const categoryFolderId = categoryFolderResponse.data.id!;
        console.log(`📁 Created category folder: ${this.capitalizeWords(cluster.category)} (${categoryFolderId})`);

        // Create subfolder within category
        const subfolderResponse = await drive.files.create({
          requestBody: {
            name: cluster.suggestedFolderName,
            mimeType: 'application/vnd.google-apps.folder',
            parents: [categoryFolderId]
          },
        });

        const subfolderId = subfolderResponse.data.id!;
        console.log(`📁 Created subfolder: ${cluster.suggestedFolderName} in ${this.capitalizeWords(cluster.category)}`);

        // Move files to folder
        for (const file of cluster.files) {
          if (file.confidence > 0.7) { // Only move high-confidence files
            try {
              // First get the current file metadata to check if it's already a shortcut
              const fileMetadata = await drive.files.get({
                fileId: file.fileId,
                fields: 'mimeType,shortcutDetails'
              });

              // Skip if this is already a shortcut
              if (fileMetadata.data.mimeType === 'application/vnd.google-apps.shortcut') {
                console.log(`⏭️  Skipping ${file.fileName} - already a shortcut`);
                continue;
              }

              // Create a shortcut in the target folder
              const shortcutMetadata = {
                name: file.fileName,
                mimeType: 'application/vnd.google-apps.shortcut',
                parents: [subfolderId],
                shortcutDetails: {
                  targetId: file.fileId,
                  targetMimeType: fileMetadata.data.mimeType || 'application/octet-stream'
                }
              };

              const shortcut = await drive.files.create({
                requestBody: shortcutMetadata,
                fields: 'id,shortcutDetails'
              });

              console.log(`✅ Created shortcut for ${file.fileName} in ${cluster.suggestedFolderName} (${this.capitalizeWords(cluster.category)})`);
            } catch (error) {
              console.error(`❌ Failed to create shortcut for ${file.fileName}:`, error);
              // Continue with next file instead of breaking the loop
              continue;
            }
          }
        }
      } catch (error) {
        console.error(`❌ Failed to process cluster ${cluster.name}:`, error);
        // Continue with next cluster instead of breaking the loop
        continue;
      }
    }

    return {
      clusters: options.clusters,
      summary: {
        totalFiles: options.clusters.reduce((sum, c) => sum + c.files.length, 0),
        clustersCreated: options.clusters.length,
        estimatedSavings: options.clusters.length * 0.5, // Rough estimate
        confidence: options.clusters.reduce((sum, c) => 
          sum + (c.files.reduce((fSum, f) => fSum + f.confidence, 0) / c.files.length), 0
        ) / options.clusters.length
      },
      actions: {
        createFolders: true,
        moveFiles: true,
        addLabels: false
      }
    };
  }

  // ===================================================================
  // HELPER METHODS
  // ===================================================================
  
  private async getFileDataWithEmbeddings(userId: string): Promise<FileWithEmbedding[]> {
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

    return embeddings.map(e => ({
      fileId: e.fileId,
      fileName: e.fileName,
      embedding: e.embedding as number[],
      content: e.content,
      metadata: e.metadata as any,
      folderPath: (e.metadata as any)?.folderPath
    }));
  }

  private async analyzeClusterTheme(files: FileWithEmbedding[]): Promise<{
    name: string;
    description: string;
    folderName: string;
    category: FileCluster['category'];
    keywords: string[];
  }> {
    // Get file metadata for better analysis
    const fileNames = files.map(f => f.fileName.toLowerCase());
    const allText = files.map(f => f.content?.substring(0, 200) || '').join(' ').toLowerCase();
    const fileTypes = files.map(f => (f.metadata as any)?.mimeType?.toLowerCase() || '');

    // Enhanced category detection
    const categoryScores = {
      work: 0,
      personal: 0,
      media: 0,
      documents: 0,
      archive: 0,
      mixed: 0
    };

    // Score based on file types
    fileTypes.forEach(type => {
      if (type.includes('image') || type.includes('video') || type.includes('audio')) {
        categoryScores.media += 2;
      } else if (type.includes('document') || type.includes('pdf') || type.includes('text')) {
        categoryScores.documents += 2;
      }
    });

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

  private extractCommonWords(fileNames: string[]): string[] {
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

  private calculateOrganizationMetrics(files: FileWithEmbedding[], clusters: FileCluster[]): {
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
      confidence: averageConfidence
    };
  }

  private getClusterColor(index: number): string {
    const colors = [
      '#3B82F6', '#EF4444', '#10B981', '#F59E0B',
      '#8B5CF6', '#06B6D4', '#F97316', '#84CC16'
    ];
    return colors[index % colors.length];
  }

  private improveFolderName(currentPath: string, theme: any): string {
    if (currentPath === 'Root') return theme.folderName;
    
    const pathParts = currentPath.split('/').filter(Boolean);
    const lastPart = pathParts[pathParts.length - 1];
    
    return `${lastPart} - Organized`;
  }

  private capitalizeWords(str: string): string {
    return str.split(' ').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
    ).join(' ');
  }
}

interface FileWithEmbedding {
  fileId: string;
  fileName: string;
  embedding: number[];
  content?: string;
  metadata?: any;
  folderPath?: string;
}