import { FileInfo } from '@/types';

export interface FileWithEmbedding {
  fileId: string;
  fileName: string;
  embedding: number[];
  content?: string;
  metadata?: any;
  folderPath?: string;
}

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
}

export class ClusteringService {
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