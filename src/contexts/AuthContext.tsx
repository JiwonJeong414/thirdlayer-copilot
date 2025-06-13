// Remove the old googleAuth.ts file and update your AuthContext.tsx
// src/contexts/AuthContext.tsx - Updated to handle Drive connection properly

"use client";

import React, { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { useRouter } from 'next/navigation';

interface User {
  id: string;
  email: string;
  displayName: string;
  photoURL: string;
}

interface DriveConnection {
  isConnected: boolean;
  accessToken?: string;
  refreshToken?: string;
  connectedAt?: string;
  lastSyncAt?: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  error: string | null;
  driveConnection: DriveConnection;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  refreshDriveConnection: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  error: null,
  driveConnection: { isConnected: false },
  signInWithGoogle: async () => {},
  signOut: async () => {},
  refreshDriveConnection: async () => {},
});

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [driveConnection, setDriveConnection] = useState<DriveConnection>({ isConnected: false });
  const router = useRouter();

  const signInWithGoogle = async () => {
    console.log('Starting Google sign in...');
    setError(null);
    setLoading(true);
    try {
      // Get the OAuth URL for main authentication
      const response = await fetch('/api/auth/google/url');
      console.log('Got response:', response.status);
      
      if (!response.ok) {
        const errorData = await response.json();
        console.error('Failed to get OAuth URL:', errorData);
        throw new Error(errorData.error || 'Failed to get OAuth URL');
      }

      const data = await response.json();
      console.log('Got OAuth URL:', data);

      if (!data.url) {
        console.error('No URL in response:', data);
        throw new Error('No OAuth URL received');
      }

      // Redirect to Google's OAuth page
      console.log('Redirecting to:', data.url);
      window.location.href = data.url;
    } catch (error) {
      console.error('Sign in error:', error);
      setError((error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const refreshDriveConnection = async () => {
    if (!user) return;

    try {
      const response = await fetch('/api/drive/status');
      if (response.ok) {
        const data = await response.json();
        setDriveConnection(data);
      }
    } catch (error) {
      console.error('Error refreshing Drive connection:', error);
    }
  };

  const signOut = async () => {
    setError(null);
    setLoading(true);
    try {
      await fetch('/api/auth/signout', { method: 'POST' });
      setUser(null);
      setDriveConnection({ isConnected: false });
      router.push('/');
    } catch (error) {
      console.error('Sign out error:', error);
      setError((error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  // Check authentication status
  useEffect(() => {
    const checkAuthStatus = async () => {
      try {
        const response = await fetch('/api/auth/status');
        if (response.ok) {
          const data = await response.json();
          if (data.user) {
            setUser(data.user);
          }
        }
      } catch (error) {
        console.error('Error checking auth status:', error);
      } finally {
        setLoading(false);
      }
    };

    checkAuthStatus();
  }, []);

  // Check Drive connection status when user changes
  useEffect(() => {
    if (user) {
      refreshDriveConnection();
    }
  }, [user]);

  // Check for Drive connection success in URL params
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('drive_connected') === 'true') {
      // Refresh Drive connection status
      refreshDriveConnection();
      // Clean up URL
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  return (
    <AuthContext.Provider
      value={{ 
        user, 
        loading, 
        error, 
        driveConnection,
        signInWithGoogle, 
        signOut,
        refreshDriveConnection,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};