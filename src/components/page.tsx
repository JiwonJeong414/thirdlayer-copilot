'use client';

import React, { useState } from 'react';
import {
  Search,
  Send,
  FileText,
  Folder,
  MoreHorizontal,
  Settings,
  User,
  HelpCircle,
  MessageSquare,
  LogOut,
  Plus,
  Trash2,
  Edit3,
  ChevronDown,
  Database,
  Cpu,
  Activity,
} from 'lucide-react';

export default function MainPage() {
  const [message, setMessage] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [activeChat, setActiveChat] = useState(0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim()) {
      console.log('Sending message:', message);
      setMessage('');
    }
  };

  const connectGoogleDrive = () => {
    setIsConnected(true);
  };

  const chats = [
    { id: 0, title: 'C++ Filesystem...', tokens: '1600 tokens', active: true },
    { id: 1, title: 'log about version of ...', tokens: '56 tokens', active: false },
    { id: 2, title: 'Financial analysis', tokens: '106 tokens', active: false },
  ];

  const examplePrompts = [
    'Find my Q4 budget spreadsheet',
    'Search for meeting notes about the product launch',
    'What are the key points from my project documents?',
  ];

  return (
    <div className="min-h-screen flex bg-gray-900 text-white">
      {/* Sidebar */}
      <div className="w-80 bg-gray-800 border-r border-gray-700 flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <div className="w-6 h-6 bg-orange-500 rounded flex items-center justify-center">
                <span className="text-white font-bold text-xs">TL</span>
              </div>
              <span className="text-white font-medium">Chats</span>
            </div>
            <div className="flex items-center space-x-2">
              <button className="p-1 hover:bg-gray-700 rounded text-gray-400 hover:text-white transition-colors">
                <Settings className="w-4 h-4" />
              </button>
              <button className="p-1 hover:bg-gray-700 rounded text-gray-400 hover:text-white transition-colors">
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>
          
          {/* Model Selection */}
          <div className="bg-gray-700 rounded-lg p-3 mb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 bg-purple-500 rounded-sm"></div>
                <span className="text-sm text-white">thirdlayer/gdrive-copilot</span>
              </div>
              <ChevronDown className="w-4 h-4 text-gray-400" />
            </div>
          </div>

          {/* Connection Status */}
          {!isConnected ? (
            <button
              onClick={connectGoogleDrive}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-lg text-sm transition-colors"
            >
              Connect Google Drive
            </button>
          ) : (
            <div className="flex items-center space-x-2 text-green-400 bg-green-900 bg-opacity-30 p-2 rounded-lg">
              <div className="w-2 h-2 bg-green-400 rounded-full"></div>
              <span className="text-sm">Connected</span>
            </div>
          )}
        </div>

        {/* Chat List */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-2">
            {chats.map((chat) => (
              <div
                key={chat.id}
                onClick={() => setActiveChat(chat.id)}
                className={`p-3 rounded-lg mb-1 cursor-pointer transition-colors group ${
                  chat.id === activeChat
                    ? 'bg-gray-700 border-l-2 border-blue-500'
                    : 'hover:bg-gray-700 hover:bg-opacity-50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white truncate">
                      {chat.title}
                    </p>
                    <p className="text-xs text-gray-400">
                      {chat.tokens}
                    </p>
                  </div>
                  <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button className="p-1 hover:bg-gray-600 rounded text-gray-400 hover:text-white">
                      <Edit3 className="w-3 h-3" />
                    </button>
                    <button className="p-1 hover:bg-gray-600 rounded text-gray-400 hover:text-white">
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom Section */}
        <div className="p-4 border-t border-gray-700">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-gray-400">SYSTEM RESOURCES USAGE:</span>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-1">
                <Database className="w-3 h-3 text-gray-400" />
                <span className="text-xs text-gray-400">RAM: 4.47 GB</span>
              </div>
              <div className="flex items-center space-x-1">
                <Cpu className="w-3 h-3 text-gray-400" />
                <span className="text-xs text-gray-400">CPU: 0.80 %</span>
              </div>
            </div>
          </div>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="w-6 h-6 bg-gray-600 rounded-full flex items-center justify-center">
                <User className="w-3 h-3 text-gray-300" />
              </div>
              <span className="text-sm text-gray-300">Jiwon Jeong</span>
            </div>
            <Settings className="w-4 h-4 text-gray-400 cursor-pointer hover:text-white transition-colors" />
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Top Bar */}
        <div className="bg-gray-800 border-b border-gray-700 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <span className="text-lg font-medium text-white">
                ThirdLayer Copilot
              </span>
              <div className="flex items-center space-x-2 text-sm text-gray-400">
                <span>Assistant</span>
                <span className="bg-gray-700 px-2 py-1 rounded text-xs">
                  thirdlayer-gdrive-copilot
                </span>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <button className="p-2 hover:bg-gray-700 rounded text-gray-400 hover:text-white transition-colors">
                <Search className="w-4 h-4" />
              </button>
              <button className="p-2 hover:bg-gray-700 rounded text-gray-400 hover:text-white transition-colors">
                <HelpCircle className="w-4 h-4" />
              </button>
              <button className="p-2 hover:bg-gray-700 rounded text-gray-400 hover:text-white transition-colors">
                <MoreHorizontal className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Chat Area */}
        <div className="flex-1 flex flex-col">
          <div className="flex-1 p-6 overflow-y-auto">
            {!isConnected ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center max-w-md">
                  <div className="w-16 h-16 bg-blue-600 bg-opacity-20 rounded-xl mx-auto mb-4 flex items-center justify-center">
                    <MessageSquare className="w-8 h-8 text-blue-400" />
                  </div>
                  <h3 className="text-xl font-medium text-white mb-2">
                    Connect Your Google Drive
                  </h3>
                  <p className="text-gray-400 mb-6 leading-relaxed">
                    Connect your Google Drive to start searching and summarizing your documents.
                  </p>
                  <button
                    onClick={connectGoogleDrive}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
                  >
                    Connect Google Drive
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-full">
                <div className="text-center max-w-lg">
                  <div className="w-16 h-16 bg-blue-600 bg-opacity-20 rounded-xl mx-auto mb-4 flex items-center justify-center">
                    <MessageSquare className="w-8 h-8 text-blue-400" />
                  </div>
                  <h3 className="text-xl font-medium text-white mb-2">
                    Ready to Help
                  </h3>
                  <p className="text-gray-400 mb-6 leading-relaxed">
                    Ask me anything about your Google Drive documents, or try one of these examples:
                  </p>
                  <div className="space-y-3">
                    {examplePrompts.map((text, idx) => (
                      <button
                        key={idx}
                        onClick={() => setMessage(text)}
                        className="block w-full px-4 py-3 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-lg text-sm text-gray-300 text-left transition-colors"
                      >
                        "{text}"
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Input Area */}
          <div className="p-4 border-t border-gray-700">
            <div className="flex items-end space-x-3">
              <div className="flex-1">
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder={isConnected ? 'Type a message and press Enter to send ...' : 'Connect Google Drive to get started'}
                  disabled={!isConnected}
                  rows={1}
                  className="w-full px-4 py-3 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 resize-none"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSubmit(e);
                    }
                  }}
                />
                <div className="flex items-center justify-between mt-2">
                  <span className="text-xs text-gray-500">Context is 39.1% full</span>
                  <button className="text-xs text-blue-400 hover:text-blue-300 px-2 py-1 hover:bg-gray-800 rounded transition-colors">
                    Insert (⌘I)
                  </button>
                </div>
              </div>
              <button
                onClick={handleSubmit}
                disabled={!message.trim() || !isConnected}
                className={`p-3 rounded-lg transition-colors ${
                  message.trim() && isConnected
                    ? 'bg-blue-600 hover:bg-blue-700 text-white'
                    : 'bg-gray-700 text-gray-500 cursor-not-allowed'
                }`}
              >
                <Send className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};