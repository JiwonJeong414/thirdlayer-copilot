// src/app/organize/page.tsx - Enhanced with matching dashboard theme
'use client';

import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import Protected from '@/components/Protected';
import Spinner from '@/components/Spinner';
import { OrganizerDashboard } from '@/components/organizer';
import { Brain, ArrowLeft, Folder, Sparkles, Target } from 'lucide-react';
import Link from 'next/link';
import { motion } from 'framer-motion';

export default function OrganizePage() {
  const { user, loading, driveConnection } = useAuth();

  if (loading) {
    return (
      <div className="flex h-screen w-screen justify-center items-center bg-gradient-to-br from-emerald-900 via-teal-900 to-gray-900">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="text-center"
        >
          <div className="w-16 h-16 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full mx-auto mb-4 flex items-center justify-center">
            <Brain className="w-8 h-8 text-white animate-pulse" />
          </div>
          <Spinner width="8" height="8" />
          <p className="text-emerald-200 mt-4">Loading AI Organization...</p>
        </motion.div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-900 via-teal-900 to-gray-900 flex items-center justify-center">
        <motion.div 
          className="text-center max-w-md"
          initial={{ y: 50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.8 }}
        >
          <div className="w-20 h-20 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-2xl mx-auto mb-6 flex items-center justify-center">
            <Brain className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-4">AI Drive Organization</h1>
          <p className="text-emerald-200 mb-6">
            Please sign in to access the AI-powered folder organization experience.
          </p>
          <Link 
            href="/"
            className="inline-flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white rounded-xl font-medium transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl"
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
      <div className="min-h-screen bg-gradient-to-br from-emerald-900 via-teal-900 to-gray-900 flex items-center justify-center relative overflow-hidden">
        {/* Animated background elements */}
        <div className="absolute inset-0">
          <motion.div 
            className="absolute top-20 left-20 w-32 h-32 bg-emerald-500/20 rounded-full blur-xl"
            animate={{ 
              y: [0, -20, 0],
              scale: [1, 1.1, 1]
            }}
            transition={{ duration: 4, repeat: Infinity }}
          />
          <motion.div 
            className="absolute bottom-20 right-20 w-40 h-40 bg-teal-500/20 rounded-full blur-xl"
            animate={{ 
              y: [0, 20, 0],
              scale: [1, 1.2, 1]
            }}
            transition={{ duration: 5, repeat: Infinity, delay: 1 }}
          />
          <motion.div 
            className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-60 h-60 bg-emerald-400/10 rounded-full blur-3xl"
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
              className="absolute inset-0 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-3xl shadow-2xl"
              whileHover={{ 
                scale: 1.05,
                rotate: 2,
                boxShadow: "0 25px 50px -12px rgba(16, 185, 129, 0.5)"
              }}
            />
            <motion.div
              className="absolute inset-3 bg-gradient-to-br from-teal-400 to-emerald-500 rounded-2xl shadow-xl"
              whileHover={{ 
                scale: 1.05,
                rotate: -2
              }}
            />
            <motion.div
              className="absolute inset-6 bg-gradient-to-br from-emerald-400 to-teal-400 rounded-xl shadow-lg flex items-center justify-center"
              whileHover={{ scale: 1.1 }}
            >
              <Brain className="w-12 h-12 text-white" />
            </motion.div>
          </motion.div>

          <motion.h1 
            className="text-4xl font-bold mb-4"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.8 }}
          >
            <span className="bg-gradient-to-r from-emerald-400 via-teal-400 to-emerald-500 bg-clip-text text-transparent">
              Connect Google Drive
            </span>
          </motion.h1>
          
          <motion.p 
            className="text-emerald-200 text-lg mb-8 leading-relaxed"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.8 }}
          >
            Connect your Google Drive to start the AI-powered organization experience. 
            Our smart algorithms will create the perfect folder hierarchy for your files.
          </motion.p>

          {/* Feature highlights */}
          <motion.div 
            className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7, duration: 0.8 }}
          >
            <div className="bg-emerald-800/30 backdrop-blur-sm border border-emerald-500/30 rounded-2xl p-4">
              <Target className="w-6 h-6 text-emerald-400 mb-2" />
              <h3 className="text-white font-medium mb-1">K-means Clustering</h3>
              <p className="text-emerald-200 text-sm">Content-based grouping</p>
            </div>
            <div className="bg-teal-800/30 backdrop-blur-sm border border-teal-500/30 rounded-2xl p-4">
              <Folder className="w-6 h-6 text-teal-400 mb-2" />
              <h3 className="text-white font-medium mb-1">Auto Folders</h3>
              <p className="text-teal-200 text-sm">Smart organization</p>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.9, duration: 0.8 }}
          >
            <Link 
              href="/"
              className="inline-flex items-center space-x-3 px-8 py-4 bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 hover:from-emerald-600 hover:via-teal-600 hover:to-emerald-700 text-white rounded-2xl font-medium transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-2xl"
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
      <div className="min-h-screen bg-gradient-to-br from-emerald-900 via-teal-900 to-gray-900">
        {/* Enhanced header with back button */}
        <div className="relative z-10">
          <div className="max-w-7xl mx-auto p-6">
            <motion.div 
              className="flex items-center justify-between mb-8"
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
            >
              <motion.button
                onClick={() => window.history.back()}
                className="flex items-center space-x-3 text-emerald-300 hover:text-white transition-colors p-3 rounded-xl hover:bg-emerald-800/30 backdrop-blur-sm"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <ArrowLeft className="w-5 h-5" />
                <span className="font-medium">Back</span>
              </motion.button>
              
              <motion.div 
                className="flex items-center space-x-4"
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.2, duration: 0.8 }}
              >
                <div className="p-4 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-2xl shadow-lg">
                  <Brain className="w-10 h-10 text-white" />
                </div>
                <div>
                  <h1 className="text-4xl font-bold bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent">
                    AI Drive Organizer
                  </h1>
                  <p className="text-emerald-300 text-lg">
                    Intelligent file organization using K-means clustering and folder analysis
                  </p>
                </div>
              </motion.div>
              
              <div className="w-24" /> {/* Spacer for balance */}
            </motion.div>
          </div>
        </div>
        
        {/* Pass the onBack prop to DriveOrganizerDashboard */}
        <OrganizerDashboard onBack={() => window.history.back()} />
      </div>
    </Protected>
  );
}