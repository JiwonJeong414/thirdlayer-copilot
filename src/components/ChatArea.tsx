import React, { useRef, useEffect, useState } from 'react';
import { User, MessageSquare, FileText, Cloud, HelpCircle, MoreHorizontal, Send, X } from 'lucide-react';
import { useChat } from '@/contexts/ChatContext';
import { useAuth } from '@/contexts/AuthContext';

// Drive Welcome CTA Component
const DriveWelcomeCTA = () => {
  const { driveConnection, user } = useAuth();
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
      currentFile: 'Starting sync...',
      embeddingsCreated: 0,
      skipped: 0,
      errors: 0,
      isComplete: false
    });

    try {
      const response = await fetch(`/api/drive/sync?limit=${limit}`, {
        method: 'POST',
      });
      
      if (!response.ok) {
        throw new Error('Sync failed');
      }
      
      const result = await response.json();
      
      setSyncProgress(prev => ({
        ...prev,
        processedFiles: result.processedCount || limit,
        embeddingsCreated: result.embeddingCount || 0,
        skipped: result.skippedCount || 0,
        errors: result.errorCount || 0,
        isComplete: true,
        currentFile: 'Sync completed!'
      }));
      
      setTimeout(() => {
        window.location.reload();
      }, 2000);
      
    } catch (error) {
      console.error('Sync failed:', error);
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

  // Simulate progress
  useEffect(() => {
    if (isSyncing && !syncProgress.isComplete) {
      const files = [
        'Project Documentation.docx',
        'Meeting Notes - Q4 Planning.txt',
        'Technical Specifications.md',
        'Budget Analysis 2024.xlsx',
        'User Research Findings.pdf',
        'API Integration Guide.docx'
      ];

      const interval = setInterval(() => {
        setSyncProgress(prev => {
          if (prev.processedFiles >= prev.totalFiles || prev.isComplete) {
            return prev;
          }
          
          const shouldIncrement = Math.random() > 0.3;
          if (!shouldIncrement) return prev;
          
          const newProcessed = Math.min(prev.processedFiles + 1, prev.totalFiles);
          const fileName = files[newProcessed % files.length] || `Document ${newProcessed}.txt`;
          
          return {
            ...prev,
            processedFiles: newProcessed,
            currentFile: `Processing: ${fileName}`,
            embeddingsCreated: prev.embeddingsCreated + (Math.random() > 0.2 ? 1 : 0),
            skipped: prev.skipped + (Math.random() > 0.9 ? 1 : 0)
          };
        });
      }, 800 + Math.random() * 1500);

      return () => clearInterval(interval);
    }
  }, [isSyncing, syncProgress.isComplete]);

  if (driveConnection.isConnected) {
    return null; // Don't show if already connected
  }

  return (
    <>
      <div className="text-center max-w-lg">
        <div className="w-16 h-16 bg-blue-600 bg-opacity-20 rounded-xl mx-auto mb-4 flex items-center justify-center">
          <Cloud className="w-8 h-8 text-blue-400" />
        </div>
        <h3 className="text-xl font-medium text-white mb-2">
          Connect Your Google Drive
        </h3>
        <p className="text-gray-400 mb-6 leading-relaxed">
          Supercharge your AI chat by connecting Google Drive. Search through your documents and get intelligent responses based on your files.
        </p>
        {!driveConnection.isConnected ? (
          <button
            onClick={handleConnect}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors mr-3"
          >
            Connect Google Drive
          </button>
        ) : (
          <button
            onClick={() => setShowSyncModal(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
          >
            Sync Your Documents
          </button>
        )}
      </div>

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
                  <div className="w-8 h-8 text-blue-400 animate-spin mx-auto mb-3">
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                  </div>
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
                      style={{ width: `${(syncProgress.processedFiles / syncProgress.totalFiles) * 100}%` }}
                    ></div>
                  </div>
                  <div className="text-center mt-1">
                    <span className="text-lg font-medium text-white">
                      {Math.round((syncProgress.processedFiles / syncProgress.totalFiles) * 100)}%
                    </span>
                  </div>
                </div>

                <div className="bg-gray-700 rounded p-3 mb-4">
                  <p className="text-sm text-gray-400">Current file:</p>
                  <p className="text-sm text-white font-mono break-all">{syncProgress.currentFile}</p>
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
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span className="font-medium">Sync completed!</span>
                    </div>
                    <button
                      onClick={() => setShowSyncModal(false)}
                      className="w-full bg-green-600 hover:bg-green-700 text-white py-2 rounded font-medium transition-colors"
                    >
                      Close
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default function ChatArea() {
  const [message, setMessage] = React.useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { user, driveConnection } = useAuth();
  const {
    messages,
    isLoading,
    selectedModel,
    driveSearchEnabled,
    currentChat,
    sendMessage,
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
              {driveConnection.isConnected ? (
                // Original empty state for connected users
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
              ) : (
                // Drive Welcome CTA for non-connected users
                <DriveWelcomeCTA />
              )}
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
  );
}