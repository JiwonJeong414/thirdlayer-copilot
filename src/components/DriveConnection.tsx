
// src/components/DriveConnection.tsx - Updated with quick sync option
'use client';

import React, { useState } from 'react';
import { 
  Cloud, 
  CloudOff, 
  RefreshCw, 
  FileText, 
  AlertCircle, 
  CheckCircle,
  Loader2,
  Database,
  Zap
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useDrive } from '@/contexts/DriveContext';

export const DriveConnectionPanel = () => {
  const { driveConnection, user } = useAuth();
  const { 
    indexedFiles, 
    isSync, 
    syncProgress, 
    syncDrive 
  } = useDrive();
  const [showDetails, setShowDetails] = useState(false);
  const [isQuickSyncing, setIsQuickSyncing] = useState(false);

  const handleQuickSync = async (limit: number = 10) => {
    setIsQuickSyncing(true);
    try {
      console.log(`Starting quick sync with limit: ${limit}`);
      
      const response = await fetch(`/api/drive/sync?limit=${limit}`, {
        method: 'POST',
      });
      
      if (!response.ok) {
        throw new Error('Quick sync failed');
      }
      
      const result = await response.json();
      console.log('Quick sync result:', result);
      
      // Refresh the indexed files list
      window.location.reload(); // Simple refresh for now
      
      alert(`Quick sync completed! 
      
Processed: ${result.processedCount} files
Embeddings created: ${result.embeddingCount}
Skipped: ${result.skippedCount}

${result.note}`);
      
    } catch (error) {
      console.error('Quick sync failed:', error);
      alert(`Quick sync failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsQuickSyncing(false);
    }
  };

  const handleConnect = async () => {
    if (!user) {
      alert('Please sign in first');
      return;
    }

    try {
      const response = await fetch('/api/drive/auth-url');
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to get auth URL');
      }
      
      const { url } = await response.json();
      window.location.href = url;
    } catch (error) {
      console.error('Error connecting to Drive:', error);
      alert(`Failed to connect to Drive: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  return (
    <div className="bg-gray-800 rounded-lg p-4 mb-4">
      {/* Connection Status */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          {driveConnection.isConnected ? (
            <div className="flex items-center space-x-2 text-green-400">
              <Cloud className="w-5 h-5" />
              <span className="text-sm font-medium">Google Drive Connected</span>
            </div>
          ) : (
            <div className="flex items-center space-x-2 text-gray-400">
              <CloudOff className="w-5 h-5" />
              <span className="text-sm font-medium">Google Drive Disconnected</span>
            </div>
          )}
        </div>
        
        <div className="flex items-center space-x-2">
          {driveConnection.isConnected ? (
            <>
              {/* Quick Sync Button */}
              <button
                onClick={() => handleQuickSync(10)}
                disabled={isQuickSyncing}
                className="flex items-center space-x-1 px-3 py-1 bg-green-600 hover:bg-green-700 disabled:bg-green-800 disabled:cursor-not-allowed text-white rounded text-sm transition-colors"
                title="Quick sync - process 10 recent files"
              >
                {isQuickSyncing ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Zap className="w-4 h-4" />
                )}
                <span>{isQuickSyncing ? 'Quick Sync...' : 'Quick Sync'}</span>
              </button>
              
              {/* More Options Dropdown */}
              <div className="relative group">
                <button className="px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm transition-colors">
                  ⋯
                </button>
                <div className="absolute right-0 top-full mt-1 bg-gray-700 rounded shadow-lg z-10 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none group-hover:pointer-events-auto">
                  <button
                    onClick={() => handleQuickSync(25)}
                    disabled={isQuickSyncing}
                    className="block w-full px-3 py-2 text-sm text-white hover:bg-gray-600 whitespace-nowrap"
                  >
                    Sync 25 files
                  </button>
                  <button
                    onClick={() => handleQuickSync(50)}
                    disabled={isQuickSyncing}
                    className="block w-full px-3 py-2 text-sm text-white hover:bg-gray-600 whitespace-nowrap"
                  >
                    Sync 50 files
                  </button>
                </div>
              </div>
            </>
          ) : (
            <button
              onClick={handleConnect}
              className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm transition-colors"
            >
              Connect Drive
            </button>
          )}
        </div>
      </div>

      {/* Quick Sync Info */}
      {driveConnection.isConnected && indexedFiles.length === 0 && (
        <div className="mb-4 p-3 bg-blue-900 bg-opacity-30 rounded border border-blue-700">
          <div className="flex items-start space-x-2">
            <Zap className="w-4 h-4 text-blue-400 mt-0.5" />
            <div>
              <p className="text-sm text-blue-300 font-medium">Ready to index your documents!</p>
              <p className="text-xs text-blue-400 mt-1">
                Click "Quick Sync" to process 10 recent files for testing. This will take ~2-3 minutes.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Rest of your existing component code... */}
      {/* Drive Statistics */}
      {driveConnection.isConnected && (
        <div className="flex items-center justify-between">
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="flex items-center space-x-2 text-sm text-gray-400 hover:text-white transition-colors"
          >
            <Database className="w-4 h-4" />
            <span>{indexedFiles.length} documents indexed</span>
          </button>
          
          {indexedFiles.length > 0 && (
            <div className="flex items-center space-x-1 text-green-400">
              <CheckCircle className="w-4 h-4" />
              <span className="text-xs">Ready for search</span>
            </div>
          )}
        </div>
      )}

      {/* File Details */}
      {showDetails && driveConnection.isConnected && (
        <div className="mt-4 pt-4 border-t border-gray-700">
          <div className="text-xs text-gray-400 mb-2">INDEXED DOCUMENTS</div>
          <div className="max-h-32 overflow-y-auto space-y-1">
            {indexedFiles.length === 0 ? (
              <p className="text-sm text-gray-500">No documents indexed yet. Click "Quick Sync" to start.</p>
            ) : (
              indexedFiles.map((file) => (
                <div key={file.fileId} className="flex items-center space-x-2 p-2 bg-gray-700 rounded">
                  <FileText className="w-4 h-4 text-blue-400" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-300 truncate">{file.fileName}</p>
                    <p className="text-xs text-gray-500">
                      {file.chunkCount} chunks • {new Date(file.lastUpdated).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};