export type OrganizationMethod = 'folders' | 'clustering' | 'hybrid';
export type ClusterCategory = 'work' | 'personal' | 'media' | 'documents' | 'archive' | 'mixed';

export interface FileInfo {
  fileId: string;
  fileName: string;
  confidence: number;
  keywords: string[];
}

export interface FileCluster {
  id: string;
  name: string;
  description: string;
  color: string;
  files: FileInfo[];
  suggestedFolderName: string;
  category: ClusterCategory;
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

export interface OrganizationStats {
  indexedFiles: number;
  lastOrganization: Date | null;
  organizationCount: number;
}

export interface OrganizerContextType {
  isAnalyzing: boolean;
  isOrganizing: boolean;
  suggestion: OrganizationSuggestion | null;
  selectedMethod: OrganizationMethod;
  maxClusters: number;
  minClusterSize: number;
  createFolders: boolean;
  selectedClusters: Set<string>;
  stats: OrganizationStats;
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