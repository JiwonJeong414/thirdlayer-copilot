import React, { useState } from 'react';
import {
  Plus,
  Cloud,
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
  FileText,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useChat } from '@/contexts/ChatContext';
import { DriveConnectionPanel } from '../DriveConnection';

export default function Sidebar() {
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showDrivePanel, setShowDrivePanel] = useState(false);
  const { user, signOut, driveConnection } = useAuth();
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

  const handleNewChat = async () => {
    clearCurrentChat();
  };

  const handleChatClick = async (chatId: string) => {
    await loadChat(chatId);
  };

  const handleDeleteChat = async (chatId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Are you sure you want to delete this chat?')) {
      await deleteChat(chatId);
    }
  };

  const handleSignOut = async () => {
    if (confirm('Are you sure you want to sign out?')) {
      await signOut();
    }
  };

  return (
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

      {/* Click outside to close user menu */}
      {showUserMenu && (
        <div 
          className="fixed inset-0 z-40" 
          onClick={() => setShowUserMenu(false)}
        />
      )}
    </div>
  );
} 