// src/app/cleanup/page.tsx - Enhanced with pink theme and better UI
'use client';

import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import Protected from '@/components/Protected';
import Spinner from '@/components/Spinner';
import { SwipeToCleanUI } from '@/components/cleaner';
import { Sparkles, ArrowLeft, Heart, Zap } from 'lucide-react';
import Link from 'next/link';
import { motion } from 'framer-motion';

export default function CleanupPage() {
  const { user, loading, driveConnection } = useAuth();

  if (loading) {
    return (
      <div className="flex h-screen w-screen justify-center items-center bg-gradient-to-br from-pink-900 via-purple-900 to-gray-900">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="text-center"
        >
          <div className="w-16 h-16 bg-gradient-to-r from-pink-500 to-purple-500 rounded-full mx-auto mb-4 flex items-center justify-center">
            <Sparkles className="w-8 h-8 text-white animate-pulse" />
          </div>
          <Spinner width="8" height="8" />
          <p className="text-pink-200 mt-4">Loading AI Cleanup...</p>
        </motion.div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-900 via-purple-900 to-gray-900 flex items-center justify-center">
        <motion.div 
          className="text-center max-w-md"
          initial={{ y: 50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.8 }}
        >
          <div className="w-20 h-20 bg-gradient-to-r from-pink-500 to-purple-500 rounded-2xl mx-auto mb-6 flex items-center justify-center">
            <Sparkles className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-4">AI Drive Cleanup</h1>
          <p className="text-pink-200 mb-6">
            Please sign in to access the AI-powered Drive cleanup experience.
          </p>
          <Link 
            href="/"
            className="inline-flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 text-white rounded-xl font-medium transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Go to Dashboard</span>
          </Link>
        </motion.div>
      </div>
    );
  }

  if (!driveConnection.isConnected) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-900 via-purple-900 to-gray-900 flex items-center justify-center relative overflow-hidden">
        {/* Animated background elements */}
        <div className="absolute inset-0">
          <motion.div 
            className="absolute top-20 left-20 w-32 h-32 bg-pink-500/20 rounded-full blur-xl"
            animate={{ 
              y: [0, -20, 0],
              scale: [1, 1.1, 1]
            }}
            transition={{ duration: 4, repeat: Infinity }}
          />
          <motion.div 
            className="absolute bottom-20 right-20 w-40 h-40 bg-purple-500/20 rounded-full blur-xl"
            animate={{ 
              y: [0, 20, 0],
              scale: [1, 1.2, 1]
            }}
            transition={{ duration: 5, repeat: Infinity, delay: 1 }}
          />
          <motion.div 
            className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-60 h-60 bg-pink-400/10 rounded-full blur-3xl"
            animate={{ 
              rotate: [0, 360],
              scale: [1, 1.1, 1]
            }}
            transition={{ duration: 20, repeat: Infinity }}
          />
        </div>

        <motion.div 
          className="text-center max-w-lg relative z-10"
          initial={{ y: 50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.8 }}
        >
          {/* Enhanced logo with layers */}
          <motion.div 
            className="relative w-32 h-32 mx-auto mb-8"
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ duration: 1.2, ease: "easeOut" }}
          >
            <motion.div
              className="absolute inset-0 bg-gradient-to-br from-pink-500 to-purple-600 rounded-3xl shadow-2xl"
              whileHover={{ 
                scale: 1.05,
                rotate: 5,
                boxShadow: "0 25px 50px -12px rgba(236, 72, 153, 0.5)"
              }}
            />
            <motion.div
              className="absolute inset-3 bg-gradient-to-br from-purple-400 to-pink-500 rounded-2xl shadow-xl"
              whileHover={{ 
                scale: 1.05,
                rotate: -3
              }}
            />
            <motion.div
              className="absolute inset-6 bg-gradient-to-br from-pink-400 to-purple-400 rounded-xl shadow-lg flex items-center justify-center"
              whileHover={{ scale: 1.1 }}
            >
              <Sparkles className="w-12 h-12 text-white" />
            </motion.div>
          </motion.div>

          <motion.h1 
            className="text-4xl font-bold mb-4"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.8 }}
          >
            <span className="bg-gradient-to-r from-pink-400 via-purple-400 to-pink-500 bg-clip-text text-transparent">
              Connect Google Drive
            </span>
          </motion.h1>
          
          <motion.p 
            className="text-pink-200 text-lg mb-8 leading-relaxed"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.8 }}
          >
            Connect your Google Drive to start the AI-powered cleanup experience. 
            Our smart algorithms will help you identify and remove unnecessary files.
          </motion.p>

          {/* Feature highlights */}
          <motion.div 
            className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7, duration: 0.8 }}
          >
            <div className="bg-pink-800/30 backdrop-blur-sm border border-pink-500/30 rounded-2xl p-4">
              <Heart className="w-6 h-6 text-pink-400 mb-2" />
              <h3 className="text-white font-medium mb-1">Swipe to Clean</h3>
              <p className="text-pink-200 text-sm">Tinder-style file review</p>
            </div>
            <div className="bg-purple-800/30 backdrop-blur-sm border border-purple-500/30 rounded-2xl p-4">
              <Zap className="w-6 h-6 text-purple-400 mb-2" />
              <h3 className="text-white font-medium mb-1">AI Analysis</h3>
              <p className="text-purple-200 text-sm">Smart cleanup suggestions</p>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.9, duration: 0.8 }}
          >
            <Link 
              href="/"
              className="inline-flex items-center space-x-3 px-8 py-4 bg-gradient-to-r from-pink-500 via-purple-500 to-pink-600 hover:from-pink-600 hover:via-purple-600 hover:to-pink-700 text-white rounded-2xl font-medium transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-2xl"
            >
              <ArrowLeft className="w-5 h-5" />
              <span>Go to Dashboard</span>
            </Link>
          </motion.div>
        </motion.div>
      </div>
    );
  }

  return (
    <Protected>
      <div className="min-h-screen bg-gradient-to-br from-pink-900 via-purple-900 to-gray-900">
        <SwipeToCleanUI onBack={() => window.history.back()} />
      </div>
    </Protected>
  );
}