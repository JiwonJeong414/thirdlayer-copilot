// src/contexts/AuthContext.tsx
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
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  error: string | null;
  driveConnection: DriveConnection;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  connectDrive: () => Promise<void>;
  disconnectDrive: () => Promise<void>;
  refreshDriveToken: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  error: null,
  driveConnection: { isConnected: false },
  signInWithGoogle: async () => {},
  signOut: async () => {},
  connectDrive: async () => {},
  disconnectDrive: async () => {},
  refreshDriveToken: async () => {},
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
      // Get the OAuth URL
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

  const connectDrive = async () => {
    setError(null);
    setLoading(true);
    try {
      // Get the OAuth URL with Drive scopes
      const response = await fetch('/api/drive/auth-url');
      const { url } = await response.json();
      
      // Redirect to Google's OAuth page
      window.location.href = url;
    } catch (error) {
      console.error('Drive connection error:', error);
      setError((error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const disconnectDrive = async () => {
    setError(null);
    try {
      const response = await fetch('/api/drive/disconnect', {
        method: 'POST',
      });

      if (response.ok) {
        setDriveConnection({ isConnected: false });
      }
    } catch (error) {
      console.error('Drive disconnection error:', error);
      setError((error as Error).message);
    }
  };

  const refreshDriveToken = async () => {
    try {
      if (!user || !driveConnection.refreshToken) return;

      const response = await fetch('/api/drive/refresh', {
        method: 'POST',
      });

      if (response.ok) {
        const data = await response.json();
        setDriveConnection(prev => ({
          ...prev,
          accessToken: data.accessToken,
          expiryDate: data.expiryDate,
        }));
      }
    } catch (error) {
      console.error('Token refresh error:', error);
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

  // Check Drive connection status
  useEffect(() => {
    const checkDriveConnection = async () => {
      if (!user) return;

      try {
        const response = await fetch('/api/drive/status');
        if (response.ok) {
          const data = await response.json();
          setDriveConnection(data);
        }
      } catch (error) {
        console.error('Error checking Drive connection:', error);
      }
    };

    if (user) {
      checkDriveConnection();
    }
  }, [user]);

  return (
    <AuthContext.Provider
      value={{ 
        user, 
        loading, 
        error, 
        driveConnection,
        signInWithGoogle, 
        signOut,
        connectDrive,
        disconnectDrive,
        refreshDriveToken,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};