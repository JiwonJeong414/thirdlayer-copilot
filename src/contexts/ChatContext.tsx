// src/contexts/ChatContext.tsx - Updated with proper model handling
'use client';

import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { useDrive } from './DriveContext';

interface User {
  id: string;
  email: string;
  displayName: string;
  photoURL: string;
  uid: string;  // Add this to match our OAuth implementation
}

interface Message {
  id: string;
  content: string;
  sender: string;
  timestamp: string;
  images: string[];
  driveContext?: {
    fileId: string;
    fileName: string;
    similarity: number;
  }[];
}

interface Chat {
  id: string;
  summary: string;
  updatedAt: string;
  messages: Message[];
}

interface ChatContextType {
  chats: Chat[];
  currentChat: Chat | null;
  messages: Message[];
  isLoading: boolean;
  selectedModel: string;
  availableModels: string[];
  driveSearchEnabled: boolean;
  setSelectedModel: (model: string) => void;
  setDriveSearchEnabled: (enabled: boolean) => void;
  createNewChat: (summary?: string) => Promise<string>;
  loadChat: (chatId: string) => Promise<void>;
  sendMessage: (content: string) => Promise<void>;
  deleteChat: (chatId: string) => Promise<void>;
  fetchChats: () => Promise<void>;
  fetchModels: () => Promise<void>;
  clearCurrentChat: () => void;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export const useChat = () => {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  return context;
};

export const ChatProvider = ({ children }: { children: ReactNode }) => {
  const { user, driveConnection } = useAuth();
  const { searchDocuments } = useDrive();
  const [chats, setChats] = useState<Chat[]>([]);
  const [currentChat, setCurrentChat] = useState<Chat | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedModel, setSelectedModel] = useState('llama3.2:1b'); // Safe default
  const [availableModels, setAvailableModels] = useState<string[]>(['llama3.2:1b']);
  const [driveSearchEnabled, setDriveSearchEnabled] = useState(true);

  useEffect(() => {
    if (user) {
      fetchChats();
      fetchModels();
    }
  }, [user]);

  const getAuthToken = async () => {
    if (!user) throw new Error('User not authenticated');
    // Get the session cookie
    const response = await fetch('/api/auth/session');
    if (!response.ok) {
      throw new Error('Failed to get session');
    }
    const { accessToken, user: sessionUser } = await response.json();
    
    // Update user data if needed
    if (sessionUser && sessionUser.uid !== user.uid) {
      // The user data in the session is different from what we have
      // This shouldn't happen, but let's handle it gracefully
      console.warn('Session user data mismatch');
    }
    
    return accessToken;
  };

