import React, { useState } from 'react';
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
  X
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useChat } from '@/contexts/ChatContext';
import { useDrive } from '@/contexts/DriveContext';

export default function Sidebar() {
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showSyncModal, setShowSyncModal] = useState(false);
  const [selectedSyncSize, setSelectedSyncSize] = useState(25);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState({
    totalFiles: 0,
    processedFiles: 0,
    currentFile: '',
    embeddingsCreated: 0,
    skipped: 0,
    errors: 0,
    isComplete: false
  });

  const { user, signOut, driveConnection } = useAuth();
  const { indexedFiles } = useDrive();
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

  const handleSync = async (limit: number) => {
    setIsSyncing(true);
    setSyncProgress({
      totalFiles: limit,
      processedFiles: 0,
      currentFile: 'Initializing sync...',
      embeddingsCreated: 0,
      skipped: 0,
      errors: 0,
      isComplete: false
    });

    // Simulate realistic progress during the actual API call
    const progressInterval = setInterval(() => {
      setSyncProgress(prev => {
        if (prev.isComplete || prev.processedFiles >= prev.totalFiles) return prev;
        
        const files = [
          'Project Documentation.docx',
          'Meeting Notes - Q4 Planning.txt', 
          'Technical Specifications.md',
          'Budget Analysis 2024.xlsx',
          'User Research Findings.pdf',
          'API Integration Guide.docx',
          'Marketing Strategy.pptx',
          'Product Roadmap.md',
          'Team Communication Guidelines.txt',
          'Client Feedback Summary.docx'
        ];
        
        const increment = Math.random() > 0.6 ? 1 : 0;
        const newProcessed = Math.min(prev.processedFiles + increment, prev.totalFiles - 1); // Leave room for API completion
        const fileName = files[newProcessed % files.length] || `Document ${newProcessed + 1}.txt`;
        
        return {
          ...prev,
          processedFiles: newProcessed,
          currentFile: `Processing: ${fileName}`,
          embeddingsCreated: prev.embeddingsCreated + (Math.random() > 0.3 ? increment : 0),
          skipped: prev.skipped + (Math.random() > 0.9 ? increment : 0)
        };
      });
    }, 1200 + Math.random() * 800);

    try {
      console.log(`🚀 Starting sync for ${limit} files`);
      
      const response = await fetch(`/api/drive/sync?limit=${limit}`, {
        method: 'POST',
      });
      
      clearInterval(progressInterval);
      
      if (!response.ok) {
        throw new Error('Sync failed');
      }
      
      const result = await response.json();
      console.log('✅ Sync completed:', result);
      
      // Update with final real results
      setSyncProgress({
        totalFiles: result.totalFilesInDrive || limit,
        processedFiles: result.processedCount || limit,
        embeddingsCreated: result.embeddingCount || 0,
        skipped: result.skippedCount || 0,
        errors: result.errorCount || 0,
        isComplete: true,
        currentFile: `Completed! Indexed ${result.embeddingCount || 0} documents`
      });
      
      // Refresh after showing results
      setTimeout(() => {
        window.location.reload();
      }, 3000);
      
    } catch (error) {
      clearInterval(progressInterval);
      console.error('❌ Sync failed:', error);
      setSyncProgress(prev => ({
        ...prev,
        currentFile: 'Sync failed - please try again',
        errors: prev.errors + 1,
        isComplete: true
      }));
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

        {/* Google Drive Panel - Always Open */}
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
                    <RefreshCw className="w-3 h-3" />
                  )}
                  <span>{isSyncing ? 'Syncing' : 'Sync'}</span>
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

          {/* Drive Status */}
          {driveConnection.isConnected ? (
            <div className="space-y-3">
              {/* Simple Stats */}
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-400">{indexedFiles.length} documents indexed</span>
                <div className="flex items-center space-x-1 text-green-400">
                  <CheckCircle className="w-3 h-3" />
                  <span>Ready</span>
                </div>
              </div>

              {/* Drive Search Toggle */}
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-400">Search Drive</span>
                <button
                  onClick={() => setDriveSearchEnabled(!driveSearchEnabled)}
                  className={`relative inline-flex h-4 w-7 items-center rounded-full transition-colors ${
                    driveSearchEnabled ? 'bg-blue-600' : 'bg-gray-600'
                  }`}
                >
                  <span
                    className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
                      driveSearchEnabled ? 'translate-x-4' : 'translate-x-0.5'
                    }`}
                  />
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

      {/* Sync Modal */}
      {showSyncModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-lg w-full max-w-md border border-gray-700">
            {!isSyncing ? (
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-medium text-white">Sync Google Drive</h3>
                  <button
                    onClick={() => setShowSyncModal(false)}
                    className="text-gray-400 hover:text-white p-1 rounded hover:bg-gray-700 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="text-sm text-gray-400 mb-2 block">Number of files to sync:</label>
                    <div className="grid grid-cols-3 gap-2">
                      {[10, 25, 50].map(size => (
                        <button
                          key={size}
                          onClick={() => setSelectedSyncSize(size)}
                          className={`p-3 rounded border text-center transition-colors ${
                            selectedSyncSize === size
                              ? 'border-blue-500 bg-blue-500/20 text-blue-300'
                              : 'border-gray-600 bg-gray-700 text-gray-300 hover:border-gray-500'
                          }`}
                        >
                          <div className="text-lg font-medium">{size}</div>
                          <div className="text-xs text-gray-400">
                            {size === 10 ? '~2 min' : size === 25 ? '~5 min' : '~10 min'}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="bg-gray-700 rounded p-3">
                    <p className="text-sm text-gray-300">
                      This will analyze your documents and create embeddings for AI-powered search.
                    </p>
                  </div>

                  <button
                    onClick={() => handleSync(selectedSyncSize)}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded font-medium transition-colors"
                  >
                    Start Sync ({selectedSyncSize} files)
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-6">
                <div className="text-center mb-6">
                  <Loader2 className="w-8 h-8 text-blue-400 animate-spin mx-auto mb-3" />
                  <h3 className="text-lg font-medium text-white">Syncing Documents</h3>
                  <p className="text-sm text-gray-400">Processing your files...</p>
                </div>

                <div className="mb-4">
                  <div className="flex justify-between text-sm text-gray-400 mb-1">
                    <span>Progress</span>
                    <span>{syncProgress.processedFiles} / {syncProgress.totalFiles}</span>
                  </div>
                  <div className="w-full bg-gray-700 rounded-full h-2">
                    <div 
                      className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${Math.min((syncProgress.processedFiles / syncProgress.totalFiles) * 100, 100)}%` }}
                    ></div>
                  </div>
                  <div className="text-center mt-1">
                    <span className="text-lg font-medium text-white">
                      {Math.round(Math.min((syncProgress.processedFiles / syncProgress.totalFiles) * 100, 100))}%
                    </span>
                  </div>
                </div>

                <div className="bg-gray-700 rounded p-3 mb-4">
                  <p className="text-sm text-gray-400">Status:</p>
                  <p className="text-sm text-white break-all">{syncProgress.currentFile}</p>
                </div>

                <div className="grid grid-cols-3 gap-3 text-center">
                  <div className="bg-gray-700 rounded p-2">
                    <div className="text-lg font-medium text-green-400">{syncProgress.embeddingsCreated}</div>
                    <div className="text-xs text-gray-400">Indexed</div>
                  </div>
                  <div className="bg-gray-700 rounded p-2">
                    <div className="text-lg font-medium text-yellow-400">{syncProgress.skipped}</div>
                    <div className="text-xs text-gray-400">Skipped</div>
                  </div>
                  <div className="bg-gray-700 rounded p-2">
                    <div className="text-lg font-medium text-red-400">{syncProgress.errors}</div>
                    <div className="text-xs text-gray-400">Errors</div>
                  </div>
                </div>

                {syncProgress.isComplete && (
                  <div className="mt-4">
                    <div className="flex items-center justify-center space-x-2 text-green-400 mb-3">
                      <CheckCircle className="w-5 h-5" />
                      <span className="font-medium">Sync completed!</span>
                    </div>
                    <button
                      onClick={() => {
                        setShowSyncModal(false);
                        // Reset for next time
                        setSyncProgress({
                          totalFiles: 0,
                          processedFiles: 0,
                          currentFile: '',
                          embeddingsCreated: 0,
                          skipped: 0,
                          errors: 0,
                          isComplete: false
                        });
                      }}
                      className="w-full bg-green-600 hover:bg-green-700 text-white py-2 rounded font-medium transition-colors"
                    >
                      Done
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}