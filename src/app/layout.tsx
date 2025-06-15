// src/app/layout.tsx
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { AuthProvider } from '@/contexts/AuthContext'
import { ChatProvider } from '@/contexts/ChatContext'
import DriveProvider from '@/contexts/DriveContext'

const inter = Inter({ 
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
})

export const metadata: Metadata = {
  title: 'Third Layer Copilot',
  description: 'AI Chat Interface with Ollama Integration and Google Drive Search',
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
            <ChatProvider>
              {children}
            </ChatProvider>
          </DriveProvider>
        </AuthProvider>
      </body>
    </html>
  )
}