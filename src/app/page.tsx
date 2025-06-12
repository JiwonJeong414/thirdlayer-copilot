// TODO: Fix 'use client' directives - only put where needed (needed at top of pages, not components)
'use client';

import { useAuth } from '@/contexts/AuthContext';
import LoginPage from './components/LoginPage';
import InitialChatPage from './components/InitialChatPage';
import Spinner from './components/Spinner';
import Protected from './components/Protected';

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
          <InitialChatPage />
        </Protected>
      ) : (
        <LoginPage />
      )}
    </>
  );
}