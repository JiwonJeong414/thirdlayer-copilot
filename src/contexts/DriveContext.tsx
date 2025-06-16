// DriveContext - Manages Google Drive integration and document search functionality
'use client';

import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { useAuth } from './AuthContext';
import type { 
  DriveContextType, 
  IndexedFile, 
  DriveContext, 
  SyncProgress 
} from '@/types/drive';

// Create context with undefined as initial value
const DriveContextProvider = createContext<DriveContextType | undefined>(undefined);

// Custom hook to use Drive context
export const useDrive = () => {
  const context = useContext(DriveContextProvider);
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
  const [searchResults, setSearchResults] = useState<DriveContext[]>([]);
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
    setSyncProgress({
      totalFiles: 0,
      processedFiles: 0,
      currentFile: '',
      embeddingsCreated: 0,
      skipped: 0,
      errors: 0,
      isComplete: false
    });

    try {
      const response = await fetch('/api/drive/sync', {
        method: 'POST',
      });

      if (response.ok) {
        const data = await response.json();
        setSyncProgress({
          totalFiles: data.totalFiles,
          processedFiles: data.processedCount,
          currentFile: data.currentFile,
          embeddingsCreated: data.embeddingsCreated,
          skipped: data.skipped,
          errors: data.errors,
          isComplete: false
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
  const searchDocuments = async (query: string, limit: number = 5): Promise<DriveContext[]> => {
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
    <DriveContextProvider
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
    </DriveContextProvider>
  );
};

export default DriveProvider;