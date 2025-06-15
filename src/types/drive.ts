// Types for Google Drive integration and document search functionality

// Represents a file that has been indexed for search
export interface IndexedFile {
  fileId: string;      // Google Drive file ID
  fileName: string;    // Name of the file
  chunkCount: number;  // Number of text chunks the file was split into
  lastUpdated: Date;   // Last time the file was updated
}

// Represents a search result from document search
export interface SearchResult {
  content: string;     // The matching content snippet
  fileName: string;    // Name of the file containing the match
  fileId: string;      // Google Drive file ID
  similarity: number;  // Similarity score (0-1)
}

// Progress tracking for drive sync operations
export interface SyncProgress {
  totalFiles: number;      // Total number of files to process
  processedCount: number;  // Number of files processed
  errorCount: number;      // Number of files that failed to process
}

// Context interface for Drive functionality
export interface DriveContextType {
  indexedFiles: IndexedFile[];           // List of indexed files
  isSync: boolean;                       // Whether a sync is in progress
  syncProgress: SyncProgress | null;     // Current sync progress
  searchResults: SearchResult[];         // Current search results
  isSearching: boolean;                  // Whether a search is in progress
  syncDrive: () => Promise<void>;        // Start a new sync
  searchDocuments: (query: string, limit?: number) => Promise<SearchResult[]>;  // Search documents
  fetchIndexedFiles: () => Promise<void>;  // Fetch list of indexed files
  clearSearch: () => void;               // Clear current search results
  refreshIndexedFiles: () => Promise<void>;  // Refresh the indexed files list
} 