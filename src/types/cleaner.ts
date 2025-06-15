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

export interface ScanResponse {
  files: CleanableFile[];
  error?: string;
}

export interface CleanerFileCardProps {
  file: CleanableFile;
  dragOffset: { x: number; y: number };
  isDragging: boolean;
  onMouseDown: (e: React.MouseEvent) => void;
  onMouseMove: (e: React.MouseEvent) => void;
  onMouseUp: () => void;
  onTouchStart: (e: React.TouchEvent) => void;
  onTouchMove: (e: React.TouchEvent) => void;
  onTouchEnd: () => void;
  swipeHint: string | null;
}

export interface CleanerContextType {
  isScanning: boolean;
  scanError: string | null;
  scanResults: ScanResponse | null;
  startScan: (maxFiles?: number) => Promise<void>;
  deleteFile: (fileId: string) => Promise<boolean>;
} 