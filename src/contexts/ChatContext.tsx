// Manages chat state, AI model interactions, and Google Drive integration for contextual conversations
'use client';

import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { useDrive } from './DriveContext';
import { Chat, Message, ChatContextType } from '@/types/chat';

// Create context with undefined default value
const ChatContext = createContext<ChatContextType | undefined>(undefined);

// Custom hook to use chat context
export const useChat = () => {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  return context;
};

// Provider component that wraps the app and makes chat state available
export const ChatProvider = ({ children }: { children: ReactNode }) => {
  const { user, driveConnection } = useAuth();
  const { searchDocuments } = useDrive();
  
  // State management
  const [chats, setChats] = useState<Chat[]>([]);
  const [currentChat, setCurrentChat] = useState<Chat | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedModel, setSelectedModel] = useState('llama3.2:1b');
  const [availableModels, setAvailableModels] = useState<string[]>(['llama3.2:1b']);
  const [driveSearchEnabled, setDriveSearchEnabled] = useState(true);

  // Load chats and models when user is authenticated
  useEffect(() => {
    if (user) {
      fetchChats(); // Load user's chat history 
      fetchModels(); // Get available AI models from Ollama
    }
  }, [user]);

  // Fetch user's chat history
  const fetchChats = async () => {
    if (!user) return;
    
    try {
      const response = await fetch('/api/chats');
      const data = await response.json();
      setChats(data.chats || []);
    } catch (error) {
      console.error('Error fetching chats:', error);
    }
  };

  // Fetch available AI models from the server
  const fetchModels = async () => {
    try {
      const response = await fetch('/api/models');
      const data = await response.json();
      
      if (data.models && data.models.length > 0) {
        const modelNames = data.models.map((model: any) => model.name);
        setAvailableModels(modelNames);
        
        if (!modelNames.includes(selectedModel)) {
          setSelectedModel(modelNames[0]);
        }
      }
    } catch (error) {
      console.error('Error fetching models:', error);
    }
  };

  // Create a new chat session
  const createNewChat = async (summary?: string): Promise<string> => {
    if (!user) throw new Error('User not authenticated');

    try {
      const response = await fetch('/api/chats', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
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

  // Load an existing chat session
  const loadChat = async (chatId: string) => {
    try {
      const response = await fetch(`/api/chats/${chatId}`);
      const data = await response.json();
      
      if (!response.ok) throw new Error(data.error);

      setCurrentChat(data.chat);
      setMessages(data.chat.messages || []);
    } catch (error) {
      console.error('Error loading chat:', error);
      throw error;
    }
  };

  // Save a message to the current chat
  const saveMessage = async (content: string, sender: string, images: string[] = [], driveContext?: any[]) => {
    if (!currentChat) return;

    try {
      const response = await fetch(`/api/chats/${currentChat.id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
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

  // Send a message and handle AI response
  const sendMessage = async (content: string) => {
    if (isLoading || !user) return;

    if (!selectedModel || !availableModels.includes(selectedModel)) {
      console.error('Invalid model selected:', selectedModel);
      alert('Please select a valid chat model');
      return;
    }

    // Create new chat if none exists
    if (!currentChat) {
      const chatSummary = content.slice(0, 50) + (content.length > 50 ? '...' : '');
      try {
        await createNewChat(chatSummary);
      } catch (error) {
        console.error('Failed to create new chat:', error);
        return;
      }
    }

    // WHEN DRIVE SEARCH IS ENABLED!!! Search drive documents if enabled 
    let driveContext: any[] = [];
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

    // Create user message
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

    await saveMessage(content, 'user', [], driveContext);

    try {
      // Prepare context-aware content
      let contextualContent = content;
      if (driveContext.length > 0) {
        const driveContextText = driveContext
          .map(ctx => `Document: ${ctx.fileName}\nContent: ${ctx.content.substring(0, 500)}...`)
          .join('\n\n');
        
        contextualContent = `Based on the following documents from your Google Drive:\n\n${driveContextText}\n\nUser question: ${content}`;
      }

      // Prepare request to AI model
      const requestBody = {
        model: selectedModel,
        messages: [...messages, userMessage].map((msg, index) => ({
          role: msg.sender === 'user' ? 'user' : 'assistant',
          content: index === messages.length ? contextualContent : msg.content,
        })),
        stream: true,
      };

      // Send request to AI model
      const response = await fetch('/api/chats', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
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

      // Handle streaming response
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

      // Process stream chunks
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

      // Process final buffer
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

  // Delete a chat session
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

  // Clear current chat session
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