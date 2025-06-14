// src/app/cleaner/page.tsx
'use client';

import { useAuth } from '@/contexts/AuthContext';
import DriveCleanerPanel from '@/components/drive/DriveCleanerPanel';
import Protected from '@/components/layout/Protected';
import Spinner from '@/components/ui/Spinner';

export default function CleanerPage() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex h-screen w-screen justify-center align-middle">
        <Spinner width="5" height="5" />
      </div>
    );
  }

  if (!user) {
    return <div>Please sign in to access the Drive Cleaner.</div>;
  }

  return (
    <Protected>
      <div className="min-h-screen bg-gray-900">
        <DriveCleanerPanel />
      </div>
    </Protected>
  );
}