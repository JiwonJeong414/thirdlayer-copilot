// TODO: Fix 'use client' directives - only put where needed (needed at top of pages, not components)
'use client';

import { useAuth } from '@/contexts/AuthContext';
import LoginPage from '@/components/auth/LoginPage';
import MainPage from '@/components/page';
import Spinner from '@/components/ui/Spinner';
import Protected from '@/components/layout/Protected';

export default function Home() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex h-screen w-screen justify-center align-middle">
        <Spinner width="5" height="5" />
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
        <LoginPage />
      )}
    </>
  );
}