'use client';

import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Zap,
  ThumbsUp,
  ThumbsDown,
  RotateCcw,
  Sparkles,
  Brain,
  CheckCircle,
  AlertTriangle,
  ArrowLeft,
  RefreshCw
} from 'lucide-react';
import { CleanerFileCard } from './CleanerFileCard';
import { CleanableFile, SwipeDecision, CleanerUIProps } from '@/types/cleaner';
import { CleanerApiClient } from './CleanerApiClient';

export default function CleanerUI({ onBack }: CleanerUIProps) {
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
  const handleStartScan = async () => {
    setIsLoading(true);
    setError(null);
    setFiles([]);
    setCurrentIndex(0);
    setDecisions([]);
    
    const result = await CleanerApiClient.startScan(5);
    
    if (result.error) {
      setError(result.error);
    } else {
      setFiles(result.files);
    }
    
    setIsLoading(false);
  };

  const currentFile = files[currentIndex];
  const hasMoreFiles = currentIndex < files.length;
  const progress = files.length > 0 ? ((currentIndex) / files.length) * 100 : 0;

  // Event handlers
  // Records the initial position when user starts dragging
  const handleStart = (clientX: number, clientY: number) => {
    setIsDragging(true);
    startPosRef.current = { x: clientX, y: clientY };
  };

  // Updates drag offset based on current mouse/touch position
  const handleMove = (clientX: number, clientY: number) => {
    if (!isDragging) return;
    
    const deltaX = clientX - startPosRef.current.x;
    const deltaY = clientY - startPosRef.current.y;
    setDragOffset({ x: deltaX, y: deltaY });
  };

  // Handles the end of drag gesture, makes decision if threshold is met
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

  // Mouse event handlers
  // Prevents default behavior and initiates drag
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    handleStart(e.clientX, e.clientY);
  };

  // Updates position during mouse drag
  const handleMouseMove = (e: React.MouseEvent) => {
    handleMove(e.clientX, e.clientY);
  };

  // Handles mouse release
  const handleMouseUp = () => {
    handleEnd();
  };

  // Touch event handlers
  // Initiates drag on touch start
  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    handleStart(touch.clientX, touch.clientY);
  };

  // Updates position during touch drag
  const handleTouchMove = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    handleMove(touch.clientX, touch.clientY);
  };

  // Handles touch end
  const handleTouchEnd = () => {
    handleEnd();
  };

  // Makes a decision to keep or delete the current file
  const makeDecision = async (action: 'keep' | 'delete') => {
    if (!currentFile) return;
    
    const decision: SwipeDecision = {
      fileId: currentFile.id,
      action,
      timestamp: Date.now()
    };
    
    // If user chose to delete, delete it immediately
    if (action === 'delete') {
      const success = await CleanerApiClient.deleteFile(currentFile.id);
      if (success) {
        console.log(`✅ Successfully deleted: ${currentFile.name}`);
      }
    }
    
    setDecisions(prev => [...prev, decision]);
    setCurrentIndex(prev => prev + 1);
  };

  // Reverts the last decision made
  const undoLastDecision = () => {
    if (decisions.length === 0) return;
    
    setDecisions(prev => prev.slice(0, -1));
    setCurrentIndex(prev => Math.max(0, prev - 1));
  };

  // Returns the current swipe hint based on drag offset
  const getSwipeHint = () => {
    const { x } = dragOffset;
    if (Math.abs(x) < 50) return null;
    
    return x > 0 ? 'KEEP' : 'DELETE';
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
            onClick={handleStartScan}
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
                onClick={handleStartScan}
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
                    onClick={handleStartScan}
                    className="px-6 py-3 bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-700 hover:to-purple-700 rounded-xl transition-all duration-300 shadow-lg"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    Find Next 5 Files
                  </motion.button>
                </div>
              </motion.div>
            ) : currentFile && (
              <CleanerFileCard
                file={currentFile}
                dragOffset={dragOffset}
                isDragging={isDragging}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
                swipeHint={getSwipeHint()}
              />
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