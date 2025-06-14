// src/app/page.tsx - Updated to be a proper dashboard
'use client';

import { useAuth } from '@/contexts/AuthContext';
import LandingPage from '@/components/LandingPage';
import Dashboard from '@/components/Dashboard';
import Spinner from '@/components/Spinner';
import Protected from '@/components/Protected';

export default function Home() {
  const { user, loading } = useAuth();

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

  // Show the dashboard for authenticated users
  return (
    <Protected>
      <Dashboard />
    </Protected>
  );
}