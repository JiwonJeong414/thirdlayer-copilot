// src/components/drive/DriveOrganizerCard.tsx
// Add this to your existing cleaner page as a new mode

'use client';

import React, { useState } from 'react';
import { 
  Brain, 
  Folder, 
  Sparkles, 
  BarChart3, 
  Settings,
  ArrowRight,
  FileText,
  Users,
  Calendar,
  Image,
  Archive,
  Target
} from 'lucide-react';

interface DriveOrganizerCardProps {
  onActivate: () => void;
}

export default function DriveOrganizerCard({ onActivate }: DriveOrganizerCardProps) {
  const [stats, setStats] = useState({
    indexedFiles: 0,
    lastOrganization: null as Date | null,
    organizationCount: 0
  });

  // Mock data - replace with real API call
  React.useEffect(() => {
    // Load organization stats
    setStats({
      indexedFiles: 247,
      lastOrganization: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
      organizationCount: 3
    });
  }, []);

  return (
    <div className="bg-gradient-to-br from-indigo-600/20 to-purple-600/20 border border-indigo-500/30 rounded-xl p-6 cursor-pointer hover:border-indigo-500/50 transition-all group">
      <div className="flex items-center space-x-3 mb-4">
        <div className="p-3 bg-indigo-600 rounded-lg group-hover:scale-110 transition-transform">
          <Brain className="w-6 h-6 text-white" />
        </div>
        <div>
          <h3 className="text-xl font-bold text-white">AI Organization</h3>
          <p className="text-indigo-300">Smart folder management</p>
        </div>
      </div>

      <p className="text-gray-400 mb-6">
        Use K-means clustering and AI analysis to automatically organize your files into logical folders based on content similarity and patterns.
      </p>

      {/* Quick Stats */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="bg-gray-800/50 rounded-lg p-3 text-center">
          <div className="text-lg font-bold text-white">{stats.indexedFiles}</div>
          <div className="text-xs text-gray-400">Files Ready</div>
        </div>
        <div className="bg-gray-800/50 rounded-lg p-3 text-center">
          <div className="text-lg font-bold text-indigo-400">{stats.organizationCount}</div>
          <div className="text-xs text-gray-400">Organizations</div>
        </div>
        <div className="bg-gray-800/50 rounded-lg p-3 text-center">
          <div className="text-lg font-bold text-purple-400">
            {stats.lastOrganization ? `${Math.floor((Date.now() - stats.lastOrganization.getTime()) / (24 * 60 * 60 * 1000))}d` : 'Never'}
          </div>
          <div className="text-xs text-gray-400">Last Run</div>
        </div>
      </div>

      {/* Features Preview */}
      <div className="space-y-2 mb-6">
        <div className="flex items-center space-x-2 text-sm text-indigo-300">
          <Target className="w-4 h-4" />
          <span>K-means clustering algorithm</span>
        </div>
        <div className="flex items-center space-x-2 text-sm text-indigo-300">
          <Brain className="w-4 h-4" />
          <span>Content-based file grouping</span>
        </div>
        <div className="flex items-center space-x-2 text-sm text-indigo-300">
          <Folder className="w-4 h-4" />
          <span>Automatic folder creation</span>
        </div>
      </div>

      {/* Action Button */}
      <button
        onClick={onActivate}
        className="w-full flex items-center justify-center space-x-2 py-3 bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors"
      >
        <Sparkles className="w-4 h-4" />
        <span>Start AI Organization</span>
        <ArrowRight className="w-4 h-4" />
      </button>
    </div>
  );
}

// Update your existing DriveCleanerDashboard.tsx to include this option:

// Add this to the existing modes grid in DriveCleanerDashboard.tsx:
/*
<DriveOrganizerCard 
  onActivate={() => onModeChange('organize')} 
/>
*/

// Then update the renderCurrentMode function in your cleaner page:
/*
case 'organize':
  return <DriveOrganizerDashboard onBack={() => setMode('dashboard')} />;
*/

// src/lib/organizationUtils.ts - Helper utilities
export class OrganizationUtils {
  static async getOrganizationStats(userId: string) {
    try {
      const response = await fetch('/api/drive/organize');
      if (response.ok) {
        const data = await response.json();
        return data.stats;
      }
    } catch (error) {
      console.error('Failed to get organization stats:', error);
    }
    return null;
  }

  static formatClusterName(files: string[]): string {
    // Extract common themes from filenames
    const words = files.flatMap(name => 
      name.toLowerCase()
        .replace(/[^\w\s]/g, ' ')
        .split(/\s+/)
        .filter(word => word.length > 3)
    );

    const wordFreq = words.reduce((acc, word) => {
      acc[word] = (acc[word] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const topWords = Object.entries(wordFreq)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 2)
      .map(([word]) => word);

    if (topWords.length > 0) {
      return topWords.map(word => 
        word.charAt(0).toUpperCase() + word.slice(1)
      ).join(' ') + ' Files';
    }

    return 'Miscellaneous Files';
  }

  static getClusterColorByCategory(category: string): string {
    const colors = {
      work: '#3B82F6',
      personal: '#10B981', 
      media: '#F59E0B',
      documents: '#8B5CF6',
      archive: '#6B7280',
      mixed: '#EF4444'
    };
    return colors[category as keyof typeof colors] || colors.mixed;
  }

  static calculateOrganizationScore(clusters: any[]): number {
    if (clusters.length === 0) return 0;
    
    const totalFiles = clusters.reduce((sum, cluster) => sum + cluster.files.length, 0);
    const avgConfidence = clusters.reduce((sum, cluster) => {
      const clusterConfidence = cluster.files.reduce((cSum: number, file: any) => cSum + file.confidence, 0) / cluster.files.length;
      return sum + clusterConfidence;
    }, 0) / clusters.length;

    // Score based on how well files are distributed and confidence
    const distributionScore = 1 - Math.abs(totalFiles / clusters.length - 5) / 10; // Ideal ~5 files per cluster
    const confidenceScore = avgConfidence;
    
    return Math.max(0, Math.min(1, (distributionScore + confidenceScore) / 2));
  }

  static generateTagsFromContent(content: string, maxTags: number = 5): string[] {
    // Simple keyword extraction
    const words = content.toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 4 && word.length < 15);

    const stopWords = new Set(['that', 'this', 'with', 'from', 'they', 'been', 'have', 'were', 'said', 'each', 'which', 'their', 'time', 'will', 'about', 'would', 'there', 'could', 'other']);
    
    const wordFreq = words
      .filter(word => !stopWords.has(word))
      .reduce((acc, word) => {
        acc[word] = (acc[word] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

    return Object.entries(wordFreq)
      .sort(([,a], [,b]) => b - a)
      .slice(0, maxTags)
      .map(([word]) => word);
  }
}