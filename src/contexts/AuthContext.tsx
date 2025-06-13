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
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  error: string | null;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  error: null,
  signInWithGoogle: async () => {},
  signOut: async () => {},
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

  const signOut = async () => {
    setError(null);
    setLoading(true);
    try {
      await firebaseSignOut(auth);
      setUser(null);
      router.push('/');
    } catch (error) {
      console.error('Sign out error:', error);
      setError((error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        // Create/update user in database and get user data
        try {
          const response = await fetch('/api/auth/user', {
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

          if (response.ok) {
            setUser({
              uid: firebaseUser.uid,
              email: firebaseUser.email!,
              displayName: firebaseUser.displayName!,
              photoURL: firebaseUser.photoURL!,
            });
          } else {
            throw new Error('Failed to create/update user');
          }
        } catch (error) {
          console.error('Error creating/updating user:', error);
          setError('Failed to authenticate user');
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return (
    <AuthContext.Provider
      value={{ user, loading, error, signInWithGoogle, signOut }}
    >
      {children}
    </AuthContext.Provider>
  );
};