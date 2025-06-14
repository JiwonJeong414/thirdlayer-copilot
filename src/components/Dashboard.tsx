// src/components/Dashboard.tsx - Updated with separate links for AI features
'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { 
  MessageSquare, 
  Sparkles, 
  Brain, 
  ArrowRight,
  Cloud,
  User,
  LogOut,
  Bell,
  Search,
  Plus,
  BarChart3,
  Settings,
  TrendingUp,
  RefreshCw,
  X,
  Loader2,
  CheckCircle
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useDrive } from '@/contexts/DriveContext';

const Dashboard = () => {
  const { user, signOut, driveConnection } = useAuth();
  const { indexedFiles } = useDrive();
  const router = useRouter();
  const [hoveredCard, setHoveredCard] = useState<string | null>(null);
  
  // Sync modal states
  const [showSyncModal, setShowSyncModal] = useState(false);
  const [selectedSyncSize, setSelectedSyncSize] = useState(25);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncResults, setSyncResults] = useState<any>(null);

  // Animated Drive logo layers
  const DriveLogoAnimation = () => (
    <motion.div 
      className="relative w-40 h-40 mx-auto mb-8"
      initial={{ scale: 0, rotate: -180 }}
      animate={{ scale: 1, rotate: 0 }}
      transition={{ duration: 1.2, ease: "easeOut" }}
    >
      {/* Blue Layer (Chat) */}
      <motion.div
        className="absolute inset-0 bg-gradient-to-br from-blue-500 to-blue-600 rounded-3xl shadow-2xl"
        initial={{ rotate: -45, opacity: 0, scale: 0.8 }}
        animate={{ rotate: 0, opacity: 1, scale: 1 }}
        transition={{ delay: 0.3, duration: 1, ease: "easeOut" }}
        whileHover={{ 
          scale: 1.05,
          rotate: 2,
          boxShadow: "0 25px 50px -12px rgba(59, 130, 246, 0.5)"
        }}
      />
      
      {/* Yellow Layer (Cleanup) */}
      <motion.div
        className="absolute inset-3 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-2xl shadow-xl"
        initial={{ rotate: 45, opacity: 0, scale: 0.8 }}
        animate={{ rotate: 0, opacity: 1, scale: 1 }}
        transition={{ delay: 0.6, duration: 1, ease: "easeOut" }}
        whileHover={{ 
          scale: 1.05,
          rotate: -2,
          boxShadow: "0 25px 50px -12px rgba(251, 191, 36, 0.5)"
        }}
      />
      
      {/* Green Layer (Organization) */}
      <motion.div
        className="absolute inset-6 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl shadow-lg"
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.9, duration: 1, ease: "easeOut" }}
        whileHover={{ 
          scale: 1.1,
          boxShadow: "0 25px 50px -12px rgba(34, 197, 94, 0.5)"
        }}
      />
      
      {/* Floating elements */}
      <motion.div
        className="absolute -top-4 -right-4 w-8 h-8 bg-purple-500 rounded-full"
        animate={{ 
          y: [0, -10, 0],
          scale: [1, 1.1, 1]
        }}
        transition={{ duration: 3, repeat: Infinity }}
      />
      <motion.div
        className="absolute -bottom-4 -left-4 w-6 h-6 bg-pink-500 rounded-full"
        animate={{ 
          y: [0, 10, 0],
          scale: [1, 1.2, 1]
        }}
        transition={{ duration: 2.5, repeat: Infinity, delay: 1 }}
      />
    </motion.div>
  );

  // Updated feature definitions with separate pages
  const features = [
    {
      id: 'chat',
      title: 'AI Chat',
      subtitle: 'Intelligent Conversations',
      description: 'Chat with your documents using advanced AI. Ask questions, get insights, and explore your Google Drive content naturally.',
      icon: MessageSquare,
      gradient: 'from-blue-500 via-blue-600 to-cyan-600',
      darkBgGradient: 'from-blue-900/20 to-cyan-900/20',
      borderColor: 'border-blue-200 hover:border-blue-300 dark:border-blue-800 dark:hover:border-blue-700',
      href: '/?chat=true',
      stats: {
        primary: driveConnection.isConnected ? indexedFiles.length : 0,
        primaryLabel: 'Documents Ready',
        secondary: '95%',
        secondaryLabel: 'Accuracy'
      }
    },
    {
      id: 'cleanup',
      title: 'AI Cleanup',
      subtitle: 'Smart File Cleanup',
      description: 'Automatically detect duplicates, remove junk files, and optimize your storage with intelligent AI recommendations.',
      icon: Sparkles,
      gradient: 'from-purple-500 via-pink-500 to-red-500',
      darkBgGradient: 'from-purple-900/20 to-pink-900/20',
      borderColor: 'border-purple-200 hover:border-purple-300 dark:border-purple-800 dark:hover:border-purple-700',
      href: '/cleanup', // Separate cleanup page
      stats: {
        primary: '2.3GB',
        primaryLabel: 'Space Saved',
        secondary: '156',
        secondaryLabel: 'Files Cleaned'
      }
    },
    {
      id: 'organize',
      title: 'AI Organization',
      subtitle: 'Smart Folder Management',
      description: 'Let AI create the perfect folder hierarchy and automatically categorize your files for maximum productivity.',
      icon: Brain,
      gradient: 'from-emerald-500 via-green-500 to-teal-600',
      darkBgGradient: 'from-emerald-900/20 to-green-900/20',
      borderColor: 'border-emerald-200 hover:border-emerald-300 dark:border-emerald-800 dark:hover:border-emerald-700',
      href: '/organize', // Separate organization page
      stats: {
        primary: '12',
        primaryLabel: 'Smart Folders',
        secondary: '89%',
        secondaryLabel: 'Organization Score'
      }
    }
  ];

  // Quick actions with updated links
  const quickActions = [
    { icon: Plus, label: 'New Chat', action: () => router.push('/?chat=true') },
    { icon: Search, label: 'Search Files', action: () => router.push('/?search=true') },
    { icon: Sparkles, label: 'AI Cleanup', action: () => router.push('/cleanup') },
    { icon: Brain, label: 'AI Organize', action: () => router.push('/organize') },
    { icon: RefreshCw, label: 'Sync Drive', action: () => setShowSyncModal(true) },
    { icon: Settings, label: 'Settings', action: () => {} },
  ];

  // Handle sync functionality
  const handleSync = async (limit: number) => {
    setIsSyncing(true);
    setSyncResults(null);

    try {
      const response = await fetch(`/api/drive/sync?limit=${limit}`, {
        method: 'POST',
      });
      
      if (!response.ok) {
        throw new Error('Sync failed');
      }
      
      const result = await response.json();
      setSyncResults(result);
      
      // Refresh the page after a short delay
      setTimeout(() => {
        window.location.reload();
      }, 2000);
      
    } catch (error) {
      console.error('Sync failed:', error);
      setSyncResults({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      {/* Header */}
      <header className="border-b border-gray-200 dark:border-gray-800 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <motion.div 
                className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center"
                whileHover={{ scale: 1.05, rotate: 5 }}
              >
                <span className="text-white font-bold text-xs">TL</span>
              </motion.div>
              <div>
                <h1 className="text-xl font-bold text-gray-900 dark:text-white">ThirdLayer</h1>
                <p className="text-sm text-gray-500 dark:text-gray-400">Your intelligent workspace</p>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <motion.button
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors relative"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Bell className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full" />
              </motion.button>

              <div className="flex items-center space-x-3 pl-4 border-l border-gray-200 dark:border-gray-700">
                {user?.photoURL ? (
                  <motion.img
                    src={user.photoURL}
                    alt="Profile"
                    className="w-8 h-8 rounded-full ring-2 ring-blue-500"
                    whileHover={{ scale: 1.1 }}
                  />
                ) : (
                  <div className="w-8 h-8 bg-gray-300 dark:bg-gray-600 rounded-full flex items-center justify-center">
                    <User className="w-4 h-4 text-gray-600 dark:text-gray-300" />
                  </div>
                )}
                <div className="hidden sm:block">
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    {user?.displayName || 'User'}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {user?.email}
                  </p>
                </div>
                <motion.button
                  onClick={signOut}
                  className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <LogOut className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                </motion.button>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-12">
        {/* Welcome Section */}
        <motion.div 
          className="text-center mb-16"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          <DriveLogoAnimation />
          
          <motion.h1 
            className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-4"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.2, duration: 0.8 }}
          >
            Welcome back, <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">{user?.displayName?.split(' ')[0] || 'User'}</span>
          </motion.h1>
          
          <motion.p 
            className="text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.4, duration: 0.8 }}
          >
            Your AI-powered Google Drive workspace is ready. Choose how you want to supercharge your productivity today.
          </motion.p>
        </motion.div>

        {/* Drive Connection Status */}
        <motion.div 
          className="mb-12"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 1.6, duration: 0.8 }}
        >
          <div className={`max-w-md mx-auto p-4 rounded-2xl border-2 ${
            driveConnection.isConnected 
              ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800' 
              : 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800'
          }`}>
            <div className="flex items-center space-x-3">
              <div className={`w-3 h-3 rounded-full ${
                driveConnection.isConnected ? 'bg-green-500' : 'bg-yellow-500'
              }`} />
              <span className={`font-medium ${
                driveConnection.isConnected 
                  ? 'text-green-800 dark:text-green-300' 
                  : 'text-yellow-800 dark:text-yellow-300'
              }`}>
                {driveConnection.isConnected 
                  ? `Google Drive Connected • ${indexedFiles.length} documents ready`
                  : 'Connect Google Drive to unlock all features'
                }
              </span>
            </div>
          </div>
        </motion.div>

        {/* Feature Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <motion.div
                key={feature.id}
                className={`group relative overflow-hidden rounded-3xl border-2 ${feature.borderColor} bg-gradient-to-br ${feature.darkBgGradient} backdrop-blur-sm cursor-pointer transition-all duration-500`}
                initial={{ opacity: 0, y: 50 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1.8 + index * 0.2, duration: 0.8 }}
                whileHover={{ 
                  y: -10, 
                  scale: 1.02,
                  boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.15)"
                }}
                onHoverStart={() => setHoveredCard(feature.id)}
                onHoverEnd={() => setHoveredCard(null)}
                onClick={() => router.push(feature.href)}
              >
                {/* Background gradient overlay */}
                <motion.div 
                  className={`absolute inset-0 bg-gradient-to-br ${feature.gradient} opacity-0 group-hover:opacity-10 transition-opacity duration-500`}
                  initial={false}
                />

                <div className="relative p-8">
                  {/* Icon */}
                  <motion.div 
                    className={`mb-6 w-16 h-16 bg-gradient-to-r ${feature.gradient} rounded-2xl flex items-center justify-center shadow-lg`}
                    whileHover={{ rotate: 10, scale: 1.1 }}
                    transition={{ duration: 0.3 }}
                  >
                    <Icon className="w-8 h-8 text-white" />
                  </motion.div>

                  {/* Content */}
                  <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                    {feature.title}
                  </h3>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-4">
                    {feature.subtitle}
                  </p>
                  <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-6">
                    {feature.description}
                  </p>

                  {/* Stats */}
                  <div className="grid grid-cols-2 gap-4 mb-6">
                    <div>
                      <div className="text-2xl font-bold text-gray-900 dark:text-white">
                        {feature.stats.primary}
                      </div>
                      <div className="text-xs text-gray-600 dark:text-gray-400">
                        {feature.stats.primaryLabel}
                      </div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-gray-900 dark:text-white">
                        {feature.stats.secondary}
                      </div>
                      <div className="text-xs text-gray-600 dark:text-gray-400">
                        {feature.stats.secondaryLabel}
                      </div>
                    </div>
                  </div>

                  {/* CTA */}
                  <motion.div 
                    className="flex items-center space-x-2 text-gray-600 dark:text-gray-400 group-hover:text-gray-900 dark:group-hover:text-white transition-colors"
                    animate={{ x: hoveredCard === feature.id ? 5 : 0 }}
                  >
                    <span className="font-medium">Get Started</span>
                    <ArrowRight className="w-4 h-4" />
                  </motion.div>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Quick Actions - Updated Grid */}
        <motion.div 
          className="bg-white dark:bg-gray-800 rounded-3xl border border-gray-200 dark:border-gray-700 p-8 mb-8"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 2.6, duration: 0.8 }}
        >
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Quick Actions</h2>
          <div className="grid grid-cols-3 md:grid-cols-6 gap-4">
            {quickActions.map((action, index) => {
              const Icon = action.icon;
              return (
                <motion.button
                  key={action.label}
                  onClick={action.action}
                  className="p-4 rounded-2xl border border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 transition-all duration-300 group"
                  whileHover={{ scale: 1.05, y: -2 }}
                  whileTap={{ scale: 0.95 }}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 2.8 + index * 0.1, duration: 0.5 }}
                >
                  <Icon className="w-6 h-6 text-gray-600 dark:text-gray-400 group-hover:text-gray-900 dark:group-hover:text-white mb-2 mx-auto" />
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-white">
                    {action.label}
                  </p>
                </motion.button>
              );
            })}
          </div>
        </motion.div>

        {/* Recent Activity */}
        <motion.div 
          className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/10 dark:to-purple-900/10 rounded-3xl border border-blue-200 dark:border-blue-800 p-8"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 3, duration: 0.8 }}
        >
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Recent Activity</h2>
            <TrendingUp className="w-6 h-6 text-blue-600 dark:text-blue-400" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-600 dark:text-blue-400 mb-2">24</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Files Processed Today</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-purple-600 dark:text-purple-400 mb-2">1.2GB</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Storage Optimized</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-green-600 dark:text-green-400 mb-2">8</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Smart Folders Created</div>
            </div>
          </div>
        </motion.div>
      </main>

      {/* Sync Modal */}
      {showSyncModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg w-full max-w-md border border-gray-200 dark:border-gray-700">
            {!isSyncing && !syncResults ? (
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white">Smart Sync Drive</h3>
                  <button
                    onClick={() => setShowSyncModal(false)}
                    className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="text-sm text-gray-600 dark:text-gray-400 mb-2 block">New documents to index:</label>
                    <div className="grid grid-cols-4 gap-2">
                      {[5, 10, 25, 50].map((size) => (
                        <button
                          key={size}
                          onClick={() => setSelectedSyncSize(size)}
                          className={`p-2 rounded text-center transition-colors ${
                            selectedSyncSize === size
                              ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border"
                              : "border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:border-gray-400 dark:hover:border-gray-500 border"
                          }`}
                        >
                          <div className="text-lg font-medium">{size}</div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">docs</div>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="bg-gray-50 dark:bg-gray-700 rounded p-3">
                    <p className="text-sm text-gray-700 dark:text-gray-300">
                      Smart sync will find and index {selectedSyncSize} new documents from your Drive for AI search.
                    </p>
                  </div>

                  <button
                    onClick={() => handleSync(selectedSyncSize)}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded font-medium transition-colors"
                  >
                    Start Smart Sync ({selectedSyncSize} docs)
                  </button>
                </div>
              </div>
            ) : isSyncing ? (
              <div className="p-6">
                <div className="text-center mb-6">
                  <Loader2 className="w-8 h-8 text-blue-600 dark:text-blue-400 animate-spin mx-auto mb-3" />
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white">Smart Syncing</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Finding and indexing documents...</p>
                </div>

                <div className="bg-gray-50 dark:bg-gray-700 rounded p-3">
                  <p className="text-sm text-gray-700 dark:text-gray-300 text-center">
                    Please wait while we process your documents.
                  </p>
                </div>
              </div>
            ) : (
              <div className="p-6">
                <div className="text-center mb-6">
                  {syncResults?.success ? (
                    <CheckCircle className="w-8 h-8 text-green-600 dark:text-green-400 mx-auto mb-3" />
                  ) : (
                    <X className="w-8 h-8 text-red-600 dark:text-red-400 mx-auto mb-3" />
                  )}
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                    {syncResults?.success ? "Sync Completed" : "Sync Failed"}
                  </h3>
                </div>

                {syncResults?.success ? (
                  <div className="space-y-3">
                    <div className="bg-gray-50 dark:bg-gray-700 rounded p-3">
                      <div className="grid grid-cols-2 gap-3 text-center text-sm">
                        <div>
                          <div className="text-lg font-medium text-green-600 dark:text-green-400">
                            {syncResults.embeddingCount || 0}
                          </div>
                          <div className="text-gray-600 dark:text-gray-400">Indexed</div>
                        </div>
                        <div>
                          <div className="text-lg font-medium text-blue-600 dark:text-blue-400">
                            {syncResults.totalIndexedFiles || 0}
                          </div>
                          <div className="text-gray-600 dark:text-gray-400">Total</div>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded p-3">
                    <p className="text-sm text-red-700 dark:text-red-300">
                      {syncResults?.error || "Unknown error occurred"}
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
                      ? "bg-green-600 hover:bg-green-700 text-white"
                      : "bg-gray-600 hover:bg-gray-700 text-white"
                  }`}
                >
                  {syncResults?.success ? "Done" : "Close"}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;