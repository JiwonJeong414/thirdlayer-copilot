// src/types/auth.ts - Authentication and Drive connection types

export interface User {
  id: string;
  email: string;
  displayName: string;
  photoURL: string;
}

export interface DriveConnection {
  isConnected: boolean;
  accessToken?: string;
  refreshToken?: string;
  connectedAt?: string;
  lastSyncAt?: string;
}

export interface AuthContextType {
  user: User | null;
  loading: boolean;
  error: string | null;
  driveConnection: DriveConnection;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  refreshDriveConnection: () => Promise<void>;
} 