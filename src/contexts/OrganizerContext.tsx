import React, { createContext, useContext, useState, useCallback } from 'react';
import { 
  OrganizationSuggestion, 
  OrganizationStats, 
  OrganizationMethod,
  FileCluster 
} from '../types/organizer';

// Utility functions for organizer
const formatClusterName = (files: string[]): string => {
  // Extract common themes from filenames
  const words = files.flatMap(name => 
    name.toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 3)
  );

  const wordFreq = words.reduce((acc, word) => {
    acc[word] = (acc[word] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const topWords = Object.entries(wordFreq)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 2)
    .map(([word]) => word);

  if (topWords.length > 0) {
    return topWords.map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ') + ' Files';
  }

  return 'Miscellaneous Files';
};

const getClusterColorByCategory = (category: string): string => {
  const colors = {
    work: '#3B82F6',
    personal: '#10B981', 
    media: '#F59E0B',
    documents: '#8B5CF6',
    archive: '#6B7280',
    mixed: '#EF4444'
  };
  return colors[category as keyof typeof colors] || colors.mixed;
};

const calculateOrganizationScore = (clusters: FileCluster[]): number => {
  if (clusters.length === 0) return 0;
  
  const totalFiles = clusters.reduce((sum, cluster) => sum + cluster.files.length, 0);
  const avgConfidence = clusters.reduce((sum, cluster) => {
    const clusterConfidence = cluster.files.reduce((cSum: number, file: any) => cSum + file.confidence, 0) / cluster.files.length;
    return sum + clusterConfidence;
  }, 0) / clusters.length;

  // Score based on how well files are distributed and confidence
  const distributionScore = 1 - Math.abs(totalFiles / clusters.length - 5) / 10; // Ideal ~5 files per cluster
  const confidenceScore = avgConfidence;
  
  return Math.max(0, Math.min(1, (distributionScore + confidenceScore) / 2));
};

const generateTagsFromContent = (content: string, maxTags: number = 5): string[] => {
  // Simple keyword extraction
  const words = content.toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(word => word.length > 4 && word.length < 15);

  const stopWords = new Set(['that', 'this', 'with', 'from', 'they', 'been', 'have', 'were', 'said', 'each', 'which', 'their', 'time', 'will', 'about', 'would', 'there', 'could', 'other']);
  
  const wordFreq = words
    .filter(word => !stopWords.has(word))
    .reduce((acc, word) => {
      acc[word] = (acc[word] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

  return Object.entries(wordFreq)
    .sort(([,a], [,b]) => b - a)
    .slice(0, maxTags)
    .map(([word]) => word);
};

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
      
      const response = await fetch('/api/organize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          method: selectedMethod,
          maxClusters,
          minClusterSize,
          createFolders: false,
          dryRun: true
        }),
      });
      
      if (!response.ok) {
        throw new Error('Organization analysis failed');
      }
      
      const result = await response.json();
      setSuggestion(result);
      setSelectedClusters(new Set(result.clusters.map((c: FileCluster) => c.id)));
      
    } catch (error) {
      console.error('Analysis failed:', error);
      alert('Failed to analyze files for organization');
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