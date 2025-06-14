// src/contexts/DriveContext.tsx - FIXED to refresh indexed files after sync
'use client';

import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { useAuth } from './AuthContext';

interface IndexedFile {
  fileId: string;
  fileName: string;
  chunkCount: number;
  lastUpdated: Date;
}

interface SearchResult {
  content: string;
  fileName: string;
  fileId: string;
  similarity: number;
}

interface DriveContextType {
  indexedFiles: IndexedFile[];
  isSync: boolean;
  syncProgress: {
    totalFiles: number;
    processedCount: number;
    errorCount: number;
  } | null;
  searchResults: SearchResult[];
  isSearching: boolean;
  syncDrive: () => Promise<void>;
  searchDocuments: (query: string, limit?: number) => Promise<SearchResult[]>;
  fetchIndexedFiles: () => Promise<void>;
  clearSearch: () => void;
  refreshIndexedFiles: () => Promise<void>; // Add this method
}

const DriveContext = createContext<DriveContextType | undefined>(undefined);

export const useDrive = () => {
  const context = useContext(DriveContext);
  if (!context) {
    throw new Error('useDrive must be used within a DriveProvider');
  }
  return context;
};

export const DriveProvider = ({ children }: { children: ReactNode }) => {
  const { user, driveConnection } = useAuth();
  const [indexedFiles, setIndexedFiles] = useState<IndexedFile[]>([]);
  const [isSync, setIsSync] = useState(false);
  const [syncProgress, setSyncProgress] = useState<{
    totalFiles: number;
    processedCount: number;
    errorCount: number;
  } | null>(null);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);

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

  const refreshIndexedFiles = async () => {
    console.log('Refreshing indexed files...');
    await fetchIndexedFiles();
  };

  useEffect(() => {
    if (user && driveConnection.isConnected) {
      fetchIndexedFiles();
    }
  }, [user, driveConnection.isConnected]);

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

  const clearSearch = () => {
    setSearchResults([]);
  };

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