import React, { createContext, useContext, useState, useCallback } from 'react';
import { ScanResponse, CleanerContextType } from '@/types/cleaner';

const CleanerContext = createContext<CleanerContextType | undefined>(undefined);

export function CleanerProvider({ children }: { children: React.ReactNode }) {
  const [isScanning, setIsScanning] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const [scanResults, setScanResults] = useState<ScanResponse | null>(null);

  const startScan = useCallback(async (maxFiles: number = 5) => {
    try {
      setIsScanning(true);
      setScanError(null);
      
      console.log('🚀 Starting integrated scan (sync + cleanup)...');
      
      // Step 1: Sync new files first
      const syncResponse = await fetch('/api/drive/sync?limit=10', {
        method: 'POST',
      });
      
      if (syncResponse.ok) {
        const syncData = await syncResponse.json();
        console.log('✅ Sync completed:', {
          newFiles: syncData.embeddingCount,
          totalIndexed: syncData.totalIndexedFiles
        });
      }
      
      // Step 2: Scan for cleanable files
      const cleanupResponse = await fetch('/api/drive/cleaner/scan', {
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
      
      if (cleanupData.files && cleanupData.files.length > 0) {
        const limitedFiles = cleanupData.files.slice(0, maxFiles);
        console.log(`📱 Loaded ${limitedFiles.length} files for swiping`);
        setScanResults({ files: limitedFiles });
      } else {
        setScanResults({ 
          files: [],
          error: 'No cleanable files found in this batch. Your Drive looks clean! 🎉 Try again to scan more files.'
        });
      }
    } catch (error) {
      console.error('❌ Integrated scan failed:', error);
      setScanError(error instanceof Error ? error.message : 'Failed to scan files');
      setScanResults({ 
        files: [],
        error: error instanceof Error ? error.message : 'Failed to scan files'
      });
    } finally {
      setIsScanning(false);
    }
  }, []);

  const deleteFile = useCallback(async (fileId: string): Promise<boolean> => {
    try {
      const response = await fetch('/api/drive/cleaner/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          fileIds: [fileId],
          dryRun: false 
        }),
      });
      
      if (!response.ok) {
        throw new Error('Delete failed');
      }
      
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