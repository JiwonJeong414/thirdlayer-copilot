// src/contexts/AuthContext.tsx
"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { signInWithPopup, signOut as firebaseSignOut, onAuthStateChanged } from "firebase/auth";
import { useRouter } from 'next/navigation';
import { auth, googleProvider } from "@/lib/firebase";

interface User {
  uid: string;
  email: string;
  displayName: string;
  photoURL: string;
  getIdToken: () => Promise<string>;
}

interface DriveConnection {
  isConnected: boolean;
  accessToken?: string;
  refreshToken?: string;
  expiryDate?: number;
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
    setError(null);
    setLoading(true);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const firebaseUser = result.user;
      
      // Create/update user in your database
      await fetch('/api/auth/user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          displayName: firebaseUser.displayName,
          photoURL: firebaseUser.photoURL,
        }),
      });
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
      const result = await signInWithPopup(auth, googleProvider);
      const accessToken = await result.user.getIdToken();
      
      // Store Drive credentials
      const response = await fetch('/api/drive/connect', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          accessToken,
        }),
      });

      if (response.ok) {
        setDriveConnection({
          isConnected: true,
          accessToken,
        });
      }
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
      if (!user) return;

      const response = await fetch('/api/drive/disconnect', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${await auth.currentUser?.getIdToken()}`,
        },
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
        headers: {
          'Authorization': `Bearer ${await auth.currentUser?.getIdToken()}`,
        },
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
      await firebaseSignOut(auth);
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

  // Check Drive connection status
  useEffect(() => {
    const checkDriveConnection = async () => {
      if (!user) return;

      try {
        const token = await auth.currentUser?.getIdToken();
        console.log('Drive status token:', token);
        if (!token) {
          console.warn('No token available for Drive status check');
          return;
        }

        const response = await fetch('/api/drive/status', {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        if (response.status === 401) {
          console.warn('Drive status check received 401 Unauthorized');
          await firebaseSignOut(auth);
          setUser(null);
          setDriveConnection({ isConnected: false });
          return;
        }

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

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          console.log('Getting Firebase ID token...');
          const token = await firebaseUser.getIdToken();
          console.log('Token obtained successfully');

          console.log('Creating/updating user...');
          const response = await fetch('/api/auth/user', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify({
              email: firebaseUser.email,
              displayName: firebaseUser.displayName,
              photoURL: firebaseUser.photoURL,
            }),
          });

          const data = await response.json();
          console.log('User API response:', { status: response.status, data });

          if (response.ok) {
            setUser({
              uid: firebaseUser.uid,
              email: firebaseUser.email!,
              displayName: firebaseUser.displayName!,
              photoURL: firebaseUser.photoURL!,
              getIdToken: async () => await firebaseUser.getIdToken(),
            });
          } else {
            throw new Error(data.error || 'Failed to create/update user');
          }
        } catch (error) {
          console.error('Error in auth state change:', error);
          setError(error instanceof Error ? error.message : 'Failed to authenticate user');
          // Sign out the user if there's an authentication error
          await firebaseSignOut(auth);
        }
      } else {
        console.log('No Firebase user, clearing state');
        setUser(null);
        setDriveConnection({ isConnected: false });
      }
      setLoading(false);
    });

    return () => unsubscribe();
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
        connectDrive,
        disconnectDrive,
        refreshDriveToken,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};