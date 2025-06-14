// src/app/page.tsx - Updated to include dashboard option
'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useSearchParams } from 'next/navigation';
import LandingPage from '@/components/LandingPage';
import Dashboard from '@/components/Dashboard';
import MainPage from '@/components/MainPage';
import Spinner from '@/components/Spinner';
import Protected from '@/components/Protected';

export default function Home() {
  const { user, loading } = useAuth();
  const searchParams = useSearchParams();
  
  // Check if user wants to go directly to chat
  const directToChat = searchParams.get('chat') === 'true' || searchParams.get('search') === 'true';

  if (loading) {
    return (
      <div className="flex h-screen w-screen justify-center items-center bg-gray-900">
        <Spinner width="8" height="8" />
      </div>
    );
  }

  // If user is not authenticated, show landing page
  if (!user) {
    return <LandingPage />;
  }

  // If user is authenticated and wants direct chat access, show main app
  if (directToChat) {
    return (
      <Protected>
        <MainPage />
      </Protected>
    );
  }

  // Otherwise show the dashboard
  return (
    <Protected>
      <Dashboard />
    </Protected>
  );
}