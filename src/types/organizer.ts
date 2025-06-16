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

export type OrganizationMethod = 'folders' | 'clustering' | 'hybrid';

export interface OrganizerCardProps {
  onActivate: () => void;
} 