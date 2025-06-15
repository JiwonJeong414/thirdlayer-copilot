// Drive Integration
'use client';

import React from 'react';
import ChatSidebar from './ChatSidebar';
import ChatArea from './ChatArea';

export default function ChatPage() {
  return (
    <div className="min-h-screen flex bg-gray-900 text-white">
      <ChatSidebar />  {/* Left panel with models, Drive status, chat history */}
      <ChatArea /> {/* Main chat interface */}
    </div>
  );
}
