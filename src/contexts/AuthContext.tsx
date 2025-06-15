// Authentication Context for managing user authentication state and Google Sign-in
"use client";

import React, { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { useRouter } from 'next/navigation';
import { User, DriveConnection, AuthContextType } from '@/types/auth';

// Create the authentication context with default values
const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  error: null,
  driveConnection: { isConnected: false },
  signInWithGoogle: async () => {},
  signOut: async () => {},
  refreshDriveConnection: async () => {},
});

// Custom hook to use the auth context
// Throws an error if used outside of AuthProvider
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

// AuthProvider component that wraps the application and provides authentication state
export const AuthProvider = ({ children }: { children: ReactNode }) => {
  // State management for user authentication
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [driveConnection, setDriveConnection] = useState<DriveConnection>({ isConnected: false });
  const router = useRouter();

  // Function to handle Google Sign-in process
  const signInWithGoogle = async () => {
    console.log('Starting Google sign in...');
    setError(null);
    setLoading(true);
    try {
      // Fetch the OAuth URL from our backend
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

      // Redirect user to Google's OAuth consent screen
      console.log('Redirecting to:', data.url);
      window.location.href = data.url;
    } catch (error) {
      console.error('Sign in error:', error);
      setError((error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  // Function to check and update Google Drive connection status
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

  // Function to handle user sign out
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

  // Effect to check authentication status on initial load
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

  // Effect to check Drive connection when user state changes
  useEffect(() => {
    if (user) {
      refreshDriveConnection();
    }
  }, [user]);

  // Effect to handle Drive connection success from URL parameters
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('drive_connected') === 'true') {
      // Refresh Drive connection status
      refreshDriveConnection();
      // Remove the parameter from URL for clean navigation
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  // Provide authentication context to children components
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