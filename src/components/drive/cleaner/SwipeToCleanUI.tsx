// src/components/drive/cleaner/SwipeToCleanUI.tsx - Fixed and cleaned up
'use client';

import React, { useState, useRef } from 'react';
import { 
  Trash2, 
  Heart, 
  FileText, 
  Image, 
  Video, 
  Archive,
  Zap,
  ThumbsUp,
  ThumbsDown,
  RotateCcw,
  Sparkles,
  Brain,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Clock,
  Copy,
  HardDrive,
  ArrowLeft
} from 'lucide-react';

interface CleanableFile {
  id: string;
  name: string;
  mimeType: string;
  size: number;
  modifiedTime: string;
  webViewLink?: string;
  thumbnailLink?: string;
  content?: string;
  category: 'empty' | 'tiny' | 'small' | 'duplicate' | 'old' | 'low_quality' | 'system';
  reason: string;
  confidence: 'low' | 'medium' | 'high';
  aiSummary?: string;
  duplicateOf?: string;
  selected: boolean;
}

interface SwipeDecision {
  fileId: string;
  action: 'keep' | 'delete';
  timestamp: number;
}

interface SwipeToCleanUIProps {
  onBack: () => void;
}

export default function SwipeToCleanUI({ onBack }: SwipeToCleanUIProps) {
  const [files, setFiles] = useState<CleanableFile[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [decisions, setDecisions] = useState<SwipeDecision[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [autoCleanMode, setAutoCleanMode] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const cardRef = useRef<HTMLDivElement>(null);
  const startPosRef = useRef({ x: 0, y: 0 });

  // Integrated scan function that combines sync + cleanup scanning
  const startScan = async () => {
    setIsLoading(true);
    setError(null);
    setFiles([]);
    setCurrentIndex(0);
    setDecisions([]);
    
    try {
      console.log('🚀 Starting integrated scan (sync + cleanup)...');
      
      // Step 1: Sync new files first
      console.log('📥 Step 1: Syncing new files...');
      const syncResponse = await fetch('/api/drive/sync?limit=10', {
        method: 'POST',
      });
      
      if (syncResponse.ok) {
        const syncData = await syncResponse.json();
        console.log('✅ Sync completed:', {
          newFiles: syncData.embeddingCount,
          totalIndexed: syncData.totalIndexedFiles
        });
        
        // Show quick notification
        const toast = document.createElement('div');
        toast.className = 'fixed top-4 right-4 bg-blue-600 text-white px-4 py-2 rounded-lg z-50';
        toast.textContent = `📥 Synced ${syncData.embeddingCount || 0} new files`;
        document.body.appendChild(toast);
        setTimeout(() => {
          if (document.body.contains(toast)) {
            document.body.removeChild(toast);
          }
        }, 3000);
      } else {
        console.warn('⚠️ Sync failed, proceeding with cleanup scan anyway');
      }
      
      // Step 2: Scan for cleanable files
      console.log('🧹 Step 2: Scanning for cleanable files...');
      const cleanupResponse = await fetch('/api/drive/cleaner/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          maxFiles: 5,
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
      console.log('✅ Cleanup scan completed:', cleanupData);
      
      if (cleanupData.files && cleanupData.files.length > 0) {
        const limitedFiles = cleanupData.files.slice(0, 5);
        setFiles(limitedFiles);
        console.log(`📱 Loaded ${limitedFiles.length} files for swiping`);
      } else {
        setError('No cleanable files found in this batch. Your Drive looks clean! 🎉 Try again to scan more files.');
      }
    } catch (error) {
      console.error('❌ Integrated scan failed:', error);
      setError(error instanceof Error ? error.message : 'Failed to scan files');
    } finally {
      setIsLoading(false);
    }
  };

  const currentFile = files[currentIndex];
  const hasMoreFiles = currentIndex < files.length;
  const progress = files.length > 0 ? ((currentIndex) / files.length) * 100 : 0;

  // Touch/Mouse event handlers
  const handleStart = (clientX: number, clientY: number) => {
    setIsDragging(true);
    startPosRef.current = { x: clientX, y: clientY };
  };

  const handleMove = (clientX: number, clientY: number) => {
    if (!isDragging) return;
    
    const deltaX = clientX - startPosRef.current.x;
    const deltaY = clientY - startPosRef.current.y;
    setDragOffset({ x: deltaX, y: deltaY });
  };

  const handleEnd = () => {
    if (!isDragging) return;
    
    const threshold = 100;
    const { x } = dragOffset;
    
    if (Math.abs(x) > threshold) {
      const action = x > 0 ? 'keep' : 'delete';
      makeDecision(action);
    }
    
    setIsDragging(false);
    setDragOffset({ x: 0, y: 0 });
  };

  // Mouse events
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    handleStart(e.clientX, e.clientY);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    handleMove(e.clientX, e.clientY);
  };

  const handleMouseUp = () => {
    handleEnd();
  };

  // Touch events
  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    handleStart(touch.clientX, touch.clientY);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    handleMove(touch.clientX, touch.clientY);
  };

  const handleTouchEnd = () => {
    handleEnd();
  };

  const makeDecision = async (action: 'keep' | 'delete') => {
    if (!currentFile) return;
    
    const decision: SwipeDecision = {
      fileId: currentFile.id,
      action,
      timestamp: Date.now()
    };
    
    // If user chose to delete, delete it immediately
    if (action === 'delete') {
      try {
        console.log(`🗑️ Deleting file immediately: ${currentFile.name}`);
        
        const response = await fetch('/api/drive/cleaner/delete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            fileIds: [currentFile.id],
            dryRun: false 
          }),
        });
        
        if (response.ok) {
          const data = await response.json();
          console.log(`✅ Successfully deleted: ${currentFile.name}`);
          
          // Show a quick success message
          const toast = document.createElement('div');
          toast.className = 'fixed top-4 right-4 bg-green-600 text-white px-4 py-2 rounded-lg z-50';
          toast.textContent = `🗑️ Deleted: ${currentFile.name}`;
          document.body.appendChild(toast);
          setTimeout(() => {
            if (document.body.contains(toast)) {
              document.body.removeChild(toast);
            }
          }, 2000);
        } else {
          throw new Error('Delete failed');
        }
      } catch (error) {
        console.error('❌ Failed to delete file:', error);
        
        // Show error message with reconnect suggestion
        const toast = document.createElement('div');
        toast.className = 'fixed top-4 right-4 bg-red-600 text-white px-4 py-3 rounded-lg z-50 max-w-sm';
        toast.innerHTML = `
          <div class="font-medium">❌ Permission Error</div>
          <div class="text-sm mb-2">Cannot delete "${currentFile.name}". You need delete permissions.</div>
          <button onclick="window.location.href='/api/auth/google/url'" class="bg-white text-red-600 px-2 py-1 rounded text-xs font-medium">
            Reconnect Drive
          </button>
        `;
        document.body.appendChild(toast);
        setTimeout(() => {
          if (document.body.contains(toast)) {
            document.body.removeChild(toast);
          }
        }, 8000);
      }
    }
    
    setDecisions(prev => [...prev, decision]);
    setCurrentIndex(prev => prev + 1);
    
    // Auto-advance in auto-clean mode
    if (autoCleanMode && currentIndex + 1 < files.length) {
      setTimeout(() => {
        const nextFile = files[currentIndex + 1];
        if (nextFile.confidence === 'high' && ['empty', 'system', 'duplicate'].includes(nextFile.category)) {
          makeDecision('delete');
        }
      }, 500);
    }
  };

  const undoLastDecision = () => {
    if (decisions.length === 0) return;
    
    setDecisions(prev => prev.slice(0, -1));
    setCurrentIndex(prev => Math.max(0, prev - 1));
  };

  const getSwipeHint = () => {
    const { x } = dragOffset;
    if (Math.abs(x) < 50) return null;
    
    return x > 0 ? 'KEEP' : 'DELETE';
  };

  const getConfidenceColor = (confidence: string) => {
    switch (confidence) {
      case 'high': return 'text-green-400 bg-green-900/30';
      case 'medium': return 'text-yellow-400 bg-yellow-900/30';
      case 'low': return 'text-red-400 bg-red-900/30';
      default: return 'text-gray-400 bg-gray-900/30';
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'empty': return <XCircle className="w-4 h-4 text-red-400" />;
      case 'system': return <HardDrive className="w-4 h-4 text-gray-400" />;
      case 'duplicate': return <Copy className="w-4 h-4 text-purple-400" />;
      case 'old': return <Clock className="w-4 h-4 text-orange-400" />;
      case 'low_quality': return <AlertTriangle className="w-4 h-4 text-yellow-400" />;
      default: return <FileText className="w-4 h-4 text-blue-400" />;
    }
  };

  const getFileIcon = (mimeType: string) => {
    if (mimeType.startsWith('image/')) return <Image className="w-8 h-8 text-purple-400" />;
    if (mimeType.startsWith('video/')) return <Video className="w-8 h-8 text-red-400" />;
    if (mimeType.includes('zip') || mimeType.includes('archive')) return <Archive className="w-8 h-8 text-orange-400" />;
    return <FileText className="w-8 h-8 text-blue-400" />;
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getFileAge = (modifiedTime: string): string => {
    const age = Date.now() - new Date(modifiedTime).getTime();
    const days = Math.floor(age / (24 * 60 * 60 * 1000));
    
    if (days < 1) return 'Today';
    if (days < 7) return `${days} days ago`;
    if (days < 30) return `${Math.floor(days / 7)} weeks ago`;
    if (days < 365) return `${Math.floor(days / 30)} months ago`;
    return `${Math.floor(days / 365)} years ago`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white overflow-hidden">
      <div className="max-w-md mx-auto p-6">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={onBack}
              className="flex items-center space-x-2 text-gray-400 hover:text-white transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back</span>
            </button>
            <div className="flex items-center space-x-3">
              <div className="p-3 bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl">
                <Sparkles className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                  Swipe to Clean
                </h1>
                <p className="text-gray-400 text-sm">AI-powered file cleanup</p>
              </div>
            </div>
            <div className="w-20" />
          </div>

          {/* Progress Bar */}
          {files.length > 0 && (
            <>
              <div className="w-full bg-gray-800 rounded-full h-2 mb-4">
                <div 
                  className="bg-gradient-to-r from-purple-500 to-pink-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
              
              <div className="flex justify-between text-sm text-gray-400">
                <span>{currentIndex} of {files.length}</span>
                <span>{decisions.filter(d => d.action === 'delete').length} to delete</span>
              </div>
            </>
          )}
        </div>

        {/* Control Buttons */}
        <div className="flex justify-center space-x-3 mb-6">
          <button
            onClick={startScan}
            disabled={isLoading}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 rounded-lg transition-colors"
          >
            {isLoading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                <span>Scanning Drive...</span>
              </>
            ) : (
              <>
                <Brain className="w-4 h-4" />
                <span>Find 5 Files</span>
              </>
            )}
          </button>

          <button
            onClick={() => setAutoCleanMode(!autoCleanMode)}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
              autoCleanMode 
                ? 'bg-green-600 hover:bg-green-700' 
                : 'bg-gray-600 hover:bg-gray-700'
            }`}
          >
            <Zap className="w-4 h-4" />
            <span>{autoCleanMode ? 'Auto ON' : 'Manual'}</span>
          </button>
        </div>

        {/* Error State */}
        {error && (
          <div className="bg-red-900/30 border border-red-700 rounded-xl p-6 mb-6">
            <div className="flex items-center space-x-3 mb-2">
              <AlertTriangle className="w-6 h-6 text-red-400" />
              <h3 className="text-lg font-medium text-white">Scan Error</h3>
            </div>
            <p className="text-red-300">{error}</p>
            <button
              onClick={startScan}
              className="mt-4 px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
            >
              Try Again
            </button>
          </div>
        )}

        {/* Main Card Area */}
        <div className="relative h-96 mb-6">
          {!hasMoreFiles ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <div className="w-16 h-16 bg-green-600/20 rounded-full mx-auto mb-4 flex items-center justify-center">
                  <CheckCircle className="w-8 h-8 text-green-400" />
                </div>
                <h3 className="text-xl font-medium text-white mb-2">Batch Complete!</h3>
                <p className="text-gray-400 mb-4">
                  {decisions.length === 0 
                    ? 'Click "Find 5 Files" to scan another batch of 5 files to clean.'
                    : `Reviewed ${decisions.length} files in this batch.`
                  }
                </p>
                <button
                  onClick={startScan}
                  className="px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
                >
                  Find Next 5 Files
                </button>
              </div>
            </div>
          ) : (
            <div
              ref={cardRef}
              className="absolute inset-0 cursor-grab active:cursor-grabbing"
              style={{
                transform: `translate(${dragOffset.x}px, ${dragOffset.y}px) rotate(${dragOffset.x * 0.1}deg)`,
                transition: isDragging ? 'none' : 'transform 0.3s ease-out',
              }}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
            >
              {/* Swipe Hint Overlay */}
              {getSwipeHint() && (
                <div className={`absolute inset-0 flex items-center justify-center z-10 rounded-xl border-4 ${
                  getSwipeHint() === 'KEEP' 
                    ? 'bg-green-500/20 border-green-500' 
                    : 'bg-red-500/20 border-red-500'
                }`}>
                  <div className="text-4xl font-bold">
                    {getSwipeHint() === 'KEEP' ? '💚 KEEP' : '🗑️ DELETE'}
                  </div>
                </div>
              )}

              {/* File Card */}
              <div className="bg-gray-800/90 backdrop-blur-sm border border-gray-700 rounded-xl p-6 h-full flex flex-col">
                {/* File Header */}
                <div className="flex items-start space-x-4 mb-4">
                  <div className="flex-shrink-0">
                    {getFileIcon(currentFile.mimeType)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-medium text-white truncate mb-1">
                      {currentFile.name}
                    </h3>
                    <div className="flex items-center space-x-2 text-sm text-gray-400">
                      <span>{formatFileSize(currentFile.size)}</span>
                      <span>•</span>
                      <span>{getFileAge(currentFile.modifiedTime)}</span>
                    </div>
                  </div>
                </div>

                {/* Category & Confidence */}
                <div className="flex items-center space-x-2 mb-4">
                  <div className="flex items-center space-x-1 px-2 py-1 bg-gray-700 rounded-lg">
                    {getCategoryIcon(currentFile.category)}
                    <span className="text-sm capitalize">{currentFile.category.replace('_', ' ')}</span>
                  </div>
                  <div className={`px-2 py-1 rounded-lg text-xs ${getConfidenceColor(currentFile.confidence)}`}>
                    {currentFile.confidence} confidence
                  </div>
                </div>

                {/* AI Analysis */}
                {currentFile.aiSummary && (
                  <div className="bg-purple-900/30 border border-purple-700 rounded-lg p-3 mb-4">
                    <div className="flex items-center space-x-2 mb-2">
                      <Brain className="w-4 h-4 text-purple-400" />
                      <span className="text-sm font-medium text-purple-300">AI Analysis</span>
                    </div>
                    <p className="text-sm text-gray-300">{currentFile.aiSummary}</p>
                  </div>
                )}

                {/* Reason */}
                <div className="bg-gray-700/50 rounded-lg p-3 mb-4">
                  <p className="text-sm text-gray-300">
                    <span className="text-orange-400 font-medium">Reason: </span>
                    {currentFile.reason}
                  </p>
                </div>

                {/* Duplicate Info */}
                {currentFile.duplicateOf && (
                  <div className="bg-yellow-900/30 border border-yellow-700 rounded-lg p-3 mb-4">
                    <div className="flex items-center space-x-2">
                      <Copy className="w-4 h-4 text-yellow-400" />
                      <span className="text-sm text-yellow-300">Potential duplicate detected</span>
                    </div>
                  </div>
                )}

                {/* File Preview */}
                {currentFile.content && (
                  <div className="bg-gray-900/50 rounded-lg p-3 flex-1 overflow-hidden">
                    <p className="text-xs text-gray-400 mb-2">Content Preview:</p>
                    <p className="text-sm text-gray-300 overflow-hidden">
                      {currentFile.content.substring(0, 200)}
                      {currentFile.content.length > 200 && '...'}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        {hasMoreFiles && (
          <div className="flex justify-center space-x-6 mb-6">
            <button
              onClick={() => makeDecision('delete')}
              className="flex items-center justify-center w-16 h-16 bg-red-600 hover:bg-red-700 rounded-full transition-colors shadow-lg"
            >
              <ThumbsDown className="w-8 h-8 text-white" />
            </button>
            
            <button
              onClick={undoLastDecision}
              disabled={decisions.length === 0}
              className="flex items-center justify-center w-12 h-12 bg-gray-600 hover:bg-gray-700 disabled:bg-gray-800 disabled:opacity-50 rounded-full transition-colors"
            >
              <RotateCcw className="w-6 h-6 text-white" />
            </button>
            
            <button
              onClick={() => makeDecision('keep')}
              className="flex items-center justify-center w-16 h-16 bg-green-600 hover:bg-green-700 rounded-full transition-colors shadow-lg"
            >
              <ThumbsUp className="w-8 h-8 text-white" />
            </button>
          </div>
        )}

        {/* Instructions */}
        <div className="text-center text-sm text-gray-400">
          <p className="mb-2">
            <span className="text-green-400">Swipe right</span> or 👍 to keep • 
            <span className="text-red-400"> Swipe left</span> or 👎 to delete
          </p>
          <p>AI analyzes content, finds duplicates, and suggests cleanup</p>
        </div>

        {/* Stats Footer */}
        {decisions.length > 0 && (
          <div className="mt-6 p-4 bg-gray-800/50 rounded-lg">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-2xl font-bold text-green-400">
                  {decisions.filter(d => d.action === 'keep').length}
                </p>
                <p className="text-xs text-gray-400">Keep</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-red-400">
                  {decisions.filter(d => d.action === 'delete').length}
                </p>
                <p className="text-xs text-gray-400">Delete</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-purple-400">
                  {Math.round((decisions.filter(d => d.action === 'delete').length / decisions.length) * 100) || 0}%
                </p>
                <p className="text-xs text-gray-400">Cleanup</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}