'use client';

import React from 'react';
import { ArrowLeft } from 'lucide-react';

interface CleanerAnalyticsProps {
  onBack: () => void;
}

export default function CleanerAnalytics({ onBack }: CleanerAnalyticsProps) {
  return (
    <div className="min-h-screen bg-gray-900">
      <div className="max-w-6xl mx-auto p-6">
        <div className="flex items-center justify-between mb-8">
          <button
            onClick={onBack}
            className="flex items-center space-x-2 text-gray-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back</span>
          </button>
          <h1 className="text-2xl font-bold text-white">Cleanup Analytics</h1>
          <div className="w-20" />
        </div>
        {/* Analytics content will go here */}
      </div>
    </div>
  );
} 