// STEP 3: Test component to run the debug

// src/components/DriveDebug.tsx - NEW COMPONENT to test Drive access
'use client';

import React, { useState } from 'react';
import { AlertTriangle, CheckCircle, XCircle, RefreshCw } from 'lucide-react';

interface DebugInfo {
  error?: string;
  tokenInfo?: {
    email: string;
    scope: string;
    expires_in: number;
  };
  fileQueries?: Record<string, { error?: string; count?: number }>;
  diagnosis?: string[];
}

export const DriveDebugPanel = () => {
  const [debugInfo, setDebugInfo] = useState<DebugInfo | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const runDebug = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/drive/debug');
      const data = await response.json();
      setDebugInfo(data);
      console.log('Debug results:', data);
    } catch (error) {
      console.error('Debug failed:', error);
      setDebugInfo({ error: 'Debug failed: ' + (error instanceof Error ? error.message : String(error)) });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-gray-800 rounded-lg p-4 mb-4 border border-yellow-600">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <AlertTriangle className="w-5 h-5 text-yellow-400" />
          <span className="text-sm font-medium text-white">Drive Debug Panel</span>
        </div>
        <button
          onClick={runDebug}
          disabled={isLoading}
          className="flex items-center space-x-1 px-3 py-1 bg-yellow-600 hover:bg-yellow-700 disabled:bg-yellow-800 disabled:cursor-not-allowed text-white rounded text-sm transition-colors"
        >
          {isLoading ? (
            <RefreshCw className="w-4 h-4 animate-spin" />
          ) : (
            <AlertTriangle className="w-4 h-4" />
          )}
          <span>{isLoading ? 'Testing...' : 'Test Permissions'}</span>
        </button>
      </div>

      {debugInfo && (
        <div className="space-y-3">
          {debugInfo.error ? (
            <div className="bg-red-900 bg-opacity-30 border border-red-700 rounded p-3">
              <div className="flex items-center space-x-2">
                <XCircle className="w-4 h-4 text-red-400" />
                <span className="text-sm text-red-300">Error: {debugInfo.error}</span>
              </div>
            </div>
          ) : (
            <>
              {/* Token Info */}
              <div className="bg-gray-700 rounded p-3">
                <h4 className="text-sm font-medium text-white mb-2">Token Information</h4>
                <div className="text-xs text-gray-300 space-y-1">
                  <div>Email: {debugInfo.tokenInfo?.email}</div>
                  <div>Scopes: {debugInfo.tokenInfo?.scope}</div>
                  <div>Expires in: {debugInfo.tokenInfo?.expires_in} seconds</div>
                </div>
              </div>

              {/* File Query Results */}
              <div className="bg-gray-700 rounded p-3">
                <h4 className="text-sm font-medium text-white mb-2">File Access Test</h4>
                <div className="space-y-2">
                  {Object.entries(debugInfo.fileQueries || {}).map(([queryName, result]) => (
                    <div key={queryName} className="flex items-center justify-between text-xs">
                      <span className="text-gray-300">{queryName}:</span>
                      <span className={`${result.error ? 'text-red-400' : 'text-green-400'}`}>
                        {result.error ? '❌ Error' : `✅ ${result.count} files`}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Diagnosis */}
              <div className="bg-gray-700 rounded p-3">
                <h4 className="text-sm font-medium text-white mb-2">Diagnosis</h4>
                <div className="space-y-1">
                  {(debugInfo.diagnosis || []).map((issue, idx) => (
                    <div key={idx} className="text-xs text-gray-300">
                      {issue}
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      )}

      <div className="mt-4 text-xs text-gray-400">
        This panel helps diagnose Google Drive permission issues. Run the test to see what's wrong.
      </div>
    </div>
  );
};