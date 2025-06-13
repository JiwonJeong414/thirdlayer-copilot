// src/components/DriveConnection.tsx - Updated Drive connection component
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
  const { driveConnection, user } = useAuth();
  const { 
    indexedFiles, 
    isSync, 
    syncProgress, 
    syncDrive 
  } = useDrive();
  const [showDetails, setShowDetails] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);

  const handleSync = async () => {
    try {
      await syncDrive();
    } catch (error) {
      console.error('Sync failed:', error);
      alert('Sync failed. Please try again.');
    }
  };

  const handleConnect = async () => {
    if (!user) {
      alert('Please sign in first');
      return;
    }

    setIsConnecting(true);
    try {
      console.log('Starting Drive connection process...');
      
      // Get the Drive-specific OAuth URL
      const response = await fetch('/api/drive/auth-url');
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to get auth URL');
      }
      
      const { url } = await response.json();
      console.log('Got Drive OAuth URL, redirecting...');
      
      // Redirect to Google's OAuth page
      window.location.href = url;
    } catch (error) {
      console.error('Error connecting to Drive:', error);
      alert(`Failed to connect to Drive: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    if (!confirm('Are you sure you want to disconnect Google Drive? This will remove all indexed documents.')) {
      return;
    }

    try {
      const response = await fetch('/api/drive/disconnect', {
        method: 'POST',
      });

      if (response.ok) {
        // Refresh the page to update the connection status
        window.location.reload();
      } else {
        throw new Error('Failed to disconnect');
      }
    } catch (error) {
      console.error('Error disconnecting Drive:', error);
      alert('Failed to disconnect Drive. Please try again.');
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
                onClick={handleDisconnect}
                className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-sm transition-colors"
              >
                Disconnect
              </button>
            </>
          ) : (
            <button
              onClick={handleConnect}
              disabled={isConnecting}
              className="flex items-center space-x-1 px-3 py-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 disabled:cursor-not-allowed text-white rounded text-sm transition-colors"
            >
              {isConnecting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Cloud className="w-4 h-4" />
              )}
              <span>{isConnecting ? 'Connecting...' : 'Connect Drive'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Connection Info */}
      {driveConnection.isConnected && (
        <div className="text-xs text-gray-400 mb-4">
          Connected on {new Date(driveConnection.connectedAt || '').toLocaleDateString()}
          {driveConnection.lastSyncAt && (
            <span> • Last sync: {new Date(driveConnection.lastSyncAt).toLocaleDateString()}</span>
          )}
        </div>
      )}

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
              <p className="text-sm text-gray-500">No documents indexed yet. Click "Sync" to start.</p>
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