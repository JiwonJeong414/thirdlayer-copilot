// src/components/DriveConnection.tsx
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
  Database
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useDrive } from '@/contexts/DriveContext';

export const DriveConnectionPanel = () => {
  const { driveConnection, connectDrive, disconnectDrive } = useAuth();
  const { 
    indexedFiles, 
    isSync, 
    syncProgress, 
    syncDrive 
  } = useDrive();
  const [showDetails, setShowDetails] = useState(false);

  const handleSync = async () => {
    try {
      await syncDrive();
    } catch (error) {
      console.error('Sync failed:', error);
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
              <button
                onClick={handleSync}
                disabled={isSync}
                className="flex items-center space-x-1 px-3 py-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 disabled:cursor-not-allowed text-white rounded text-sm transition-colors"
              >
                {isSync ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <RefreshCw className="w-4 h-4" />
                )}
                <span>{isSync ? 'Syncing...' : 'Sync'}</span>
              </button>
              <button
                onClick={disconnectDrive}
                className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-sm transition-colors"
              >
                Disconnect
              </button>
            </>
          ) : (
            <button
              onClick={connectDrive}
              className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm transition-colors"
            >
              Connect Drive
            </button>
          )}
        </div>
      </div>

      {/* Sync Progress */}
      {isSync && syncProgress && (
        <div className="mb-4 p-3 bg-gray-700 rounded">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-300">Syncing your documents...</span>
            <span className="text-xs text-gray-400">
              {syncProgress.processedCount}/{syncProgress.totalFiles}
            </span>
          </div>
          <div className="w-full bg-gray-600 rounded-full h-2">
            <div
              className="bg-blue-500 h-2 rounded-full transition-all duration-300"
              style={{
                width: `${(syncProgress.processedCount / syncProgress.totalFiles) * 100}%`
              }}
            />
          </div>
          {syncProgress.errorCount > 0 && (
            <div className="flex items-center space-x-1 mt-2">
              <AlertCircle className="w-4 h-4 text-yellow-400" />
              <span className="text-xs text-yellow-400">
                {syncProgress.errorCount} files couldn't be processed
              </span>
            </div>
          )}
        </div>
      )}

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
              <p className="text-sm text-gray-500">No documents indexed yet</p>
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

// src/components/DriveSearchResults.tsx
export const DriveSearchResults = ({ 
  results, 
  isVisible, 
  onClose 
}: { 
  results: any[], 
  isVisible: boolean, 
  onClose: () => void 
}) => {
  if (!isVisible || results.length === 0) return null;

  return (
    <div className="absolute top-full left-0 right-0 mt-2 bg-gray-800 border border-gray-600 rounded-lg shadow-lg z-50 max-h-64 overflow-y-auto">
      <div className="p-3 border-b border-gray-700">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-white">Drive Search Results</span>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white text-sm"
          >
            Close
          </button>
        </div>
      </div>
      
      <div className="p-2">
        {results.map((result, index) => (
          <div key={index} className="p-3 hover:bg-gray-700 rounded cursor-pointer">
            <div className="flex items-start space-x-2">
              <FileText className="w-4 h-4 text-blue-400 mt-1 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">
                  {result.fileName}
                </p>
                <p className="text-xs text-gray-400 line-clamp-2 mt-1">
                  {result.content.substring(0, 150)}...
                </p>
                <div className="flex items-center space-x-2 mt-2">
                  <span className="text-xs text-green-400">
                    {(result.similarity * 100).toFixed(1)}% match
                  </span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};