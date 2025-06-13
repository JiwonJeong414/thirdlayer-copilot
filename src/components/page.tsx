// src/components/page.tsx - Updated with Drive Integration
'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Search,
  Send,
  MoreHorizontal,
  Settings,
  User,
  HelpCircle,
  MessageSquare,
  Plus,
  Trash2,
  Edit3,
  ChevronDown,
  Database,
  Activity,
  LogOut,
  Menu,
  X,
  FileText,
  Cloud,
} from 'lucide-react';
import { useChat } from '@/contexts/ChatContext';
import { useAuth } from '@/contexts/AuthContext';
import { useDrive } from '@/contexts/DriveContext';
import { DriveConnectionPanel } from './DriveConnection';

export default function MainPage() {
  const [message, setMessage] = useState('');
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showDrivePanel, setShowDrivePanel] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { user, signOut, driveConnection } = useAuth();
  
  const {
    chats,
    currentChat,
    messages,
    isLoading,
    selectedModel,
    availableModels,
    driveSearchEnabled,
    setSelectedModel,
    setDriveSearchEnabled,
    createNewChat,
    loadChat,
    sendMessage,
    deleteChat,
    clearCurrentChat,
  } = useChat();

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim() && !isLoading) {
      await sendMessage(message.trim());
      setMessage('');
    }
  };

  const handleNewChat = async () => {
    clearCurrentChat();
  };

  const handleChatClick = async (chatId: string) => {
    await loadChat(chatId);
  };

  const handleDeleteChat = async (chatId: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent chat selection
    if (confirm('Are you sure you want to delete this chat?')) {
      await deleteChat(chatId);
    }
  };

  const handleSignOut = async () => {
    if (confirm('Are you sure you want to sign out?')) {
      await signOut();
    }
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString();
  };

  const examplePrompts = [
    'Explain quantum computing in simple terms',
    'Write a Python function to reverse a string',
    'What are the benefits of renewable energy?',
    driveConnection.isConnected ? 'Search my documents for project updates' : null,
  ].filter(Boolean);

  return (
    <div className="min-h-screen flex bg-gray-900 text-white">
      {/* Sidebar */}
      <div className="w-80 bg-gray-800 border-r border-gray-700 flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <div className="w-6 h-6 bg-orange-500 rounded flex items-center justify-center">
                <span className="text-white font-bold text-xs">OL</span>
              </div>
              <span className="text-white font-medium">Ollama Chat</span>
            </div>
            <div className="flex items-center space-x-2">
              <button 
                onClick={handleNewChat}
                className="p-1 hover:bg-gray-700 rounded text-gray-400 hover:text-white transition-colors"
                title="New Chat"
              >
                <Plus className="w-4 h-4" />
              </button>
              <button 
                onClick={() => setShowDrivePanel(!showDrivePanel)}
                className={`p-1 hover:bg-gray-700 rounded transition-colors ${
                  driveConnection.isConnected ? 'text-green-400' : 'text-gray-400 hover:text-white'
                }`}
                title="Google Drive"
              >
                <Cloud className="w-4 h-4" />
              </button>
            </div>
          </div>
          
          {/* Drive Panel */}
          {showDrivePanel && <DriveConnectionPanel />}
          
          {/* Model Selection */}
          <div className="bg-gray-700 rounded-lg p-3 mb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 bg-purple-500 rounded-sm"></div>
                <select
                  value={selectedModel}
                  onChange={(e) => setSelectedModel(e.target.value)}
                  className="bg-transparent text-sm text-white outline-none"
                >
                  {availableModels.length > 0 ? (
                    availableModels.map((model) => (
                      <option key={model} value={model} className="bg-gray-700">
                        {model}
                      </option>
                    ))
                  ) : (
                    <option value={selectedModel} className="bg-gray-700">
                      {selectedModel}
                    </option>
                  )}
                </select>
              </div>
              <ChevronDown className="w-4 h-4 text-gray-400" />
            </div>
          </div>

          {/* Drive Search Toggle */}
          {driveConnection.isConnected && (
            <div className="flex items-center justify-between p-3 bg-gray-700 rounded-lg mb-4">
              <div className="flex items-center space-x-2">
                <FileText className="w-4 h-4 text-blue-400" />
                <span className="text-sm text-white">Search Drive</span>
              </div>
              <button
                onClick={() => setDriveSearchEnabled(!driveSearchEnabled)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  driveSearchEnabled ? 'bg-blue-600' : 'bg-gray-600'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    driveSearchEnabled ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          )}

          {/* Connection Status */}
          <div className="flex items-center space-x-2 text-green-400 bg-green-900 bg-opacity-30 p-2 rounded-lg">
            <div className="w-2 h-2 bg-green-400 rounded-full"></div>
            <span className="text-sm">Ollama Connected</span>
          </div>
        </div>

        {/* Chat History */}
        <div className="flex-1 overflow-y-auto p-2">
          <div className="text-xs text-gray-400 mb-2 px-2">CHAT HISTORY</div>
          {!chats || chats.length === 0 ? (
            <div className="text-center text-gray-500 py-8">
              <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No chats yet</p>
            </div>
          ) : (
            chats.map((chat) => (
              <div
                key={chat.id}
                onClick={() => handleChatClick(chat.id)}
                className={`p-3 rounded-lg mb-1 cursor-pointer transition-colors group ${
                  currentChat?.id === chat.id
                    ? 'bg-gray-700 border-l-2 border-blue-500'
                    : 'hover:bg-gray-700 hover:bg-opacity-50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white truncate">
                      {chat.summary}
                    </p>
                    <p className="text-xs text-gray-400">
                      {new Date(chat.updatedAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button 
                      onClick={(e) => handleDeleteChat(chat.id, e)}
                      className="p-1 hover:bg-gray-600 rounded text-gray-400 hover:text-white"
                      title="Delete chat"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Bottom Section - User Profile */}
        <div className="p-4 border-t border-gray-700">
          {/* Status Section */}
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs text-gray-400">STATUS:</span>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-1">
                <Database className="w-3 h-3 text-gray-400" />
                <span className="text-xs text-gray-400">DB Connected</span>
              </div>
              <div className="flex items-center space-x-1">
                <Activity className="w-3 h-3 text-green-400" />
                <span className="text-xs text-green-400">Active</span>
              </div>
              {driveConnection.isConnected && (
                <div className="flex items-center space-x-1">
                  <Cloud className="w-3 h-3 text-blue-400" />
                  <span className="text-xs text-blue-400">Drive</span>
                </div>
              )}
            </div>
          </div>
          
          {/* User Profile Section */}
          <div className="relative">
            <div 
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center justify-between p-2 hover:bg-gray-700 rounded-lg cursor-pointer transition-colors"
            >
              <div className="flex items-center space-x-3">
                {user?.photoURL ? (
                  <img 
                    src={user.photoURL} 
                    alt="Profile" 
                    className="w-8 h-8 rounded-full"
                  />
                ) : (
                  <div className="w-8 h-8 bg-gray-600 rounded-full flex items-center justify-center">
                    <User className="w-4 h-4 text-gray-300" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-300 font-medium truncate">
                    {user?.displayName || 'User'}
                  </p>
                  <p className="text-xs text-gray-500 truncate">
                    {user?.email}
                  </p>
                </div>
              </div>
              <MoreHorizontal className="w-4 h-4 text-gray-400" />
            </div>

            {/* User Menu Dropdown */}
            {showUserMenu && (
              <div className="absolute bottom-full left-0 right-0 mb-2 bg-gray-700 rounded-lg shadow-lg border border-gray-600 py-1 z-50">
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowUserMenu(false);
                    // Add settings functionality here
                  }}
                  className="w-full px-3 py-2 text-left text-sm text-gray-300 hover:bg-gray-600 flex items-center space-x-2 transition-colors"
                >
                  <Settings className="w-4 h-4" />
                  <span>Settings</span>
                </button>
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowUserMenu(false);
                    // Add help functionality here
                  }}
                  className="w-full px-3 py-2 text-left text-sm text-gray-300 hover:bg-gray-600 flex items-center space-x-2 transition-colors"
                >
                  <HelpCircle className="w-4 h-4" />
                  <span>Help & Support</span>
                </button>
                <div className="border-t border-gray-600 my-1"></div>
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowUserMenu(false);
                    handleSignOut();
                  }}
                  className="w-full px-3 py-2 text-left text-sm text-red-400 hover:bg-gray-600 flex items-center space-x-2 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Sign Out</span>
                </button>
              </div>
            )}
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
                {currentChat ? currentChat.summary : 'Ollama Chat'}
              </span>
              <div className="flex items-center space-x-2 text-sm text-gray-400">
                <span>Model:</span>
                <span className="bg-gray-700 px-2 py-1 rounded text-xs">
                  {selectedModel}
                </span>
                {driveConnection.isConnected && driveSearchEnabled && (
                  <>
                    <span>•</span>
                    <span className="bg-blue-700 px-2 py-1 rounded text-xs flex items-center space-x-1">
                      <Cloud className="w-3 h-3" />
                      <span>Drive Search</span>
                    </span>
                  </>
                )}
              </div>
            </div>
            <div className="flex items-center space-x-3">
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
            {messages.length === 0 ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center max-w-lg">
                  <div className="w-16 h-16 bg-blue-600 bg-opacity-20 rounded-xl mx-auto mb-4 flex items-center justify-center">
                    <MessageSquare className="w-8 h-8 text-blue-400" />
                  </div>
                  <h3 className="text-xl font-medium text-white mb-2">
                    Start Chatting with Ollama
                  </h3>
                  <p className="text-gray-400 mb-6 leading-relaxed">
                    Ask me anything{driveConnection.isConnected ? ', search your Drive documents,' : ''} or try one of these examples:
                  </p>
                  <div className="space-y-3">
                    {examplePrompts.map((text, idx) => (
                      <button
                        key={idx}
                        onClick={() => text && setMessage(text)}
                        className="block w-full px-4 py-3 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-lg text-sm text-gray-300 text-left transition-colors"
                      >
                        "{text}"
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                {messages.map((msg, idx) => (
                  <div key={idx} className="flex space-x-4">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                      msg.sender === 'user' 
                        ? 'bg-blue-600' 
                        : 'bg-green-600'
                    }`}>
                      {msg.sender === 'user' ? (
                        <User className="w-4 h-4 text-white" />
                      ) : (
                        <MessageSquare className="w-4 h-4 text-white" />
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-1">
                        <span className="text-sm font-medium text-white">
                          {msg.sender === 'user' ? 'You' : msg.sender}
                        </span>
                        <span className="text-xs text-gray-400">
                          {formatTimestamp(msg.timestamp)}
                        </span>
                        {msg.driveContext && msg.driveContext.length > 0 && (
                          <span className="bg-blue-700 px-2 py-1 rounded text-xs flex items-center space-x-1">
                            <FileText className="w-3 h-3" />
                            <span>{msg.driveContext.length} docs</span>
                          </span>
                        )}
                      </div>
                      <div className="text-gray-200 whitespace-pre-wrap">
                        {msg.content}
                      </div>
                      
                      {/* Drive Context Display */}
                      {msg.driveContext && msg.driveContext.length > 0 && (
                        <div className="mt-3 p-3 bg-gray-800 rounded-lg border border-gray-700">
                          <div className="text-xs text-gray-400 mb-2 flex items-center space-x-1">
                            <FileText className="w-3 h-3" />
                            <span>Referenced Documents:</span>
                          </div>
                          <div className="space-y-2">
                            {msg.driveContext.map((doc, docIdx) => (
                              <div key={docIdx} className="flex items-center justify-between text-sm">
                                <span className="text-blue-400 truncate">
                                  {doc.fileName}
                                </span>
                                <span className="text-xs text-green-400">
                                  {(doc.similarity * 100).toFixed(1)}%
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {msg.images && msg.images.length > 0 && (
                        <div className="flex gap-2 mt-2">
                          {msg.images.map((image, imgIdx) => (
                            <img
                              key={imgIdx}
                              src={image}
                              alt="Attached image"
                              className="max-w-xs rounded-lg"
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                
                {isLoading && (
                  <div className="flex space-x-4">
                    <div className="w-8 h-8 rounded-full bg-green-600 flex items-center justify-center flex-shrink-0">
                      <MessageSquare className="w-4 h-4 text-white" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-1">
                        <span className="text-sm font-medium text-white">{selectedModel}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        <span className="text-gray-400">
                          {driveSearchEnabled && driveConnection.isConnected ? 'Searching documents and thinking...' : 'Thinking...'}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
                
                <div ref={messagesEndRef} />
              </div>
            )}
          </div>

          {/* Input Area */}
          <div className="p-4 border-t border-gray-700">
            <form onSubmit={handleSubmit} className="flex items-end space-x-3">
              <div className="flex-1">
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder={`Type your message${driveConnection.isConnected && driveSearchEnabled ? ' (will search your Drive)' : ''} and press Enter to send...`}
                  disabled={isLoading}
                  rows={1}
                  className="w-full px-4 py-3 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 resize-none"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSubmit(e);
                    }
                  }}
                />
              </div>
              <button
                type="submit"
                disabled={!message.trim() || isLoading}
                className={`p-3 rounded-lg transition-colors ${
                  message.trim() && !isLoading
                    ? 'bg-blue-600 hover:bg-blue-700 text-white'
                    : 'bg-gray-700 text-gray-500 cursor-not-allowed'
                }`}
              >
                <Send className="w-5 h-5" />
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* Click outside to close user menu */}
      {showUserMenu && (
        <div 
          className="fixed inset-0 z-40" 
          onClick={() => setShowUserMenu(false)}
        />
      )}
    </div>
  );
};