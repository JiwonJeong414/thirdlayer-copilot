import React from 'react';
import { motion } from 'framer-motion';
import { 
  FileText, 
  Image, 
  Video, 
  Archive,
  Brain,
  Copy,
  AlertTriangle,
  Clock,
  HardDrive,
  XCircle
} from 'lucide-react';
import { CleanableFile } from '@/types/cleaner';

// Helper functions
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

interface CleanerFileCardProps {
  file: CleanableFile;
  dragOffset: { x: number; y: number };
  isDragging: boolean;
  onMouseDown: (e: React.MouseEvent) => void;
  onMouseMove: (e: React.MouseEvent) => void;
  onMouseUp: () => void;
  onTouchStart: (e: React.TouchEvent) => void;
  onTouchMove: (e: React.TouchEvent) => void;
  onTouchEnd: () => void;
  swipeHint: string | null;
}

const getFileIcon = (mimeType: string) => {
  if (mimeType.startsWith('image/')) return <Image className="w-8 h-8 text-purple-400" />;
  if (mimeType.startsWith('video/')) return <Video className="w-8 h-8 text-red-400" />;
  if (mimeType.includes('zip') || mimeType.includes('archive')) return <Archive className="w-8 h-8 text-orange-400" />;
  return <FileText className="w-8 h-8 text-blue-400" />;
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

const getConfidenceColor = (confidence: string) => {
  switch (confidence) {
    case 'high': return 'text-green-400 bg-green-900/30 border-green-700';
    case 'medium': return 'text-yellow-400 bg-yellow-900/30 border-yellow-700';
    case 'low': return 'text-red-400 bg-red-900/30 border-red-700';
    default: return 'text-gray-400 bg-gray-900/30 border-gray-700';
  }
};

export const CleanerFileCard: React.FC<CleanerFileCardProps> = ({
  file,
  dragOffset,
  isDragging,
  onMouseDown,
  onMouseMove,
  onMouseUp,
  onTouchStart,
  onTouchMove,
  onTouchEnd,
  swipeHint
}) => {
  return (
    <div
      className="absolute inset-0 cursor-grab active:cursor-grabbing"
      style={{
        transform: `translate(${dragOffset.x}px, ${dragOffset.y}px) rotate(${dragOffset.x * 0.1}deg)`,
        transition: isDragging ? 'none' : 'transform 0.3s ease-out',
      }}
      onMouseDown={onMouseDown}
      onMouseMove={onMouseMove}
      onMouseUp={onMouseUp}
      onMouseLeave={onMouseUp}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      {/* Swipe Hint Overlay */}
      {swipeHint && (
        <div className={`absolute inset-0 flex items-center justify-center z-10 rounded-xl border-4 ${
          swipeHint === 'KEEP' 
            ? 'bg-green-500/20 border-green-500' 
            : 'bg-red-500/20 border-red-500'
        }`}>
          <div className="text-4xl font-bold">
            {swipeHint === 'KEEP' ? '💚 KEEP' : '🗑️ DELETE'}
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
            {getFileIcon(file.mimeType)}
          </motion.div>
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-medium text-white truncate mb-1">
              {file.name}
            </h3>
            <div className="flex items-center space-x-2 text-sm text-pink-300">
              <span>{formatFileSize(file.size)}</span>
              <span>•</span>
              <span>{getFileAge(file.modifiedTime)}</span>
            </div>
          </div>
        </div>

        {/* Category & Confidence */}
        <div className="flex items-center space-x-2 mb-4">
          <motion.div 
            className="flex items-center space-x-1 px-3 py-1 bg-pink-800/50 border border-pink-500/30 rounded-lg"
            whileHover={{ scale: 1.05 }}
          >
            {getCategoryIcon(file.category)}
            <span className="text-sm capitalize text-pink-200">{file.category.replace('_', ' ')}</span>
          </motion.div>
          <motion.div 
            className={`px-3 py-1 rounded-lg text-xs border ${getConfidenceColor(file.confidence)}`}
            whileHover={{ scale: 1.05 }}
          >
            {file.confidence} confidence
          </motion.div>
        </div>

        {/* AI Analysis */}
        {file.aiSummary && (
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
            <p className="text-sm text-gray-300">{file.aiSummary}</p>
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
            {file.reason}
          </p>
        </motion.div>

        {/* Duplicate Info */}
        {file.duplicateOf && (
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
        {file.content && (
          <motion.div 
            className="bg-gray-900/50 border border-gray-600/30 rounded-lg p-3 flex-1 overflow-hidden"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
          >
            <p className="text-xs text-gray-400 mb-2">Content Preview:</p>
            <p className="text-sm text-gray-300 overflow-hidden">
              {file.content.substring(0, 200)}
              {file.content.length > 200 && '...'}
            </p>
          </motion.div>
        )}
      </div>
    </div>
  );
}; 