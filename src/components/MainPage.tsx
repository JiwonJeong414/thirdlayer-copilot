// src/components/page.tsx - Updated with Drive Integration
'use client';

import React from 'react';
import Sidebar from './Sidebar';
import ChatArea from './ChatArea';

export default function MainPage() {
  return (
    <div className="min-h-screen flex bg-gray-900 text-white">
      <Sidebar />
      <ChatArea />
    </div>
  );
}
