export interface CleanableFile {
  id: string;
  name: string;
  mimeType: string;
  size: number;
  modifiedTime: string;
  webViewLink?: string;
  thumbnailLink?: string;
  content?: string;
  category: 'empty' | 'tiny' | 'small' | 'duplicate' | 'old' | 'low_quality' | 'system';
  reason: string;
  confidence: 'low' | 'medium' | 'high';
  aiSummary?: string;
  duplicateOf?: string;
  selected: boolean;
}

export interface SwipeDecision {
  fileId: string;
  action: 'keep' | 'delete';
  timestamp: number;
}

export interface CleanerUIProps {
  onBack: () => void;
} 