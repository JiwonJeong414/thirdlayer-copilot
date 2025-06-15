// src/components/drive/DriveOrganizerCard.tsx
// Add this to your existing cleaner page as a new mode

'use client';

import React from 'react';
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
import { useOrganizer } from '../../contexts/OrganizerContext';

interface DriveOrganizerCardProps {
  onActivate: () => void;
}

export default function DriveOrganizerCard({ onActivate }: DriveOrganizerCardProps) {
  return (
    <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-indigo-600/20 rounded-lg">
            <Brain className="w-6 h-6 text-indigo-400" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">AI File Organizer</h3>
            <p className="text-sm text-gray-400">Smart file organization using AI</p>
          </div>
        </div>
        <div className="text-right">
          <div className="text-sm text-gray-400">Last Run</div>
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