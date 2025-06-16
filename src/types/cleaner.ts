// src/types/cleaner.ts - File cleanup types
export type FileCategory = 'empty' | 'tiny' | 'small' | 'duplicate' | 'old' | 'low_quality' | 'system';
export type ConfidenceLevel = 'low' | 'medium' | 'high';
export type SwipeAction = 'keep' | 'delete';

export interface CleanableFile {
  id: string;
  name: string;
  mimeType: string;
  size: number;
  modifiedTime: string;
  webViewLink?: string;
  thumbnailLink?: string;
  content?: string;
  category: FileCategory;
  reason: string;
  confidence: ConfidenceLevel;
  aiSummary?: string;
  duplicateOf?: string;
  selected: boolean;
}

export interface SwipeDecision {
  fileId: string;
  action: SwipeAction;
  timestamp: number;
}

export interface ScanResponse {
  files: CleanableFile[];
  batchSuggestion?: {
    autoDelete: CleanableFile[];
    review: CleanableFile[];
    keep: CleanableFile[];
    summary: string;
  };
  summary?: {
    totalFound: number;
    scanMethod: string;
    highConfidence: number;
    mediumConfidence: number;
    lowConfidence: number;
    categories: Record<FileCategory, number>;
  };
  error?: string;
}

export interface CleanerContextType {
  isScanning: boolean;
  scanError: string | null;
  scanResults: ScanResponse | null;
  startScan: (maxFiles?: number) => Promise<void>;
  deleteFile: (fileId: string) => Promise<boolean>;
} 