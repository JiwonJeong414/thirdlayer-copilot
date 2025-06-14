// src/app/cleaner/page.tsx
'use client';

import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import Protected from '@/components/layout/Protected';
import Spinner from '@/components/ui/Spinner';
import DriveCleanerDashboard from '@/components/drive/DriveCleanerDashboard';
import SwipeToCleanUI from '@/components/drive/SwipeToCleanUI';
import BatchCleanerUI from '@/components/drive/BatchCleanerUI';
import CleanerAnalytics from '@/components/drive/CleanerAnalytics';
import { 
  Sparkles, 
  Zap, 
  Heart, 
  BarChart3, 
  ArrowLeft 
} from 'lucide-react';

type CleanerMode = 'dashboard' | 'swipe' | 'batch' | 'analytics';

export default function CleanerPage() {
  const { user, loading, driveConnection } = useAuth();
  const [mode, setMode] = useState<CleanerMode>('dashboard');

  if (loading) {
    return (
      <div className="flex h-screen w-screen justify-center align-middle">
        <Spinner width="5" height="5" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white mb-4">Drive Cleaner</h1>
          <p className="text-gray-400">Please sign in to access the Drive Cleaner.</p>
        </div>
      </div>
    );
  }

  if (!driveConnection.isConnected) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 bg-orange-600/20 rounded-full mx-auto mb-4 flex items-center justify-center">
            <Sparkles className="w-8 h-8 text-orange-400" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-4">Connect Google Drive</h1>
          <p className="text-gray-400 mb-6">
            Connect your Google Drive to start cleaning up unnecessary files with AI assistance.
          </p>
          <button className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors">
            Connect Drive
          </button>
        </div>
      </div>
    );
  }

  const renderCurrentMode = () => {
    switch (mode) {
      case 'swipe':
        return <SwipeToCleanUI onBack={() => setMode('dashboard')} />;
      case 'batch':
        return <BatchCleanerUI onBack={() => setMode('dashboard')} />;
      case 'analytics':
        return <CleanerAnalytics onBack={() => setMode('dashboard')} />;
      default:
        return <DriveCleanerDashboard onModeChange={setMode} />;
    }
  };

  return (
    <Protected>
      <div className="min-h-screen bg-gray-900">
        {renderCurrentMode()}
      </div>
    </Protected>
  );
}