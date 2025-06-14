// src/app/organize/page.tsx - Dedicated AI Organization Page
'use client';

import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import Protected from '@/components/Protected';
import Spinner from '@/components/Spinner';
import { DriveOrganizerDashboard } from '@/components/drive';
import { Brain, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function OrganizePage() {
  const { user, loading, driveConnection } = useAuth();

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
          <h1 className="text-2xl font-bold text-white mb-4">AI Drive Organization</h1>
          <p className="text-gray-400">Please sign in to access the AI Drive Organization.</p>
        </div>
      </div>
    );
  }

  if (!driveConnection.isConnected) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 bg-indigo-600/20 rounded-full mx-auto mb-4 flex items-center justify-center">
            <Brain className="w-8 h-8 text-indigo-400" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-4">Connect Google Drive</h1>
          <p className="text-gray-400 mb-6">
            Connect your Google Drive to start organizing your files with AI-powered folder management.
          </p>
          <Link 
            href="/"
            className="inline-block px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            Go to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <Protected>
      <div className="min-h-screen bg-gray-900">
        <DriveOrganizerDashboard onBack={() => window.history.back()} />
      </div>
    </Protected>
  );
}