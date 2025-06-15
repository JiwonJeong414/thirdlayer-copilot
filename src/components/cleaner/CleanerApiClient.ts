import { CleanableFile } from '@/types/cleaner';

interface ScanResponse {
  files: CleanableFile[];
  error?: string;
}

/**
 * Frontend API client for the Drive Cleaner service
 * Handles communication between the UI and the backend DriveCleanerService
 */
export class CleanerApiClient {
  /**
   * Initiates a scan for cleanable files
   * @param maxFiles Maximum number of files to scan
   * @returns Promise with scan results
   */
  static async startScan(maxFiles: number = 5): Promise<ScanResponse> {
    try {
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
        return { files: limitedFiles };
      } else {
        return { 
          files: [],
          error: 'No cleanable files found in this batch. Your Drive looks clean! 🎉 Try again to scan more files.'
        };
      }
    } catch (error) {
      console.error('❌ Integrated scan failed:', error);
      return { 
        files: [],
        error: error instanceof Error ? error.message : 'Failed to scan files'
      };
    }
  }

  /**
   * Deletes a file from the drive
   * @param fileId ID of the file to delete
   * @returns Promise indicating success or failure
   */
  static async deleteFile(fileId: string): Promise<boolean> {
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
      
      return true;
    } catch (error) {
      console.error('❌ Failed to delete file:', error);
      return false;
    }
  }
} 