// ChatSidebar component for the Chat Page
import React, { useState } from "react";
import Link from "next/link";
import {
  Plus,
  Cloud,
  CloudOff,
  ChevronDown,
  MessageSquare,
  Trash2,
  Database,
  Activity,
  User,
  MoreHorizontal,
  Settings,
  HelpCircle,
  LogOut,
  ToggleLeft,
  ToggleRight,
  ArrowLeft
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useChat } from '@/contexts/ChatContext';
import { useDrive } from '@/contexts/DriveContext';

// Main ChatSidebar component that handles chat navigation and user settings
export default function ChatSidebar() {
  // State for user menu dropdown visibility
  const [showUserMenu, setShowUserMenu] = useState(false);
  // Get user data and authentication functions from context
  const { user, signOut, driveConnection } = useAuth();
  const { indexedFiles } = useDrive();
  // Get chat-related state and functions from context
  const {
    chats,
    currentChat,
    selectedModel,
    availableModels,
    driveSearchEnabled,
    setSelectedModel,
    setDriveSearchEnabled,
    createNewChat,
    loadChat,
    deleteChat,
    clearCurrentChat,
  } = useChat();

  // Handler for creating a new chat
  const handleNewChat = async () => {
    clearCurrentChat();
  };

  // Handler for loading a specific chat
  const handleChatClick = async (chatId: string) => {
    await loadChat(chatId);
  };

  // Handler for deleting a chat with confirmation
  const handleDeleteChat = async (chatId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm("Are you sure you want to delete this chat?")) {
      await deleteChat(chatId);
    }
  };

  // Handler for user sign out with confirmation
  const handleSignOut = async () => {
    if (confirm("Are you sure you want to sign out?")) {
      await signOut();
    }
  };

  return (
    <div className="w-80 bg-gray-800 border-r border-gray-700 flex flex-col h-screen">
      {/* Header section with logo, new chat button, and model selection */}
      <div className="p-4 border-b border-gray-700 flex-shrink-0">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <Link href="/" className="p-1 hover:bg-gray-700 rounded text-gray-400 hover:text-white transition-colors">
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div className="w-6 h-6 bg-gradient-to-r from-blue-500 via-purple-500 to-green-500 rounded flex items-center justify-center">
              <span className="text-white font-bold text-xs">TL</span>
            </div>
            <span className="text-white font-medium">TripleClean Chat</span>
          </div>
          <button
            onClick={handleNewChat}
            className="p-1 hover:bg-gray-700 rounded text-gray-400 hover:text-white transition-colors"
            title="New Chat"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>

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

        {/* Google Drive Panel - Simplified */}
        <div className="bg-gray-700 rounded-lg p-3 mb-4">
          {/* Drive Header */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-2">
              {driveConnection.isConnected ? (
                <Cloud className="w-4 h-4 text-green-400" />
              ) : (
                <CloudOff className="w-4 h-4 text-gray-400" />
              )}
              <span className="text-sm font-medium text-white">
                Google Drive
              </span>
            </div>

            {/* Simple Toggle */}
            <button
              onClick={() => setDriveSearchEnabled(!driveSearchEnabled)}
              disabled={!driveConnection.isConnected}
              className="flex items-center space-x-1 text-xs transition-colors disabled:opacity-50"
              title={driveSearchEnabled ? "Disable Drive Search" : "Enable Drive Search"}
            >
              {driveSearchEnabled ? (
                <ToggleRight className="w-5 h-5 text-green-400" />
              ) : (
                <ToggleLeft className="w-5 h-5 text-gray-400" />
              )}
              <span className={`${driveSearchEnabled ? 'text-green-400' : 'text-gray-400'}`}>
                {driveSearchEnabled ? 'On' : 'Off'}
              </span>
            </button>
          </div>

          {/* Drive Status */}
          {driveConnection.isConnected ? (
            <div className="mt-2">
              <div className="flex items-center justify-between text-xs text-gray-400">
                <span>Indexed Files</span>
                <span>{indexedFiles.length}</span>
              </div>
              
              {/* Simple note about sync */}
              <div className="mt-2 text-xs text-gray-500">
                <span>Manage sync on </span>
                <Link 
                  href="/"
                  className="text-blue-400 hover:text-blue-300 underline"
                >
                  dashboard
                </Link>
              </div>
            </div>
          ) : (
            <div className="text-xs text-gray-400">
              Connect Drive on dashboard to enable search
            </div>
          )}
        </div>

        {/* Connection Status */}
        <div className="flex items-center space-x-2 text-green-400 bg-green-900 bg-opacity-30 p-2 rounded-lg">
          <div className="w-2 h-2 bg-green-400 rounded-full"></div>
          <span className="text-sm">Ollama Connected</span>
        </div>
      </div>

      {/* Chat history section with scrollable list of previous chats */}
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
                  ? "bg-gray-700 border-l-2 border-blue-500"
                  : "hover:bg-gray-700 hover:bg-opacity-50"
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white truncate">{chat.summary}</p>
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

      {/* Bottom section with connection status and user profile */}
      <div className="p-4 border-t border-gray-700 flex-shrink-0">
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
                  {user?.displayName || "User"}
                </p>
                <p className="text-xs text-gray-500 truncate">{user?.email}</p>
              </div>
            </div>
            <MoreHorizontal className="w-4 h-4 text-gray-400" />
          </div>

          {/* User Menu Dropdown */}
          {showUserMenu && (
            <div className="absolute bottom-full left-0 right-0 mb-2 bg-gray-700 rounded-lg shadow-lg border border-gray-600 py-1 z-50">
              <Link
                href="/"
                className="w-full px-3 py-2 text-left text-sm text-gray-300 hover:bg-gray-600 flex items-center space-x-2 transition-colors"
                onClick={() => setShowUserMenu(false)}
              >
                <Settings className="w-4 h-4" />
                <span>Dashboard</span>
              </Link>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowUserMenu(false);
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

      {/* Overlay to close user menu when clicking outside */}
      {showUserMenu && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setShowUserMenu(false)}
        />
      )}
    </div>
  );
}