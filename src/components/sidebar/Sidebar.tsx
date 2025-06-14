import React, { useState } from 'react';
import Link from 'next/link';
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
  FileText,
  RefreshCw,
  CheckCircle,
  Loader2,
  X,
  Zap,
  Sparkles
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useChat } from '@/contexts/ChatContext';
import { useDrive } from '@/contexts/DriveContext';

interface SyncResults {
  success: boolean;
  error?: string;
  embeddingCount?: number;
  newFilesAvailable?: number;
  skippedCount?: number;
  totalIndexedFiles?: number;
  strategy?: 'force_reindex' | 'new_files';
}

export default function Sidebar() {
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showSyncModal, setShowSyncModal] = useState(false);
  const [selectedSyncSize, setSelectedSyncSize] = useState(10);
  const [syncMode, setSyncMode] = useState('new'); // 'new' or 'force'
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncResults, setSyncResults] = useState<SyncResults | null>(null);
  const [showDriveCleaner, setShowDriveCleaner] = useState(false);


  const { user, signOut, driveConnection } = useAuth();
  const { indexedFiles, refreshIndexedFiles } = useDrive();
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

  const handleConnect = async () => {
    if (!user) {
      alert('Please sign in first');
      return;
    }

    try {
      const response = await fetch('/api/drive/auth-url');
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to get auth URL');
      }
      
      const { url } = await response.json();
      window.location.href = url;
    } catch (error) {
      console.error('Error connecting to Drive:', error);
      alert(`Failed to connect to Drive: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };


  const handleSmartSync = async () => {
    setIsSyncing(true);
    setSyncResults(null);
  
    try {
      console.log(`Starting smart sync for ${selectedSyncSize} files (mode: ${syncMode})`);
      
      const params = new URLSearchParams({
        limit: selectedSyncSize.toString(),
        ...(syncMode === 'force' && { force: 'true' })
      });
      
      const response = await fetch(`/api/drive/sync?${params}`, {
        method: 'POST',
      });
      
      if (!response.ok) {
        throw new Error('Smart sync failed');
      }
      
      const result = await response.json();
      console.log('Smart sync completed:', result);
      
      setSyncResults(result);
      
      // FIXED: Refresh the indexed files count immediately
      await refreshIndexedFiles();
      
      // Still auto-refresh page after a delay for full UI update
      setTimeout(() => {
        window.location.reload();
      }, 2000); // Reduced from 3000ms
      
    } catch (error) {
      console.error('Smart sync failed:', error);
      setSyncResults({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    } finally {
      setIsSyncing(false);
    }
  };

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

        {/* Google Drive Panel */}
        <div className="bg-gray-700 rounded-lg p-3 mb-4">
          {/* Drive Header */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-2">
              {driveConnection.isConnected ? (
                <Cloud className="w-4 h-4 text-green-400" />
              ) : (
                <CloudOff className="w-4 h-4 text-gray-400" />
              )}
              <span className="text-sm font-medium text-white">Google Drive</span>
            </div>
            
            <div className="flex items-center space-x-1">
              {driveConnection.isConnected ? (
                <button
                  onClick={() => setShowSyncModal(true)}
                  disabled={isSyncing}
                  className="flex items-center space-x-1 px-2 py-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 disabled:cursor-not-allowed text-white rounded text-xs transition-colors"
                >
                  {isSyncing ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <Zap className="w-3 h-3" />
                  )}
                  <span>{isSyncing ? 'Syncing' : 'Smart Sync'}</span>
                </button>
              ) : (
                <button
                  onClick={handleConnect}
                  className="px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs transition-colors"
                >
                  Connect
                </button>
              )}
            </div>
          </div>

          {driveConnection.isConnected && (
            <button
              onClick={() => setShowDriveCleaner(true)}
              className="flex items-center space-x-1 px-2 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-xs transition-colors"
            >
              <Link href="/cleaner" className="...">
                <Sparkles className="w-4 h-4" />
                  Drive Cleaner
              </Link>
            </button>
          )}

          {/* Drive Status */}
          {driveConnection.isConnected ? (
            <div className="mt-2">
              <div className="flex items-center justify-between text-xs text-gray-400">
                <span>Indexed Files</span>
                <span>{indexedFiles.length}</span>
              </div>
              
              {/* Add Drive Cleaner buttons */}
              <div className="flex items-center space-x-2 mt-2">
                <button
                  onClick={() => window.location.href = '/cleaner'}
                  className="flex items-center space-x-1 px-2 py-1 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white rounded text-xs transition-colors"
                  title="AI-powered file cleanup"
                >
                  <Sparkles className="w-3 h-3" />
                  <span>AI Clean</span>
                </button>
                
                <button
                  onClick={() => window.location.href = '/cleaner?mode=batch'}
                  className="flex items-center space-x-1 px-2 py-1 bg-orange-600 hover:bg-orange-700 text-white rounded text-xs transition-colors"
                  title="Quick cleanup suggestions"
                >
                  <Zap className="w-3 h-3" />
                  <span>Quick</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="text-xs text-gray-400">
              Connect to enable document search
            </div>
          )}
        </div>

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

      {/* Smart Sync Modal */}
      {showSyncModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-lg w-full max-w-md border border-gray-700">
            {!isSyncing && !syncResults ? (
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-medium text-white">Smart Sync Drive</h3>
                  <button
                    onClick={() => setShowSyncModal(false)}
                    className="text-gray-400 hover:text-white p-1 rounded hover:bg-gray-700 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="space-y-4">
                  {/* Target Documents */}
                  <div>
                    <label className="text-sm text-gray-400 mb-2 block">
                      New documents to index:
                    </label>
                    <div className="grid grid-cols-4 gap-2">
                      {[5, 10, 25, 50].map(size => (
                        <button
                          key={size}
                          onClick={() => setSelectedSyncSize(size)}
                          className={`p-2 rounded text-center transition-colors ${
                            selectedSyncSize === size
                              ? 'border-blue-500 bg-blue-500/20 text-blue-300 border'
                              : 'border-gray-600 bg-gray-700 text-gray-300 hover:border-gray-500 border'
                          }`}
                        >
                          <div className="text-lg font-medium">{size}</div>
                          <div className="text-xs text-gray-400">docs</div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Sync Mode */}
                  <div>
                    <label className="text-sm text-gray-400 mb-2 block">Sync mode:</label>
                    <div className="space-y-2">
                      <label className="flex items-center space-x-2 cursor-pointer">
                        <input
                          type="radio"
                          value="new"
                          checked={syncMode === 'new'}
                          onChange={(e) => setSyncMode(e.target.value)}
                          className="text-blue-500"
                        />
                        <span className="text-sm text-gray-300">
                          New files only (recommended)
                        </span>
                      </label>
                      <label className="flex items-center space-x-2 cursor-pointer">
                        <input
                          type="radio"
                          value="force"
                          checked={syncMode === 'force'}
                          onChange={(e) => setSyncMode(e.target.value)}
                          className="text-blue-500"
                        />
                        <span className="text-sm text-gray-300">
                          Force reindex existing files
                        </span>
                      </label>
                    </div>
                  </div>

                  <div className="bg-gray-700 rounded p-3">
                    <p className="text-sm text-gray-300">
                      Smart sync will automatically find and index {selectedSyncSize} {syncMode === 'new' ? 'new' : ''} documents from your Drive.
                    </p>
                  </div>

                  <button
                    onClick={handleSmartSync}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded font-medium transition-colors"
                  >
                    Start Smart Sync ({selectedSyncSize} docs)
                  </button>
                </div>
              </div>
            ) : isSyncing ? (
              <div className="p-6">
                <div className="text-center mb-6">
                  <Loader2 className="w-8 h-8 text-blue-400 animate-spin mx-auto mb-3" />
                  <h3 className="text-lg font-medium text-white">Smart Syncing</h3>
                  <p className="text-sm text-gray-400">Finding and indexing {syncMode === 'new' ? 'new' : ''} documents...</p>
                </div>

                <div className="bg-gray-700 rounded p-3">
                  <p className="text-sm text-gray-300 text-center">
                    Please wait while we process your documents.
                  </p>
                </div>
              </div>
            ) : (
              <div className="p-6">
                <div className="text-center mb-6">
                  {syncResults?.success ? (
                    <CheckCircle className="w-8 h-8 text-green-400 mx-auto mb-3" />
                  ) : (
                    <X className="w-8 h-8 text-red-400 mx-auto mb-3" />
                  )}
                  <h3 className="text-lg font-medium text-white">
                    {syncResults?.success ? 'Sync Completed' : 'Sync Failed'}
                  </h3>
                </div>

                {syncResults?.success ? (
                  <div className="space-y-3">
                    <div className="bg-gray-700 rounded p-3">
                      <div className="grid grid-cols-2 gap-3 text-center text-sm">
                        <div>
                          <div className="text-lg font-medium text-green-400">{syncResults.embeddingCount}</div>
                          <div className="text-gray-400">Indexed</div>
                        </div>
                        <div>
                          <div className="text-lg font-medium text-blue-400">{syncResults.newFilesAvailable}</div>
                          <div className="text-gray-400">Available</div>
                        </div>
                        <div>
                          <div className="text-lg font-medium text-yellow-400">{syncResults.skippedCount}</div>
                          <div className="text-gray-400">Skipped</div>
                        </div>
                        <div>
                          <div className="text-lg font-medium text-purple-400">{syncResults.totalIndexedFiles}</div>
                          <div className="text-gray-400">Total</div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="text-xs text-gray-400 text-center">
                      Strategy: {syncResults.strategy === 'force_reindex' ? 'Force reindex' : 'New files only'}
                    </div>
                  </div>
                ) : (
                  <div className="bg-red-900/30 border border-red-700 rounded p-3">
                    <p className="text-sm text-red-300">
                      {syncResults?.error || 'Unknown error occurred'}
                    </p>
                  </div>
                )}

                <button
                  onClick={() => {
                    setShowSyncModal(false);
                    setSyncResults(null);
                  }}
                  className={`w-full py-2 rounded font-medium transition-colors mt-4 ${
                    syncResults?.success 
                      ? 'bg-green-600 hover:bg-green-700 text-white'
                      : 'bg-gray-600 hover:bg-gray-700 text-white'
                  }`}
                >
                  {syncResults?.success ? 'Done' : 'Close'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}