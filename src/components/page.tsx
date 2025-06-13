// src/components/page.tsx - Updated with Drive Integration
'use client';

import React from 'react';
import Sidebar from './sidebar/Sidebar';
import ChatArea from './chat/ChatArea';

export default function MainPage() {
  return (
    <div className="min-h-screen flex bg-gray-900 text-white">
      <Sidebar />
      <ChatArea />
    </div>
  );
}