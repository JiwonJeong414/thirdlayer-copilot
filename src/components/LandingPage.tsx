// src/components/LandingPage.tsx - Updated with separate links for AI features
'use client';

import React from 'react';
import { motion, useScroll, useTransform, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { 
  MessageSquare, 
  Sparkles, 
  Brain, 
  ArrowDown, 
  Cloud, 
  Zap, 
  ChevronDown,
  CheckCircle,
  Star,
  Users,
  FileText,
  FolderOpen
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

const LandingPage = () => {
  const { user, signInWithGoogle, loading } = useAuth();
  const router = useRouter();
  const { scrollY } = useScroll();

  // Parallax effects
  const y1 = useTransform(scrollY, [0, 1000], [0, -200]);
  const y2 = useTransform(scrollY, [0, 1000], [0, -400]);
  const opacity = useTransform(scrollY, [0, 300], [1, 0]);

  const features = [
    {
      id: 'chat',
      title: 'AI Chat',
      subtitle: 'Layer One',
      description: 'Intelligent conversations with your documents. Ask questions, get insights, and chat with your entire Google Drive.',
      icon: MessageSquare,
      color: 'from-blue-500 to-cyan-500',
      bgColor: 'bg-blue-500/10',
      borderColor: 'border-blue-500/20',
      stats: ['Smart document search', 'Natural language queries', 'Context-aware responses'],
      href: '/?chat=true', // Goes to main chat
    },
    {
      id: 'cleanup',
      title: 'AI Cleanup',
      subtitle: 'Layer Two', 
      description: 'Smart file organization and cleanup. Remove duplicates, find unused files, and optimize your storage automatically.',
      icon: Sparkles,
      color: 'from-purple-500 to-pink-500',
      bgColor: 'bg-purple-500/10',
      borderColor: 'border-purple-500/20',
      stats: ['Duplicate detection', 'Smart categorization', 'Space optimization'],
      href: '/cleanup', // Separate cleanup page
    },
    {
      id: 'organize',
      title: 'AI Organization',
      subtitle: 'Layer Three',
      description: 'Intelligent folder structure and file organization. Let AI create the perfect hierarchy for your files.',
      icon: Brain,
      color: 'from-emerald-500 to-teal-500',
      bgColor: 'bg-emerald-500/10',
      borderColor: 'border-emerald-500/20',
      stats: ['Smart folders', 'Auto-categorization', 'ML-powered insights'],
      href: '/organize', // Separate organization page
    }
  ];

  const handleFeatureClick = (href: string) => {
    if (user) {
      router.push(href);
    }
  };

  const handleGetStarted = () => {
    if (user) {
      router.push('/'); // Go to dashboard
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white overflow-x-hidden">
      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center">
        {/* Animated background */}
        <div className="absolute inset-0 overflow-hidden">
          <motion.div 
            style={{ y: y1 }}
            className="absolute -top-40 -right-40 w-80 h-80 bg-blue-500/20 rounded-full blur-3xl"
          />
          <motion.div 
            style={{ y: y2 }}
            className="absolute -bottom-40 -left-40 w-80 h-80 bg-purple-500/20 rounded-full blur-3xl"
          />
        </div>

        <motion.div 
          style={{ opacity }}
          className="relative z-10 text-center max-w-4xl mx-auto px-6"
        >
          {/* Drive Logo Inspired Animation */}
          <motion.div 
            className="mb-8 relative"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ duration: 1, ease: "easeOut" }}
          >
            <div className="relative w-32 h-32 mx-auto">
              <motion.div
                className="absolute inset-0 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-2xl"
                initial={{ rotate: -45, opacity: 0 }}
                animate={{ rotate: 0, opacity: 1 }}
                transition={{ delay: 0.2, duration: 0.8 }}
              />
              <motion.div
                className="absolute inset-2 bg-gradient-to-r from-purple-500 to-pink-500 rounded-2xl"
                initial={{ rotate: 45, opacity: 0 }}
                animate={{ rotate: 0, opacity: 1 }}
                transition={{ delay: 0.4, duration: 0.8 }}
              />
              <motion.div
                className="absolute inset-4 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-2xl"
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.6, duration: 0.8 }}
              />
            </div>
          </motion.div>

          <motion.h1 
            className="text-6xl md:text-7xl font-bold mb-6 bg-gradient-to-r from-white via-gray-200 to-gray-400 bg-clip-text text-transparent"
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.8, duration: 0.8 }}
          >
            Let's dive deep into{' '}
            <span className="bg-gradient-to-r from-blue-400 via-purple-400 to-emerald-400 bg-clip-text text-transparent">
              three layers
            </span>{' '}
            of our app
          </motion.h1>
          
          <motion.p 
            className="text-xl md:text-2xl text-gray-300 mb-12"
            initial={{ y: 30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 1, duration: 0.8 }}
          >
            Just like Google Drive's iconic logo, each layer brings unique power
          </motion.p>

          <motion.div
            initial={{ y: 30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 1.2, duration: 0.8 }}
          >
            <motion.button
              className="group flex items-center space-x-2 mx-auto px-8 py-4 bg-white/10 backdrop-blur-sm border border-white/20 rounded-full text-white hover:bg-white/20 transition-all duration-300"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => {
                document.getElementById('auth-section')?.scrollIntoView({ behavior: 'smooth' });
              }}
            >
              <span className="text-lg">Explore the layers</span>
              <motion.div
                animate={{ y: [0, 4, 0] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                <ArrowDown className="w-5 h-5" />
              </motion.div>
            </motion.button>
          </motion.div>
        </motion.div>

        {/* Floating elements */}
        <motion.div
          className="absolute top-20 left-20 opacity-20"
          animate={{ 
            y: [0, -20, 0],
            rotate: [0, 5, 0]
          }}
          transition={{ duration: 4, repeat: Infinity }}
        >
          <Cloud className="w-12 h-12 text-blue-400" />
        </motion.div>
        <motion.div
          className="absolute top-40 right-20 opacity-20"
          animate={{ 
            y: [0, 20, 0],
            rotate: [0, -5, 0]
          }}
          transition={{ duration: 3, repeat: Infinity, delay: 1 }}
        >
          <Sparkles className="w-8 h-8 text-purple-400" />
        </motion.div>
      </section>

      {/* Auth Section */}
      <section id="auth-section" className="min-h-screen flex items-center justify-center relative">
        <motion.div 
          className="text-center max-w-2xl mx-auto px-6"
          initial={{ opacity: 0, y: 100 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
        >
          <motion.div
            className="mb-8"
            initial={{ scale: 0 }}
            whileInView={{ scale: 1 }}
            transition={{ delay: 0.2, duration: 0.8 }}
            viewport={{ once: true }}
          >
            <div className="w-20 h-20 mx-auto bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
              <Cloud className="w-10 h-10 text-white" />
            </div>
          </motion.div>

          <motion.h2 
            className="text-5xl font-bold mb-6"
            initial={{ y: 30, opacity: 0 }}
            whileInView={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.8 }}
            viewport={{ once: true }}
          >
            Sign in to unlock the layers
          </motion.h2>
          
          <motion.p 
            className="text-xl text-gray-300 mb-12"
            initial={{ y: 20, opacity: 0 }}
            whileInView={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.4, duration: 0.8 }}
            viewport={{ once: true }}
          >
            Connect with Google to access all three powerful layers
          </motion.p>

          <AnimatePresence mode="wait">
            {!user ? (
              <motion.button
                key="signin"
                onClick={signInWithGoogle}
                disabled={loading}
                className="group relative flex items-center space-x-3 mx-auto px-8 py-4 bg-white text-gray-900 rounded-full font-medium text-lg hover:shadow-2xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                whileHover={{ scale: loading ? 1 : 1.05 }}
                whileTap={{ scale: loading ? 1 : 0.95 }}
                initial={{ y: 30, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: -30, opacity: 0 }}
                transition={{ delay: 0.5, duration: 0.8 }}
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-900"></div>
                    <span>Signing in...</span>
                  </>
                ) : (
                  <>
                    <svg className="w-6 h-6" viewBox="0 0 24 24">
                      <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                      <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                      <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                      <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                    </svg>
                    <span>Continue with Google</span>
                  </>
                )}
              </motion.button>
            ) : (
              <motion.div
                key="success"
                className="space-y-6"
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.8 }}
              >
                <div className="flex items-center justify-center space-x-4 p-6 bg-green-500/20 border border-green-500/30 rounded-2xl">
                  <CheckCircle className="w-8 h-8 text-green-400" />
                  <div className="text-left">
                    <h3 className="text-xl font-semibold text-green-400">
                      Welcome, {user.displayName || 'User'}!
                    </h3>
                    <p className="text-green-300">Ready to explore the layers</p>
                  </div>
                </div>
                
                <motion.button
                  className="flex items-center space-x-2 mx-auto px-8 py-4 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full text-white font-medium text-lg hover:shadow-2xl transition-all duration-300"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => {
                    document.getElementById('features-section')?.scrollIntoView({ behavior: 'smooth' });
                  }}
                >
                  <span>Explore Features</span>
                  <ChevronDown className="w-5 h-5" />
                </motion.button>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </section>

      {/* Features Section - Only show if user is signed in */}
      <AnimatePresence>
        {user && (
          <motion.section 
            id="features-section"
            className="min-h-screen py-20"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1 }}
          >
            <div className="max-w-7xl mx-auto px-6">
              <motion.div 
                className="text-center mb-20"
                initial={{ y: 50, opacity: 0 }}
                whileInView={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.8 }}
                viewport={{ once: true }}
              >
                <h2 className="text-5xl font-bold mb-6">
                  Three powerful layers,{' '}
                  <span className="bg-gradient-to-r from-blue-400 via-purple-400 to-emerald-400 bg-clip-text text-transparent">
                    infinite possibilities
                  </span>
                </h2>
                <p className="text-xl text-gray-300">
                  Each layer builds upon the last, creating a complete Drive experience
                </p>
              </motion.div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {features.map((feature, index) => {
                  const Icon = feature.icon;
                  return (
                    <motion.div
                      key={feature.id}
                      className={`group relative p-8 ${feature.bgColor} ${feature.borderColor} border rounded-3xl hover:scale-105 transition-all duration-500 cursor-pointer`}
                      initial={{ y: 100, opacity: 0 }}
                      whileInView={{ y: 0, opacity: 1 }}
                      transition={{ delay: index * 0.2, duration: 0.8 }}
                      viewport={{ once: true }}
                      whileHover={{ y: -10 }}
                      onClick={() => handleFeatureClick(feature.href)}
                    >
                      {/* Layer indicator */}
                      <div className="absolute -top-4 left-8">
                        <span className="px-4 py-2 bg-gray-800 border border-gray-700 rounded-full text-sm font-medium">
                          {feature.subtitle}
                        </span>
                      </div>

                      {/* Icon */}
                      <motion.div 
                        className={`mb-6 w-16 h-16 bg-gradient-to-r ${feature.color} rounded-2xl flex items-center justify-center`}
                        whileHover={{ rotate: 360 }}
                        transition={{ duration: 0.8 }}
                      >
                        <Icon className="w-8 h-8 text-white" />
                      </motion.div>

                      {/* Content */}
                      <h3 className="text-2xl font-bold mb-4">{feature.title}</h3>
                      <p className="text-gray-300 mb-6 leading-relaxed">
                        {feature.description}
                      </p>

                      {/* Stats */}
                      <div className="space-y-3">
                        {feature.stats.map((stat, statIndex) => (
                          <motion.div
                            key={statIndex}
                            className="flex items-center space-x-3"
                            initial={{ x: -20, opacity: 0 }}
                            whileInView={{ x: 0, opacity: 1 }}
                            transition={{ delay: index * 0.2 + statIndex * 0.1, duration: 0.5 }}
                            viewport={{ once: true }}
                          >
                            <div className={`w-2 h-2 bg-gradient-to-r ${feature.color} rounded-full`} />
                            <span className="text-sm text-gray-400">{stat}</span>
                          </motion.div>
                        ))}
                      </div>

                      {/* Hover effect */}
                      <motion.div
                        className="absolute inset-0 bg-gradient-to-r from-white/5 to-white/10 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                        initial={false}
                      />
                    </motion.div>
                  );
                })}
              </div>

              {/* CTA Section */}
              <motion.div 
                className="text-center mt-20"
                initial={{ y: 50, opacity: 0 }}
                whileInView={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.8 }}
                viewport={{ once: true }}
              >
                <motion.button
                  className="group relative px-12 py-6 bg-gradient-to-r from-blue-500 via-purple-500 to-emerald-500 rounded-full text-white font-bold text-xl hover:shadow-2xl transition-all duration-300"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleGetStarted}
                >
                  <span className="relative z-10">Start Your Journey</span>
                  <motion.div
                    className="absolute inset-0 bg-gradient-to-r from-blue-600 via-purple-600 to-emerald-600 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                    initial={false}
                  />
                </motion.button>
                
                <p className="mt-4 text-gray-400">
                  Your Google Drive, supercharged with AI
                </p>
              </motion.div>
            </div>
          </motion.section>
        )}
      </AnimatePresence>

      {/* Footer */}
      <footer className="border-t border-gray-800 py-12">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <p className="text-gray-400">
            Built with ❤️ for Google Drive power users
          </p>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;