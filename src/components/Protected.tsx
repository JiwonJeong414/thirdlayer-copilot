'use client';

import { ReactNode } from 'react';

interface ProtectedProps {
  children: ReactNode;
}

export default function Protected({ children }: ProtectedProps) {
  return (
    <div className="min-h-screen bg-gray-50">
      {children}
    </div>
  );
} 