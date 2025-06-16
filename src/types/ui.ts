import { CleanableFile } from './cleaner';

// src/types/ui.ts - UI component prop types
export interface CleanerUIProps {
  onBack: () => void;
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

export interface OrganizerCardProps {
  onActivate: () => void;
}

export interface OrganizerDashboardProps {
  onBack: () => void;
}

// Common component props
export interface BaseComponentProps {
  className?: string;
  children?: React.ReactNode;
}

export interface LoadingState {
  isLoading: boolean;
  error?: string | null;
}

export interface PaginationParams {
  page: number;
  limit: number;
  total?: number;
} 