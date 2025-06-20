// src/app/layout.tsx
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { AuthProvider } from '@/contexts/AuthContext'
import { ChatProvider } from '@/contexts/ChatContext'
import DriveProvider from '@/contexts/DriveContext'
import { CleanerProvider } from '@/contexts/CleanerContext'

const inter = Inter({ 
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
})

export const metadata: Metadata = {
  title: 'TripleClean',
  description: 'AI Chat Interface with Ollama Integration and Google Drive Search',
  verification: {
    google: 'v7WqphdspBSJ5ecQuGcFAXwZatiO18m9Qclf8zyK1I8',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={inter.variable}>
      <body className={`font-sans ${inter.className}`}>
        <AuthProvider>
          <DriveProvider>
            <CleanerProvider>
              <ChatProvider>
                {children}
              </ChatProvider>
            </CleanerProvider>
          </DriveProvider>
        </AuthProvider>
      </body>
    </html>
  )
}