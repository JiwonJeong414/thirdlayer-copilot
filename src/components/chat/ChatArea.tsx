// ChatArea component - Main chat interface
import React, { useRef, useEffect } from 'react';
import { User, MessageSquare, FileText, Cloud, HelpCircle, MoreHorizontal, Send } from 'lucide-react';
import { useChat } from '@/contexts/ChatContext';
import { useAuth } from '@/contexts/AuthContext';
import { useDrive } from '@/contexts/DriveContext';

export default function ChatArea() {
  // State and hooks
  const [message, setMessage] = React.useState(''); // Current message input
  const messagesEndRef = useRef<HTMLDivElement>(null); // Ref for auto-scrolling
  const { user, driveConnection } = useAuth();
  const { indexedFiles } = useDrive();
  const {
    messages,
    isLoading,
    selectedModel,
    driveSearchEnabled,
    currentChat,
    sendMessage,
  } = useChat();

  // Auto-scroll to bottom when new messages are added
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Handle message submission and clear input after sending
  // This is IMPORTANT
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim() && !isLoading) {
      await sendMessage(message.trim());
      setMessage('');
    }
  };

  // Format message timestamps for display
  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString();
  };

  // Example prompts shown to new users
  const examplePrompts = [
    'Explain quantum computing in simple terms',
    'Write a Python function to reverse a string',
    'What are the benefits of renewable energy?',
    driveConnection.isConnected ? 'Search my documents for project updates' : null,
  ].filter(Boolean);

  return (
    <div className="flex-1 flex flex-col h-screen">
      {/* Top Bar - Contains chat title, model info, and control buttons */}
      <div className="bg-gray-800 border-b border-gray-700 p-4 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <span className="text-lg font-medium text-white">
              {currentChat ? currentChat.summary : 'TripleClean Chat'}
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

      {/* Chat Messages Area - Displays message history and example prompts */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          // Empty state with example prompts
          <div className="h-full flex items-center justify-center">
            <div className="text-center space-y-4">
              <MessageSquare className="w-12 h-12 text-gray-600 mx-auto" />
              <h3 className="text-xl font-medium text-gray-200">Start a new conversation</h3>
              <p className="text-gray-400 max-w-md">
                Ask me anything or try one of these example prompts:
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-w-2xl">
                {examplePrompts.map((prompt, index) => (
                  <button
                    key={index}
                    onClick={() => sendMessage(prompt!)}
                    className="p-3 text-left bg-gray-800 rounded-lg hover:bg-gray-700 transition-colors"
                  >
                    <p className="text-gray-200">{prompt}</p>
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          // Message list
          <div className="space-y-6">
            {messages.map((msg, idx) => (
              <div key={idx} className="flex space-x-4">
                {/* User/AI avatar */}
                <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                  msg.sender === 'user' 
                    ? 'bg-blue-600' 
                    : 'bg-gradient-to-r from-purple-500 to-green-500'
                }`}>
                  {msg.sender === 'user' ? (
                    <User className="w-4 h-4 text-white" />
                  ) : (
                    <span className="text-white font-bold text-xs">TL</span>
                  )}
                </div>
                
                {/* Message content */}
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-1">
                    <span className="text-sm font-medium text-white">
                      {msg.sender === 'user' ? 'You' : 'TripleClean AI'}
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
                </div>
              </div>
            ))}
            
            {/* Loading indicator */}
            {isLoading && (
              <div className="flex space-x-4">
                <div className="w-8 h-8 rounded-full bg-gradient-to-r from-purple-500 to-green-500 flex items-center justify-center flex-shrink-0">
                  <span className="text-white font-bold text-xs">TL</span>
                </div>
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-1">
                    <span className="text-sm font-medium text-white">TripleClean AI</span>
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

      {/* Input Area - Message input form with send button */}
      <div className="border-t border-gray-700 p-4 bg-gray-800">
        <form onSubmit={handleSubmit} className="flex space-x-4">
          <input
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Type your message..."
            className="flex-1 bg-gray-700 text-white rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={isLoading || !message.trim()}
            className="bg-blue-600 text-white rounded-lg px-4 py-2 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send className="w-5 h-5" />
          </button>
        </form>
      </div>
    </div>
  );
}