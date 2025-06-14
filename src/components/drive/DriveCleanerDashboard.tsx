'use client';

import React, { useState, useEffect } from 'react';
import { 
  Sparkles, 
  Zap, 
  Heart, 
  BarChart3,
  FileX,
  Clock,
  Copy,
  HardDrive,
  Brain,
  Target,
  Trash2,
  CheckCircle,
  AlertTriangle,
  XCircle
} from 'lucide-react';

interface CleanerStats {
  totalFiles: number;
  categories: {
    empty: number;
    system: number;
    duplicates: number;
    tiny: number;
    small: number;
    old: number;
    lowQuality: number;
  };
  spaceAnalysis: {
    totalWasted: number;
    autoDeleteSavings: number;
    potentialSavings: number;
  };
}

interface DriveCleanerDashboardProps {
  onModeChange: (mode: 'swipe' | 'batch' | 'analytics') => void;
}

export default function DriveCleanerDashboard({ onModeChange }: DriveCleanerDashboardProps) {
  const [stats, setStats] = useState<CleanerStats | null>(null);
  const [isLoadingStats, setIsLoadingStats] = useState(false);
  const [lastScanTime, setLastScanTime] = useState<Date | null>(null);

  const loadQuickStats = async () => {
    setIsLoadingStats(true);
    try {
      const response = await fetch('/api/drive/cleaner/batch-suggest', {
        method: 'POST',
      });
      
      if (response.ok) {
        const data = await response.json();
        setStats({
          totalFiles: data.suggestion.autoDelete.length + data.suggestion.review.length,
          categories: data.quickStats,
          spaceAnalysis: data.suggestion.spaceAnalysis,
        });
        setLastScanTime(new Date());
      }
    } catch (error) {
      console.error('Failed to load stats:', error);
    } finally {
      setIsLoadingStats(false);
    }
  };

  useEffect(() => {
    loadQuickStats();
  }, []);

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white">
      <div className="max-w-6xl mx-auto p-6">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center space-x-3 mb-4">
            <div className="p-4 bg-gradient-to-r from-purple-600 to-pink-600 rounded-2xl">
              <Sparkles className="w-10 h-10 text-white" />
            </div>
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                AI Drive Cleaner
              </h1>
              <p className="text-gray-400 text-lg">
                Smart file cleanup powered by artificial intelligence
              </p>
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl p-6">
              <div className="flex items-center space-x-3 mb-2">
                <FileX className="w-6 h-6 text-red-400" />
                <span className="text-sm text-gray-400">Cleanable Files</span>
              </div>
              <p className="text-3xl font-bold text-white">{stats.totalFiles}</p>
            </div>
            
            <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl p-6">
              <div className="flex items-center space-x-3 mb-2">
                <HardDrive className="w-6 h-6 text-blue-400" />
                <span className="text-sm text-gray-400">Wasted Space</span>
              </div>
              <p className="text-3xl font-bold text-white">
                {formatFileSize(stats.spaceAnalysis.totalWasted)}
              </p>
            </div>
            
            <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl p-6">
              <div className="flex items-center space-x-3 mb-2">
                <CheckCircle className="w-6 h-6 text-green-400" />
                <span className="text-sm text-gray-400">Safe to Delete</span>
              </div>
              <p className="text-3xl font-bold text-green-400">
                {formatFileSize(stats.spaceAnalysis.autoDeleteSavings)}
              </p>
            </div>
            
            <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl p-6">
              <div className="flex items-center space-x-3 mb-2">
                <Target className="w-6 h-6 text-purple-400" />
                <span className="text-sm text-gray-400">Potential Savings</span>
              </div>
              <p className="text-3xl font-bold text-purple-400">
                {formatFileSize(stats.spaceAnalysis.potentialSavings)}
              </p>
            </div>
          </div>
        )}

        {/* Cleanup Modes */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {/* Swipe Mode */}
          <div 
            onClick={() => onModeChange('swipe')}
            className="bg-gradient-to-br from-purple-600/20 to-pink-600/20 border border-purple-500/30 rounded-xl p-6 cursor-pointer hover:border-purple-500/50 transition-all group"
          >
            <div className="flex items-center space-x-3 mb-4">
              <div className="p-3 bg-purple-600 rounded-lg group-hover:scale-110 transition-transform">
                <Heart className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">Swipe to Clean</h3>
                <p className="text-purple-300">Tinder-style file review</p>
              </div>
            </div>
            <p className="text-gray-400 mb-4">
              Swipe left to delete, right to keep. AI analyzes each file and provides smart recommendations.
            </p>
            <div className="flex items-center space-x-2 text-sm text-purple-300">
              <Brain className="w-4 h-4" />
              <span>AI-powered • Fun & intuitive</span>
            </div>
          </div>

          {/* Batch Mode */}
          <div 
            onClick={() => onModeChange('batch')}
            className="bg-gradient-to-br from-blue-600/20 to-cyan-600/20 border border-blue-500/30 rounded-xl p-6 cursor-pointer hover:border-blue-500/50 transition-all group"
          >
            <div className="flex items-center space-x-3 mb-4">
              <div className="p-3 bg-blue-600 rounded-lg group-hover:scale-110 transition-transform">
                <Zap className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">Batch Cleanup</h3>
                <p className="text-blue-300">Bulk file management</p>
              </div>
            </div>
            <p className="text-gray-400 mb-4">
              Review and delete multiple files at once. Perfect for quick cleanups and large-scale organization.
            </p>
            <div className="flex items-center space-x-2 text-sm text-blue-300">
              <Trash2 className="w-4 h-4" />
              <span>Efficient • Bulk operations</span>
            </div>
          </div>

          {/* Analytics Mode */}
          <div 
            onClick={() => onModeChange('analytics')}
            className="bg-gradient-to-br from-green-600/20 to-emerald-600/20 border border-green-500/30 rounded-xl p-6 cursor-pointer hover:border-green-500/50 transition-all group"
          >
            <div className="flex items-center space-x-3 mb-4">
              <div className="p-3 bg-green-600 rounded-lg group-hover:scale-110 transition-transform">
                <BarChart3 className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">Drive Analytics</h3>
                <p className="text-green-300">Storage insights</p>
              </div>
            </div>
            <p className="text-gray-400 mb-4">
              Detailed analysis of your drive usage, file types, and cleanup opportunities.
            </p>
            <div className="flex items-center space-x-2 text-sm text-green-300">
              <BarChart3 className="w-4 h-4" />
              <span>Insights • Data visualization</span>
            </div>
          </div>
        </div>

        {/* Category Breakdown */}
        {stats && (
          <div className="bg-gray-800/30 backdrop-blur-sm border border-gray-700 rounded-xl p-6">
            <h3 className="text-lg font-medium text-white mb-4">File Categories Found</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {Object.entries(stats.categories).map(([category, count]) => {
                const icons = {
                  empty: <XCircle className="w-5 h-5 text-red-400" />,
                  system: <HardDrive className="w-5 h-5 text-gray-400" />,
                  duplicates: <Copy className="w-5 h-5 text-purple-400" />,
                  tiny: <FileX className="w-5 h-5 text-orange-400" />,
                  small: <AlertTriangle className="w-5 h-5 text-yellow-400" />,
                  old: <Clock className="w-5 h-5 text-blue-400" />,
                  lowQuality: <AlertTriangle className="w-5 h-5 text-red-400" />,
                };
                
                return (
                  <div key={category} className="flex items-center space-x-3 p-3 bg-gray-700/50 rounded-lg">
                    {icons[category as keyof typeof icons]}
                    <div>
                      <p className="text-sm text-gray-400 capitalize">
                        {category.replace(/([A-Z])/g, ' $1').toLowerCase()}
                      </p>
                      <p className="text-lg font-bold text-white">{count}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Quick Actions */}
        <div className="flex justify-center space-x-4 mt-8">
          <button
            onClick={loadQuickStats}
            disabled={isLoadingStats}
            className="flex items-center space-x-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 rounded-lg transition-colors"
          >
            {isLoadingStats ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
            ) : (
              <Brain className="w-4 h-4" />
            )}
            <span>{isLoadingStats ? 'Scanning...' : 'Refresh Scan'}</span>
          </button>
          
          <button
            onClick={() => onModeChange('batch')}
            className="flex items-center space-x-2 px-6 py-3 bg-orange-600 hover:bg-orange-700 rounded-lg transition-colors"
          >
            <Zap className="w-4 h-4" />
            <span>Quick Clean</span>
          </button>
        </div>

        {lastScanTime && (
          <p className="text-center text-sm text-gray-400 mt-4">
            Last scanned: {lastScanTime.toLocaleString()}
          </p>
        )}
      </div>
    </div>
  );
} 