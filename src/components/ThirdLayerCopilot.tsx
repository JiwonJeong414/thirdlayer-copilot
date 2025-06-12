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
} from 'lucide-react';

const ThirdLayerCopilot = () => {
  const [message, setMessage] = useState('');
  const [isConnected, setIsConnected] = useState(false);

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

  const examplePrompts = [
    'Find my Q4 budget spreadsheet',
    'Search for meeting notes about the product launch',
    'What are the key points from my project documents?',
  ];

  return (
    <div className="min-h-screen flex bg-muted">
      {/* Sidebar */}
      <div className="w-72 bg-white border-r border-muted shadow-md flex flex-col">
        <div className="p-5 border-b border-muted">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center">
              <span className="text-white font-bold text-lg">TL</span>
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">ThirdLayer</h1>
              <p className="text-muted-foreground text-sm">AI-Native Copilot</p>
            </div>
          </div>
        </div>

        <div className="p-5 border-b border-muted">
          {!isConnected ? (
            <button
              onClick={connectGoogleDrive}
              className="w-full bg-primary text-white px-4 py-3 rounded-xl flex items-center justify-center space-x-2 transition-all hover:bg-primary/90"
            >
              <span className="font-medium">Connect Google Drive</span>
            </button>
          ) : (
            <div className="flex items-center space-x-3 text-green-600 bg-green-50 p-3 rounded-xl">
              <div className="w-2 h-2 bg-green-600 rounded-full"></div>
              <span className="text-sm font-medium">Connected</span>
            </div>
          )}
        </div>

        <div className="flex-1 p-5 overflow-y-auto">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4">Recent</h3>
          <div className="space-y-2">
            {['Q1 Budget Analysis', 'Project Documentation', 'Meeting Notes Search'].map((title, i) => (
              <div key={i} className="p-3 rounded-xl hover:bg-muted/30 cursor-pointer transition-colors">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-muted rounded-lg flex items-center justify-center text-primary">
                    <FileText className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{title}</p>
                    <p className="text-xs text-muted-foreground">{i + 1} day(s) ago</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="p-5 border-t border-muted">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-muted rounded-full flex items-center justify-center">
                <User className="w-5 h-5 text-muted-foreground" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">Jiwon Jeong</p>
                <p className="text-xs text-muted-foreground">Free Plan</p>
              </div>
            </div>
            <div className="flex space-x-2">
              <Settings className="w-4 h-4 text-muted-foreground cursor-pointer" />
              <LogOut className="w-4 h-4 text-muted-foreground cursor-pointer" />
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        <div className="bg-white border-b border-muted p-6">
          <div className="flex items-center justify-between max-w-4xl mx-auto">
            <div>
              <h2 className="text-3xl font-bold text-gray-900">Hello, Jiwon</h2>
              <p className="text-muted-foreground mt-1">How can I help you today?</p>
            </div>
            <div className="flex items-center space-x-2">
              <Search className="w-5 h-5 text-muted-foreground cursor-pointer" />
              <HelpCircle className="w-5 h-5 text-muted-foreground cursor-pointer" />
              <MoreHorizontal className="w-5 h-5 text-muted-foreground cursor-pointer" />
            </div>
          </div>
        </div>

        <div className="flex-1 flex flex-col max-w-4xl mx-auto w-full px-5 py-8">
          {!isConnected ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="bg-white/80 backdrop-blur-sm p-8 rounded-2xl shadow-lg text-center max-w-md">
                <div className="w-20 h-20 bg-primary/10 rounded-2xl mx-auto mb-6 flex items-center justify-center text-primary">
                  <MessageSquare className="w-10 h-10" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">Connect Your Google Drive</h3>
                <p className="text-muted-foreground mb-6">
                  Connect your Google Drive to start searching and summarizing your documents.
                </p>
                <button
                  onClick={connectGoogleDrive}
                  className="bg-primary text-white px-6 py-3 rounded-xl font-medium shadow-md hover:bg-primary/90 w-full"
                >
                  Connect Google Drive
                </button>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center max-w-md">
                <div className="w-20 h-20 bg-primary/10 rounded-2xl mx-auto mb-6 flex items-center justify-center text-primary">
                  <MessageSquare className="w-10 h-10" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">Ready to Help</h3>
                <p className="text-muted-foreground mb-6">
                  Ask me anything about your Google Drive. Or try a quick start:
                </p>
                <div className="grid gap-3">
                  {examplePrompts.map((text, idx) => (
                    <button
                      key={idx}
                      className="px-5 py-3 border border-muted bg-white hover:bg-gray-50 rounded-xl text-sm text-gray-700 shadow-sm text-left transition"
                    >
                      “{text}”
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Input Area */}
          <div className="mt-8 bg-white p-3 rounded-2xl shadow-md border border-muted">
            <form onSubmit={handleSubmit} className="flex items-end space-x-2">
              <input
                type="text"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder={isConnected ? 'Ask me anything about your Google Drive...' : 'Connect Google Drive to get started'}
                disabled={!isConnected}
                className="flex-1 px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={!message.trim() || !isConnected}
                className={`p-3 rounded-xl transition-colors ${
                  message.trim() && isConnected
                    ? 'bg-primary text-white hover:bg-primary/90'
                    : 'bg-muted text-muted-foreground'
                }`}
              >
                <Send className="w-5 h-5" />
              </button>
            </form>
            <p className="text-xs text-muted-foreground mt-3 text-center">
              ThirdLayer may make mistakes. Double check facts.{' '}
              <a href="#" className="text-primary hover:underline">View source code</a>.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ThirdLayerCopilot;
