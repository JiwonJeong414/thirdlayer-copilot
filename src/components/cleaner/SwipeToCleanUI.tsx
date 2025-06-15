// src/components/drive/cleaner/SwipeToCleanUI.tsx - SIMPLIFIED WORKING VERSION
'use client';

import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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
  ArrowLeft,
  RefreshCw
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

  // Scan for cleanable files
  const startScan = async () => {
    setIsLoading(true);
    setError(null);
    setFiles([]);
    setCurrentIndex(0);
    setDecisions([]);
    
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

  // SIMPLIFIED event handlers - based on working version
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

  // Mouse events - SIMPLIFIED
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

  // Touch events - SIMPLIFIED
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
          console.log(`✅ Successfully deleted: ${currentFile.name}`);
        } else {
          throw new Error('Delete failed');
        }
      } catch (error) {
        console.error('❌ Failed to delete file:', error);
      }
    }
    
    setDecisions(prev => [...prev, decision]);
    setCurrentIndex(prev => prev + 1);
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
      case 'high': return 'text-green-400 bg-green-900/30 border-green-700';
      case 'medium': return 'text-yellow-400 bg-yellow-900/30 border-yellow-700';
      case 'low': return 'text-red-400 bg-red-900/30 border-red-700';
      default: return 'text-gray-400 bg-gray-900/30 border-gray-700';
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
    <div className="min-h-screen bg-gradient-to-br from-pink-900 via-purple-900 to-gray-900 text-white overflow-hidden relative">
      {/* Animated background */}
      <div className="absolute inset-0 overflow-hidden">
        <motion.div 
          className="absolute -top-40 -right-40 w-80 h-80 bg-pink-500/20 rounded-full blur-3xl"
          animate={{ 
            y: [0, -50, 0],
            scale: [1, 1.2, 1]
          }}
          transition={{ duration: 8, repeat: Infinity }}
        />
        <motion.div 
          className="absolute -bottom-40 -left-40 w-80 h-80 bg-purple-500/20 rounded-full blur-3xl"
          animate={{ 
            y: [0, 50, 0],
            scale: [1, 1.3, 1]
          }}
          transition={{ duration: 6, repeat: Infinity, delay: 2 }}
        />
      </div>

      <div className="max-w-md mx-auto p-6 relative z-10">
        {/* Header */}
        <motion.div 
          className="text-center mb-8"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          <div className="flex items-center justify-between mb-8 px-2">
            <motion.button
              onClick={onBack}
              className="flex items-center space-x-2 text-pink-300 hover:text-white transition-colors p-3 rounded-xl hover:bg-pink-800/30 backdrop-blur-sm"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <ArrowLeft className="w-5 h-5" />
              <span className="font-medium">Back</span>
            </motion.button>
            
            <div className="flex items-center space-x-3">
              <motion.div 
                className="p-3 bg-gradient-to-r from-pink-500 to-purple-500 rounded-xl shadow-lg"
                whileHover={{ scale: 1.1, rotate: 5 }}
                transition={{ duration: 0.3 }}
              >
                <Sparkles className="w-6 h-6 text-white" />
              </motion.div>
              <div className="text-left">
                <h1 className="text-xl font-bold bg-gradient-to-r from-pink-400 to-purple-400 bg-clip-text text-transparent whitespace-nowrap">
                  Swipe to Clean
                </h1>
                <p className="text-pink-300 text-xs whitespace-nowrap">AI-powered file cleanup</p>
              </div>
            </div>
            
            <div className="w-20" />
          </div>

          {/* Progress Bar */}
          {files.length > 0 && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5 }}
              className="mt-6"
            >
              <div className="w-full bg-gray-800/50 rounded-full h-3 mb-4 backdrop-blur-sm border border-pink-500/20">
                <motion.div 
                  className="bg-gradient-to-r from-pink-500 to-purple-500 h-3 rounded-full transition-all duration-500"
                  style={{ width: `${progress}%` }}
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                />
              </div>
              
              <div className="flex justify-between text-sm text-pink-300">
                <span>{currentIndex} of {files.length}</span>
                <span>{decisions.filter(d => d.action === 'delete').length} to delete</span>
              </div>
            </motion.div>
          )}
        </motion.div>

        {/* Control Buttons */}
        <motion.div 
          className="flex justify-center space-x-4 mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.8 }}
        >
          <motion.button
            onClick={startScan}
            disabled={isLoading}
            className="flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-700 hover:to-purple-700 disabled:from-gray-600 disabled:to-gray-700 rounded-xl transition-all duration-300 shadow-lg"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            {isLoading ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Scanning Drive...</span>
              </>
            ) : (
              <>
                <Brain className="w-4 h-4" />
                <span>Find 5 Files</span>
              </>
            )}
          </motion.button>

          <motion.button
            onClick={() => setAutoCleanMode(!autoCleanMode)}
            className={`flex items-center space-x-2 px-4 py-3 rounded-xl transition-all duration-300 ${
              autoCleanMode 
                ? 'bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700' 
                : 'bg-gray-700 hover:bg-gray-600 border border-gray-600'
            }`}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Zap className="w-4 h-4" />
            <span>{autoCleanMode ? 'Auto ON' : 'Manual'}</span>
          </motion.button>
        </motion.div>

        {/* Error State */}
        <AnimatePresence>
          {error && (
            <motion.div 
              className="bg-red-900/40 border border-red-500/50 rounded-xl p-6 mb-6 backdrop-blur-sm"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
            >
              <div className="flex items-center space-x-3 mb-2">
                <AlertTriangle className="w-6 h-6 text-red-400" />
                <h3 className="text-lg font-medium text-white">Scan Error</h3>
              </div>
              <p className="text-red-300">{error}</p>
              <motion.button
                onClick={startScan}
                className="mt-4 px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                Try Again
              </motion.button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Main Card Area */}
        <div className="relative h-96 mb-6">
          <AnimatePresence mode="wait">
            {!hasMoreFiles ? (
              <motion.div 
                className="flex items-center justify-center h-full"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
              >
                <div className="text-center">
                  <motion.div 
                    className="w-20 h-20 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full mx-auto mb-4 flex items-center justify-center"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                  >
                    <CheckCircle className="w-10 h-10 text-white" />
                  </motion.div>
                  <h3 className="text-xl font-medium text-white mb-2">Batch Complete!</h3>
                  <p className="text-pink-300 mb-4">
                    {decisions.length === 0 
                      ? 'Click "Find 5 Files" to scan another batch of 5 files to clean.'
                      : `Reviewed ${decisions.length} files in this batch.`
                    }
                  </p>
                  <motion.button
                    onClick={startScan}
                    className="px-6 py-3 bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-700 hover:to-purple-700 rounded-xl transition-all duration-300 shadow-lg"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    Find Next 5 Files
                  </motion.button>
                </div>
              </motion.div>
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
                <div className="bg-gradient-to-br from-gray-800/90 via-gray-700/90 to-gray-800/90 backdrop-blur-sm border border-pink-500/30 rounded-xl p-6 h-full flex flex-col">
                  {/* File Header */}
                  <div className="flex items-start space-x-4 mb-4">
                    <motion.div 
                      className="flex-shrink-0"
                      whileHover={{ scale: 1.1, rotate: 5 }}
                    >
                      {getFileIcon(currentFile.mimeType)}
                    </motion.div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg font-medium text-white truncate mb-1">
                        {currentFile.name}
                      </h3>
                      <div className="flex items-center space-x-2 text-sm text-pink-300">
                        <span>{formatFileSize(currentFile.size)}</span>
                        <span>•</span>
                        <span>{getFileAge(currentFile.modifiedTime)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Category & Confidence */}
                  <div className="flex items-center space-x-2 mb-4">
                    <motion.div 
                      className="flex items-center space-x-1 px-3 py-1 bg-pink-800/50 border border-pink-500/30 rounded-lg"
                      whileHover={{ scale: 1.05 }}
                    >
                      {getCategoryIcon(currentFile.category)}
                      <span className="text-sm capitalize text-pink-200">{currentFile.category.replace('_', ' ')}</span>
                    </motion.div>
                    <motion.div 
                      className={`px-3 py-1 rounded-lg text-xs border ${getConfidenceColor(currentFile.confidence)}`}
                      whileHover={{ scale: 1.05 }}
                    >
                      {currentFile.confidence} confidence
                    </motion.div>
                  </div>

                  {/* AI Analysis */}
                  {currentFile.aiSummary && (
                    <motion.div 
                      className="bg-purple-900/40 border border-purple-500/50 rounded-lg p-3 mb-4 backdrop-blur-sm"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.2 }}
                    >
                      <div className="flex items-center space-x-2 mb-2">
                        <Brain className="w-4 h-4 text-purple-400" />
                        <span className="text-sm font-medium text-purple-300">AI Analysis</span>
                      </div>
                      <p className="text-sm text-gray-300">{currentFile.aiSummary}</p>
                    </motion.div>
                  )}

                  {/* Reason */}
                  <motion.div 
                    className="bg-gray-700/50 border border-gray-600/50 rounded-lg p-3 mb-4"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                  >
                    <p className="text-sm text-gray-300">
                      <span className="text-orange-400 font-medium">Reason: </span>
                      {currentFile.reason}
                    </p>
                  </motion.div>

                  {/* Duplicate Info */}
                  {currentFile.duplicateOf && (
                    <motion.div 
                      className="bg-yellow-900/40 border border-yellow-500/50 rounded-lg p-3 mb-4 backdrop-blur-sm"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.4 }}
                    >
                      <div className="flex items-center space-x-2">
                        <Copy className="w-4 h-4 text-yellow-400" />
                        <span className="text-sm text-yellow-300">Potential duplicate detected</span>
                      </div>
                    </motion.div>
                  )}

                  {/* File Preview */}
                  {currentFile.content && (
                    <motion.div 
                      className="bg-gray-900/50 border border-gray-600/30 rounded-lg p-3 flex-1 overflow-hidden"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.5 }}
                    >
                      <p className="text-xs text-gray-400 mb-2">Content Preview:</p>
                      <p className="text-sm text-gray-300 overflow-hidden">
                        {currentFile.content.substring(0, 200)}
                        {currentFile.content.length > 200 && '...'}
                      </p>
                    </motion.div>
                  )}
                </div>
              </div>
            )}
          </AnimatePresence>
        </div>

        {/* Action Buttons */}
        <AnimatePresence>
          {hasMoreFiles && (
            <motion.div 
              className="flex justify-center space-x-6 mb-6"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
            >
              <motion.button
                onClick={() => makeDecision('delete')}
                className="flex items-center justify-center w-16 h-16 bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600 rounded-full transition-all duration-300 shadow-lg hover:shadow-xl"
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
              >
                <ThumbsDown className="w-8 h-8 text-white" />
              </motion.button>
              
              <motion.button
                onClick={undoLastDecision}
                disabled={decisions.length === 0}
                className="flex items-center justify-center w-12 h-12 bg-gray-600 hover:bg-gray-500 disabled:bg-gray-800 disabled:opacity-50 rounded-full transition-all duration-300"
                whileHover={{ scale: decisions.length > 0 ? 1.1 : 1 }}
                whileTap={{ scale: decisions.length > 0 ? 0.9 : 1 }}
              >
                <RotateCcw className="w-6 h-6 text-white" />
              </motion.button>
              
              <motion.button
                onClick={() => makeDecision('keep')}
                className="flex items-center justify-center w-16 h-16 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 rounded-full transition-all duration-300 shadow-lg hover:shadow-xl"
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
              >
                <ThumbsUp className="w-8 h-8 text-white" />
              </motion.button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Instructions */}
        <motion.div 
          className="text-center text-sm text-pink-300 mb-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
        >
          <p className="mb-2">
            <span className="text-green-400">Swipe right</span> or 👍 to keep • 
            <span className="text-red-400"> Swipe left</span> or 👎 to delete
          </p>
          <p>AI analyzes content, finds duplicates, and suggests cleanup</p>
        </motion.div>

        {/* Stats Footer */}
        <AnimatePresence>
          {decisions.length > 0 && (
            <motion.div 
              className="p-4 bg-gray-800/40 backdrop-blur-sm border border-pink-500/20 rounded-xl"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
            >
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <motion.p 
                    className="text-2xl font-bold text-green-400"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 200 }}
                  >
                    {decisions.filter(d => d.action === 'keep').length}
                  </motion.p>
                  <p className="text-xs text-gray-400">Keep</p>
                </div>
                <div>
                  <motion.p 
                    className="text-2xl font-bold text-red-400"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 200, delay: 0.1 }}
                  >
                    {decisions.filter(d => d.action === 'delete').length}
                  </motion.p>
                  <p className="text-xs text-gray-400">Delete</p>
                </div>
                <div>
                  <motion.p 
                    className="text-2xl font-bold text-purple-400"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 200, delay: 0.2 }}
                  >
                    {Math.round((decisions.filter(d => d.action === 'delete').length / decisions.length) * 100) || 0}%
                  </motion.p>
                  <p className="text-xs text-gray-400">Cleanup</p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}