// DriveContext - Manages Google Drive integration and document search functionality
'use client';

import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { 
  DriveContextType, 
  IndexedFile, 
  SearchResult, 
  SyncProgress 
} from '@/types/drive';

// Create context with undefined as initial value
const DriveContext = createContext<DriveContextType | undefined>(undefined);

// Custom hook to use Drive context
export const useDrive = () => {
  const context = useContext(DriveContext);
  if (!context) {
    throw new Error('useDrive must be used within a DriveProvider');
  }
  return context;
};

// Provider component that wraps the app and makes drive functionality available
export const DriveProvider = ({ children }: { children: ReactNode }) => {
  const { user, driveConnection } = useAuth();
  
  // State management for drive functionality
  const [indexedFiles, setIndexedFiles] = useState<IndexedFile[]>([]);
  const [isSync, setIsSync] = useState(false);
  const [syncProgress, setSyncProgress] = useState<SyncProgress | null>(null);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // Fetch the list of indexed files from the server
  const fetchIndexedFiles = async () => {
    if (!user || !driveConnection.isConnected) return;

    try {
      console.log('Fetching indexed files...');
      const response = await fetch('/api/drive/files');

      if (response.ok) {
        const data = await response.json();
        console.log(`Fetched ${data.files.length} indexed files`);
        setIndexedFiles(data.files);
      } else {
        console.error('Failed to fetch indexed files');
      }
    } catch (error) {
      console.error('Error fetching indexed files:', error);
    }
  };

  // Refresh the list of indexed files
  const refreshIndexedFiles = async () => {
    console.log('Refreshing indexed files...');
    await fetchIndexedFiles();
  };

  // Fetch indexed files when user connects to drive
  useEffect(() => {
    if (user && driveConnection.isConnected) {
      fetchIndexedFiles();
    }
  }, [user, driveConnection.isConnected]);

  // Start a new sync operation with Google Drive
  const syncDrive = async () => {
    if (!user || !driveConnection.isConnected || isSync) return;

    setIsSync(true);
    setSyncProgress({ totalFiles: 0, processedCount: 0, errorCount: 0 });

    try {
      const response = await fetch('/api/drive/sync', {
        method: 'POST',
      });

      if (response.ok) {
        const data = await response.json();
        setSyncProgress({
          totalFiles: data.totalFiles,
          processedCount: data.processedCount,
          errorCount: data.errorCount,
        });
        
        // Refresh indexed files after successful sync
        await refreshIndexedFiles();
      } else {
        throw new Error('Sync failed');
      }
    } catch (error) {
      console.error('Error syncing Drive:', error);
      throw error;
    } finally {
      setIsSync(false);
    }
  };

  // Search through indexed documents
  const searchDocuments = async (query: string, limit: number = 5): Promise<SearchResult[]> => {
    if (!user || !driveConnection.isConnected) {
      throw new Error('Drive not connected');
    }

    setIsSearching(true);
    try {
      const response = await fetch('/api/drive/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query, limit }),
      });

      if (response.ok) {
        const data = await response.json();
        setSearchResults(data.results);
        return data.results;
      } else {
        throw new Error('Search failed');
      }
    } catch (error) {
      console.error('Error searching documents:', error);
      throw error;
    } finally {
      setIsSearching(false);
    }
  };

  // Clear current search results
  const clearSearch = () => {
    setSearchResults([]);
  };

  // Provide drive functionality to children components
  return (
    <DriveContext.Provider
      value={{
        indexedFiles,
        isSync,
        syncProgress,
        searchResults,
        isSearching,
        syncDrive,
        searchDocuments,
        fetchIndexedFiles,
        clearSearch,
        refreshIndexedFiles,
      }}
    >
      {children}
    </DriveContext.Provider>
  );
};

export default DriveProvider;