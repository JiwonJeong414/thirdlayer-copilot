// src/types/auth.ts - Authentication types

export interface User {
  id: string;
  uid: string;
  email: string;
  displayName: string;
  photoURL: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface DriveConnection {
  isConnected: boolean;
  accessToken?: string;
  refreshToken?: string;
  connectedAt?: Date;
  lastSyncAt?: Date;
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