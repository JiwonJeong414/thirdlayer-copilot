// src/components/page.tsx
'use client';

import React, { useState, useEffect, useRef } from 'react';
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
import { useChat } from '@/contexts/ChatContext';
import { Message } from '@/types/chat';

export default function MainPage() {
  const [message, setMessage] = useState('');
  const [isConnected, setIsConnected] = useState(true); // Set to true for Ollama chat
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const {
    messages,
    isLoading,
    selectedModel,
    availableModels,
    setSelectedModel,
    sendMessage,
    clearMessages,
    fetchModels,
  } = useChat();

  // Fetch available models on component mount
  useEffect(() => {
    fetchModels();
  }, []);

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

  const connectGoogleDrive = () => {
    setIsConnected(true);
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString();
  };

  const examplePrompts = [
    'Explain quantum computing in simple terms',
    'Write a Python function to reverse a string',
    'What are the benefits of renewable energy?',
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
                <span className="text-white font-bold text-xs">OL</span>
              </div>
              <span className="text-white font-medium">Ollama Chat</span>
            </div>
            <div className="flex items-center space-x-2">
              <button 
                onClick={clearMessages}
                className="p-1 hover:bg-gray-700 rounded text-gray-400 hover:text-white transition-colors"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
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

          {/* Connection Status */}
          <div className="flex items-center space-x-2 text-green-400 bg-green-900 bg-opacity-30 p-2 rounded-lg">
            <div className="w-2 h-2 bg-green-400 rounded-full"></div>
            <span className="text-sm">Ollama Connected</span>
          </div>
        </div>

        {/* Chat Stats */}
        <div className="flex-1 p-4">
          <div className="text-center text-gray-400">
            <p className="text-sm mb-2">Messages: {messages.length}</p>
            <p className="text-sm">Model: {selectedModel}</p>
          </div>
        </div>

        {/* Bottom Section */}
        <div className="p-4 border-t border-gray-700">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-gray-400">SYSTEM STATUS:</span>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-1">
                <Database className="w-3 h-3 text-gray-400" />
                <span className="text-xs text-gray-400">Connected</span>
              </div>
              <div className="flex items-center space-x-1">
                <Activity className="w-3 h-3 text-green-400" />
                <span className="text-xs text-green-400">Active</span>
              </div>
            </div>
          </div>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="w-6 h-6 bg-gray-600 rounded-full flex items-center justify-center">
                <User className="w-3 h-3 text-gray-300" />
              </div>
              <span className="text-sm text-gray-300">User</span>
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
                Ollama Chat
              </span>
              <div className="flex items-center space-x-2 text-sm text-gray-400">
                <span>Model:</span>
                <span className="bg-gray-700 px-2 py-1 rounded text-xs">
                  {selectedModel}
                </span>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <button 
                onClick={fetchModels}
                className="p-2 hover:bg-gray-700 rounded text-gray-400 hover:text-white transition-colors"
              >
                <Search className="w-4 h-4" />
              </button>
              <button className="p-2 hover:bg-gray-700 rounded text-gray-400 hover:text-white transition-colors">
                <HelpCircle className="w-4 h-4" />
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
                    Ask me anything, or try one of these examples:
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
            ) : (
              <div className="space-y-6">
                {messages.map((msg, idx) => (
                  <div key={idx} className="flex space-x-4">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                      msg.role === 'user' 
                        ? 'bg-blue-600' 
                        : 'bg-green-600'
                    }`}>
                      {msg.role === 'user' ? (
                        <User className="w-4 h-4 text-white" />
                      ) : (
                        <MessageSquare className="w-4 h-4 text-white" />
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-1">
                        <span className="text-sm font-medium text-white">
                          {msg.role === 'user' ? 'You' : selectedModel}
                        </span>
                        {msg.timestamp && (
                          <span className="text-xs text-gray-400">
                            {formatTimestamp(msg.timestamp)}
                          </span>
                        )}
                      </div>
                      <div className="text-gray-200 whitespace-pre-wrap">
                        {msg.content}
                      </div>
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
                        <span className="text-gray-400">Thinking...</span>
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
                  placeholder="Type your message and press Enter to send..."
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
    </div>
  );
};