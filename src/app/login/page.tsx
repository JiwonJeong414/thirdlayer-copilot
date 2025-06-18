'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { 
  ArrowLeft, 
  Cloud, 
  CheckCircle,
  Shield,
  Users,
  Sparkles
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

const LoginPage = () => {
  const { user, signInWithGoogle, loading } = useAuth();
  const router = useRouter();

  // Redirect to dashboard if already authenticated
  React.useEffect(() => {
    if (user) {
      router.push('/dashboard');
    }
  }, [user, router]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white">
      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 bg-gray-900/80 backdrop-blur-sm border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <button
            onClick={() => router.push('/')}
            className="flex items-center space-x-3 text-gray-300 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Back to Home</span>
          </button>
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg"></div>
            <span className="text-xl font-bold">TripleClean</span>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="min-h-screen flex items-center justify-center pt-20 px-6">
        <div className="max-w-md w-full">
          <motion.div
            className="text-center"
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            {/* Logo */}
            <motion.div
              className="mb-8"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, duration: 0.8 }}
            >
              <div className="relative w-20 h-20 mx-auto">
                <motion.div
                  className="absolute inset-0 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-2xl"
                  initial={{ rotate: -45, opacity: 0 }}
                  animate={{ rotate: 0, opacity: 1 }}
                  transition={{ delay: 0.4, duration: 0.8 }}
                />
                <motion.div
                  className="absolute inset-1 bg-gradient-to-r from-purple-500 to-pink-500 rounded-2xl"
                  initial={{ rotate: 45, opacity: 0 }}
                  animate={{ rotate: 0, opacity: 1 }}
                  transition={{ delay: 0.6, duration: 0.8 }}
                />
                <motion.div
                  className="absolute inset-2 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-2xl"
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.8, duration: 0.8 }}
                />
              </div>
            </motion.div>

            <motion.h1 
              className="text-4xl md:text-5xl font-bold mb-4"
              initial={{ y: 30, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.3, duration: 0.8 }}
            >
              Welcome to{' '}
              <span className="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                TripleClean
              </span>
            </motion.h1>
            
            <motion.p 
              className="text-xl text-gray-300 mb-12"
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.4, duration: 0.8 }}
            >
              Sign in with Google to start managing your Drive with AI
            </motion.p>

            {/* Auth Button */}
            <AnimatePresence mode="wait">
              {!user ? (
                <motion.div
                  key="signin"
                  className="space-y-8"
                  initial={{ y: 30, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: -30, opacity: 0 }}
                  transition={{ delay: 0.5, duration: 0.8 }}
                >
                  <motion.button
                    onClick={signInWithGoogle}
                    disabled={loading}
                    className="group relative w-full flex items-center justify-center space-x-3 px-8 py-4 bg-white text-gray-900 rounded-2xl font-medium text-lg hover:shadow-2xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                    whileHover={{ scale: loading ? 1 : 1.02 }}
                    whileTap={{ scale: loading ? 1 : 0.98 }}
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

                  {/* Security Features */}
                  <div className="space-y-4 text-sm text-gray-400">
                    <div className="flex items-center justify-center space-x-4">
                      <div className="flex items-center space-x-2">
                        <Shield className="w-4 h-4 text-green-400" />
                        <span>Secure OAuth</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Sparkles className="w-4 h-4 text-purple-400" />
                        <span>Local AI Processing</span>
                      </div>
                    </div>
                    <p className="text-center text-xs">
                      Your data stays private. We only access the files you choose to sync.
                    </p>
                  </div>
                </motion.div>
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
                      <p className="text-green-300">Redirecting to dashboard...</p>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </div>
      </div>

      {/* Floating background elements */}
      <motion.div
        className="absolute top-20 left-20 opacity-10"
        animate={{ 
          y: [0, -20, 0],
          rotate: [0, 5, 0]
        }}
        transition={{ duration: 4, repeat: Infinity }}
      >
        <Cloud className="w-12 h-12 text-blue-400" />
      </motion.div>
      <motion.div
        className="absolute top-40 right-20 opacity-10"
        animate={{ 
          y: [0, 20, 0],
          rotate: [0, -5, 0]
        }}
        transition={{ duration: 3, repeat: Infinity, delay: 1 }}
      >
        <Cloud className="w-8 h-8 text-purple-400" />
      </motion.div>
      <motion.div
        className="absolute bottom-20 left-1/4 opacity-10"
        animate={{ 
          y: [0, -15, 0],
          rotate: [0, 3, 0]
        }}
        transition={{ duration: 5, repeat: Infinity, delay: 2 }}
      >
        <Cloud className="w-10 h-10 text-emerald-400" />
      </motion.div>
    </div>
  );
};

export default LoginPage;