  const fetchModels = async () => {
    try {
      const token = await getAuthToken();
      const response = await fetch('/api/models', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      const data = await response.json();
      
      if (data.models && data.models.length > 0) {
        const modelNames = data.models.map((model: any) => model.name);
        setAvailableModels(modelNames);
        
        // Set the first available model as default if current model isn't available
        if (!modelNames.includes(selectedModel)) {
          setSelectedModel(modelNames[0]);
        }
      }
    } catch (error) {
      console.error('Error fetching models:', error);
      // Keep the default model if fetching fails
    }
  };

  const fetchChats = async () => {
    if (!user) return;
    
    try {
      const token = await getAuthToken();
      const response = await fetch(`/api/chats?userUid=${user.uid}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      const data = await response.json();
      setChats(data.chats || []);
    } catch (error) {
      console.error('Error fetching chats:', error);
    }
  };

  const createNewChat = async (summary?: string): Promise<string> => {
    if (!user) throw new Error('User not authenticated');

    try {
      const token = await getAuthToken();
      const response = await fetch('/api/chats', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          userUid: user.uid,
          summary: summary || 'New Chat',
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error);

      setCurrentChat(data.chat);
      setMessages(data.chat.messages || []);
      await fetchChats();

      return data.chat.id;
    } catch (error) {
      console.error('Error creating chat:', error);
      throw error;
    }
  };

  const loadChat = async (chatId: string) => {
    try {
      const token = await getAuthToken();
      const response = await fetch(`/api/chats/${chatId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      const data = await response.json();
      
      if (!response.ok) throw new Error(data.error);

      setCurrentChat(data.chat);
      setMessages(data.chat.messages || []);
    } catch (error) {
      console.error('Error loading chat:', error);
      throw error;
    }
  };

  const saveMessage = async (content: string, sender: string, images: string[] = [], driveContext?: any[]) => {
    if (!currentChat) return;

    try {
      const token = await getAuthToken();
      const response = await fetch(`/api/chats/${currentChat.id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          content,
          sender,
          images,
          driveContext,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error);
      }
    } catch (error) {
      console.error('Error saving message:', error);
    }
  };

  const sendMessage = async (content: string) => {
    if (isLoading || !user) return;

    // Validate that we have a chat model selected
    if (!selectedModel || !availableModels.includes(selectedModel)) {
      console.error('Invalid model selected:', selectedModel);
      alert('Please select a valid chat model');
      return;
    }

    // If no current chat, create one
    if (!currentChat) {
      const chatSummary = content.slice(0, 50) + (content.length > 50 ? '...' : '');
      try {
        await createNewChat(chatSummary);
      } catch (error) {
        console.error('Failed to create new chat:', error);
        return;
      }
    }

    let driveContext: any[] = [];

    // Search Drive documents if enabled and connected
    if (driveSearchEnabled && driveConnection.isConnected) {
      try {
        const driveResults = await searchDocuments(content, 3);
        driveContext = driveResults.map(result => ({
          fileId: result.fileId,
          fileName: result.fileName,
          content: result.content,
          similarity: result.similarity,
        }));
      } catch (error) {
        console.error('Error searching Drive documents:', error);
      }
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      sender: 'user',
      content,
      timestamp: new Date().toISOString(),
      images: [],
      driveContext: driveContext.length > 0 ? driveContext : undefined,
    };

    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);

    // Save user message to database
    await saveMessage(content, 'user', [], driveContext);

    try {
      // Prepare messages for Ollama, including Drive context
      let contextualContent = content;
      
      if (driveContext.length > 0) {
        const driveContextText = driveContext
          .map(ctx => `Document: ${ctx.fileName}\nContent: ${ctx.content.substring(0, 500)}...`)
          .join('\n\n');
        
        contextualContent = `Based on the following documents from your Google Drive:\n\n${driveContextText}\n\nUser question: ${content}`;
      }

      const requestBody = {
        model: selectedModel,
        messages: [...messages, userMessage].map((msg, index) => ({
          role: msg.sender === 'user' ? 'user' : 'assistant',
          content: index === messages.length ? contextualContent : msg.content,
        })),
        stream: true,
      };

      console.log('Sending chat request with model:', selectedModel);

      const token = await getAuthToken();
      const response = await fetch('/api/chats', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      if (!response.body) {
        throw new Error('No response body received');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        sender: selectedModel,
        content: '',
        timestamp: new Date().toISOString(),
        images: [],
        driveContext: driveContext.length > 0 ? driveContext.map(ctx => ({
          fileId: ctx.fileId,
          fileName: ctx.fileName,
          similarity: ctx.similarity,
        })) : undefined,
      };

      setMessages(prev => [...prev, assistantMessage]);

      let buffer = '';
      let done = false;
      let fullContent = '';

      while (!done) {
        try {
          const { value, done: streamDone } = await reader.read();
          done = streamDone;
          
          if (value) {
            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';

            for (const line of lines) {
              if (line.trim()) {
                try {
                  const parsed = JSON.parse(line);
                  
                  if (parsed.message?.content) {
                    fullContent += parsed.message.content;
                    assistantMessage.content = fullContent;
                    
                    setMessages(prev => {
                      const newMessages = [...prev];
                      newMessages[newMessages.length - 1] = { ...assistantMessage };
                      return newMessages;
                    });
                  }

                  if (parsed.done) {
                    done = true;
                    break;
                  }
                } catch (parseError) {
                  console.error('Error parsing line:', line, parseError);
                }
              }
            }
          }
        } catch (readError) {
          console.error('Error reading stream:', readError);
          break;
        }
      }

      // Process any remaining buffer
      if (buffer.trim()) {
        try {
          const parsed = JSON.parse(buffer);
          if (parsed.message?.content) {
            fullContent += parsed.message.content;
            assistantMessage.content = fullContent;
            setMessages(prev => {
              const newMessages = [...prev];
              newMessages[newMessages.length - 1] = { ...assistantMessage };
              return newMessages;
            });
          }
        } catch (error) {
          console.error('Error parsing final buffer:', error);
        }
      }

      // Save assistant message to database
      await saveMessage(fullContent, selectedModel, [], driveContext);

    } catch (error) {
      console.error('Error in sendMessage:', error);
      
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        sender: selectedModel,
        content: `Error: ${error instanceof Error ? error.message : 'Unknown error occurred'}`,
        timestamp: new Date().toISOString(),
        images: [],
      };

      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const deleteChat = async (chatId: string) => {
    try {
      const response = await fetch(`/api/chats/${chatId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error);
      }

      if (currentChat?.id === chatId) {
        setCurrentChat(null);
        setMessages([]);
      }

      await fetchChats();
    } catch (error) {
      console.error('Error deleting chat:', error);
      throw error;
    }
  };

  const clearCurrentChat = () => {
    setCurrentChat(null);
    setMessages([]);
  };

  return (
    <ChatContext.Provider
      value={{
        chats,
        currentChat,
        messages,
        isLoading,
        selectedModel,
        availableModels,
        driveSearchEnabled,
        setSelectedModel,
        setDriveSearchEnabled,
        createNewChat,
        loadChat,
        sendMessage,
        deleteChat,
        fetchChats,
        fetchModels,
        clearCurrentChat,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
};