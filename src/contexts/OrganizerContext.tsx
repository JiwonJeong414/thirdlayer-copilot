import React, { createContext, useContext, useState, useCallback } from 'react';
import { 
  OrganizationSuggestion, 
  OrganizationStats, 
  OrganizationMethod,
  FileCluster 
} from '../types/organizer';

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

interface FileWithEmbedding {
  fileId: string;
  fileName: string;
  embedding: number[];
  content?: string;
  metadata?: any;
  folderPath?: string;
}

interface OrganizerContextType {
  isAnalyzing: boolean;
  isOrganizing: boolean;
  suggestion: OrganizationSuggestion | null;
  selectedMethod: OrganizationMethod;
  maxClusters: number;
  minClusterSize: number;
  createFolders: boolean;
  selectedClusters: Set<string>;
  stats: OrganizationStats;
  
  // Actions
  setSelectedMethod: (method: OrganizationMethod) => void;
  setMaxClusters: (max: number) => void;
  setMinClusterSize: (min: number) => void;
  setCreateFolders: (create: boolean) => void;
  toggleCluster: (clusterId: string) => void;
  toggleAllClusters: () => void;
  runAnalysis: () => Promise<void>;
  executeOrganization: () => Promise<void>;
  resetSuggestion: () => void;
}

const OrganizerContext = createContext<OrganizerContextType | undefined>(undefined);

export function OrganizerProvider({ children }: { children: React.ReactNode }) {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isOrganizing, setIsOrganizing] = useState(false);
  const [suggestion, setSuggestion] = useState<OrganizationSuggestion | null>(null);
  const [selectedMethod, setSelectedMethod] = useState<OrganizationMethod>('hybrid');
  const [maxClusters, setMaxClusters] = useState(6);
  const [minClusterSize, setMinClusterSize] = useState(3);
  const [createFolders, setCreateFolders] = useState(false);
  const [selectedClusters, setSelectedClusters] = useState<Set<string>>(new Set());
  const [stats, setStats] = useState<OrganizationStats>({
    indexedFiles: 0,
    lastOrganization: null,
    organizationCount: 0
  });

  const runAnalysis = useCallback(async () => {
    setIsAnalyzing(true);
    try {
      console.log('🎯 Starting organization analysis...');
      
      // Call the API directly - it will handle session-based auth internally
      const response = await fetch('/api/organize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          method: selectedMethod,
          maxClusters,
          minClusterSize,
          createFolders: false, // Always dry run for analysis
          dryRun: true
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Organization analysis failed');
      }
      
      const result = await response.json();
      setSuggestion(result);
      setSelectedClusters(new Set(result.clusters.map((c: FileCluster) => c.id)));
      
    } catch (error) {
      console.error('Analysis failed:', error);
      alert('Failed to analyze files for organization: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setIsAnalyzing(false);
    }
  }, [selectedMethod, maxClusters, minClusterSize]);

  const executeOrganization = useCallback(async () => {
    if (!suggestion) return;
    
    const selectedClusterIds = Array.from(selectedClusters);
    const selectedClusterData = suggestion.clusters.filter(c => selectedClusterIds.includes(c.id));
    
    if (selectedClusterData.length === 0) {
      alert('Please select at least one cluster to organize');
      return;
    }

    const confirmed = confirm(
      `🚀 Create ${selectedClusterData.length} folders and organize ${
        selectedClusterData.reduce((sum, c) => sum + c.files.length, 0)
      } files?\n\nThis will:\n• Create new folders in Google Drive\n• Move files to appropriate folders\n• This action cannot be undone`
    );

    if (!confirmed) return;

    setIsOrganizing(true);
    try {
      console.log('🚀 Executing organization with clusters:', selectedClusterData.map(c => ({ 
        id: c.id, 
        name: c.name, 
        fileCount: c.files.length,
        files: c.files.slice(0, 3).map(f => f.fileName)
      })));

      const response = await fetch('/api/organize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          method: selectedMethod,
          maxClusters,
          minClusterSize,
          createFolders: true,
          dryRun: false,
          selectedClusters: selectedClusterIds,
          selectedClusterNames: selectedClusterData.map(c => c.name),
          selectedClusterInfo: selectedClusterData.map(c => ({
            id: c.id,
            name: c.name,
            fileCount: c.files.length,
            category: c.category,
            files: c.files.map(f => ({
              fileId: f.fileId,
              fileName: f.fileName,
              confidence: f.confidence,
              keywords: f.keywords
            }))
          }))
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Organization execution failed');
      }
      
      const result = await response.json();
      
      // Update stats after successful organization
      setStats(prev => ({
        ...prev,
        organizationCount: prev.organizationCount + 1,
        lastOrganization: new Date()
      }));
      
      alert(`🎉 Organization completed successfully! 
      
Processed ${result.summary?.totalFiles || selectedClusterData.reduce((sum, c) => sum + c.files.length, 0)} files across ${selectedClusterData.length} folders.

Check your Google Drive for the new folder structure.`);
      
      setSuggestion(null);
      setSelectedClusters(new Set());
      
    } catch (error) {
      console.error('Organization failed:', error);
      alert(`Failed to organize files: ${error instanceof Error ? error.message : 'Unknown error'}. Please try again.`);
    } finally {
      setIsOrganizing(false);
    }
  }, [suggestion, selectedClusters, selectedMethod, maxClusters, minClusterSize]);

  const toggleCluster = useCallback((clusterId: string) => {
    setSelectedClusters(prev => {
      const next = new Set(prev);
      if (next.has(clusterId)) {
        next.delete(clusterId);
      } else {
        next.add(clusterId);
      }
      return next;
    });
  }, []);

  const toggleAllClusters = useCallback(() => {
    if (!suggestion) return;
    
    if (selectedClusters.size === suggestion.clusters.length) {
      setSelectedClusters(new Set());
    } else {
      setSelectedClusters(new Set(suggestion.clusters.map(c => c.id)));
    }
  }, [suggestion, selectedClusters]);

  const resetSuggestion = useCallback(() => {
    setSuggestion(null);
    setSelectedClusters(new Set());
  }, []);

  const value = {
    isAnalyzing,
    isOrganizing,
    suggestion,
    selectedMethod,
    maxClusters,
    minClusterSize,
    createFolders,
    selectedClusters,
    stats,
    setSelectedMethod,
    setMaxClusters,
    setMinClusterSize,
    setCreateFolders,
    toggleCluster,
    toggleAllClusters,
    runAnalysis,
    executeOrganization,
    resetSuggestion
  };

  return (
    <OrganizerContext.Provider value={value}>
      {children}
    </OrganizerContext.Provider>
  );
}

export function useOrganizer() {
  const context = useContext(OrganizerContext);
  if (context === undefined) {
    throw new Error('useOrganizer must be used within an OrganizerProvider');
  }
  return context;
}