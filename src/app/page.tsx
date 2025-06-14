// src/app/page.tsx - Updated to show landing page for non-authenticated users
'use client';

import { useAuth } from '@/contexts/AuthContext';
import LandingPage from '@/components/LandingPage';
import MainPage from '@/components/MainPage';
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

  return (
    <>
      {user ? (
        <Protected>
          <MainPage />
        </Protected>
      ) : (
        <LandingPage />
      )}
    </>
  );
}