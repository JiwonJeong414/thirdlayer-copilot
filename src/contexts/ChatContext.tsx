// src/contexts/ChatContext.tsx - Updated to use /api/chats
'use client';

import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { useAuth } from './AuthContext';

interface Message {
  id: string;
  content: string;
  sender: string;
  timestamp: string;
  images: string[];
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
  setSelectedModel: (model: string) => void;
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
  const { user } = useAuth();
  const [chats, setChats] = useState<Chat[]>([]);
  const [currentChat, setCurrentChat] = useState<Chat | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedModel, setSelectedModel] = useState('llama3.2:1b');
  const [availableModels, setAvailableModels] = useState<string[]>([]);

  useEffect(() => {
    if (user) {
      fetchChats();
      fetchModels();
    }
  }, [user]);

  const fetchModels = async () => {
    try {
      const response = await fetch('/api/models');
      const data = await response.json();
      
      if (data.models) {
        const modelNames = data.models.map((model: any) => model.name);
        setAvailableModels(modelNames);
      }
    } catch (error) {
      console.error('Error fetching models:', error);
    }
  };

  const fetchChats = async () => {
    if (!user) return;
    
    try {
      const response = await fetch(`/api/chats?uid=${user.uid}`);
      const data = await response.json();
      setChats(data.chats || []);
    } catch (error) {
      console.error('Error fetching chats:', error);
    }
  };

  const createNewChat = async (summary?: string): Promise<string> => {
    if (!user) throw new Error('User not authenticated');

    try {
      const response = await fetch('/api/chats', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
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

  const saveMessage = async (content: string, sender: string, images: string[] = []) => {
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

    const userMessage: Message = {
      id: Date.now().toString(),
      sender: 'user',
      content,
      timestamp: new Date().toISOString(),
      images: [],
    };

    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);

    // Save user message to database
    await saveMessage(content, 'user');

    try {
      const requestBody = {
        model: selectedModel,
        messages: [...messages, userMessage].map(msg => ({
          role: msg.sender === 'user' ? 'user' : 'assistant',
          content: msg.content,
        })),
        stream: true,
      };

      console.log('Sending Ollama request via /api/chats PUT:', requestBody);

      // Use PUT method on /api/chats for Ollama streaming
      const response = await fetch('/api/chats', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      console.log('Response status:', response.status);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        console.error('API Error:', errorData);
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      if (!response.body) {
        console.error('No response body');
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
      };

      setMessages(prev => [...prev, assistantMessage]);

      let buffer = '';
      let done = false;
      let fullContent = '';

      console.log('Starting to read stream...');

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
                    console.log('Stream completed');
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
      await saveMessage(fullContent, selectedModel);

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
        setSelectedModel,
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