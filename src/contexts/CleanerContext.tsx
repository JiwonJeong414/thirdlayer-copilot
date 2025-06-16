'use client';

import React, { createContext, useContext, useState, useCallback } from 'react';
import { ScanResponse, CleanerContextType } from '@/types';

const CleanerContext = createContext<CleanerContextType | undefined>(undefined);

export function CleanerProvider({ children }: { children: React.ReactNode }) {
  const [isScanning, setIsScanning] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const [scanResults, setScanResults] = useState<ScanResponse | null>(null);

  const startScan = useCallback(async (maxFiles: number = 5) => {
    try {
      setIsScanning(true);
      setScanError(null);
      
      console.log('🚀 Starting database-only cleanup scan...');
      
      // REMOVED: No more sync call - go directly to cleanup scan
      const cleanupResponse = await fetch('/api/cleaner/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          maxFiles,
          includeContent: true,
          enableAI: true,
          ownedOnly: true
        }),
      });
      
      if (!cleanupResponse.ok) {
        let errorMessage = 'Failed to scan files';
        try {
          const errorData = await cleanupResponse.json();
          errorMessage = errorData.error || errorData.details || errorMessage;
        } catch (parseError) {
          errorMessage = `HTTP ${cleanupResponse.status}: ${cleanupResponse.statusText}`;
        }
        throw new Error(errorMessage);
      }
      
      const cleanupData = await cleanupResponse.json();
      console.log('🔍 Scan response:', cleanupData);
      
      // Handle the response structure from your working API
      if (cleanupData.success && cleanupData.files && cleanupData.files.length > 0) {
        const limitedFiles = cleanupData.files.slice(0, maxFiles);
        console.log(`📱 Loaded ${limitedFiles.length} files for swiping`);
        
        // Set the full response data including batch suggestions and summary
        setScanResults({
          files: limitedFiles,
          batchSuggestion: cleanupData.batchSuggestion,
          summary: cleanupData.summary
        });
      } else {
        // Handle the case where no files are found
        const message = cleanupData.files?.length === 0 
          ? 'No cleanable files found in this batch. Your Drive looks clean! 🎉 Try again to scan more files.'
          : 'Failed to scan files';
          
        setScanResults({ 
          files: [],
          error: message
        });
        
        if (cleanupData.files?.length === 0) {
          console.log('✨ No cleanable files found - drive is clean!');
        }
      }
    } catch (error) {
      console.error('❌ Database scan failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to scan files';
      setScanError(errorMessage);
      setScanResults({ 
        files: [],
        error: errorMessage
      });
    } finally {
      setIsScanning(false);
    }
  }, []);

  const deleteFile = useCallback(async (fileId: string): Promise<boolean> => {
    try {
      const response = await fetch('/api/cleaner/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          fileIds: [fileId],
          dryRun: false 
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Delete failed');
      }
      
      const result = await response.json();
      console.log('🗑️ Delete result:', result);
      
      // Update scan results to remove the deleted file
      if (scanResults?.files) {
        setScanResults({
          ...scanResults,
          files: scanResults.files.filter(file => file.id !== fileId)
        });
      }
      
      return true;
    } catch (error) {
      console.error('❌ Failed to delete file:', error);
      return false;
    }
  }, [scanResults]);

  const value = {
    isScanning,
    scanError,
    scanResults,
    startScan,
    deleteFile,
  };

  return (
    <CleanerContext.Provider value={value}>
      {children}
    </CleanerContext.Provider>
  );
}

export function useCleaner() {
  const context = useContext(CleanerContext);
  if (context === undefined) {
    throw new Error('useCleaner must be used within a CleanerProvider');
  }
  return context;
}