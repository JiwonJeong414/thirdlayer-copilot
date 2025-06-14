'use client';

import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import Protected from '@/components/Protected';
import Spinner from '@/components/Spinner';
import MainPage from '@/components/MainPage';

export default function ChatPage() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex h-screen w-screen justify-center items-center bg-gray-900">
        <Spinner width="8" height="8" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white mb-4">ThirdLayer Chat</h1>
          <p className="text-gray-400">Please sign in to access the chat.</p>
        </div>
      </div>
    );
  }

  return (
    <Protected>
      <MainPage />
    </Protected>
  );
}
