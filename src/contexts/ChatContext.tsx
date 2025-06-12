// src/contexts/ChatContext.tsx
'use client';

import React, { createContext, useContext, useState, ReactNode } from 'react';
import { Message, ChatCompletionRequest, ChatStreamResponse } from '@/types/chat';

interface ChatContextType {
  messages: Message[];
  isLoading: boolean;
  selectedModel: string;
  availableModels: string[];
  setSelectedModel: (model: string) => void;
  sendMessage: (content: string) => Promise<void>;
  clearMessages: () => void;
  fetchModels: () => Promise<void>;
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
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedModel, setSelectedModel] = useState('llama3.2:1b');
  const [availableModels, setAvailableModels] = useState<string[]>([]);

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

  const sendMessage = async (content: string) => {
    if (isLoading) return;

    const userMessage: Message = {
      role: 'user',
      content,
      timestamp: new Date().toISOString(),
    };

    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);

    try {
      const requestBody: ChatCompletionRequest = {
        model: selectedModel,
        messages: [...messages, userMessage],
        stream: true,
      };

      const response = await fetch('/api/chats', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok || !response.body) {
        throw new Error('Failed to get response');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let assistantMessage: Message = {
        role: 'assistant',
        content: '',
        timestamp: new Date().toISOString(),
      };

      setMessages(prev => [...prev, assistantMessage]);

      let buffer = '';
      let done = false;

      while (!done) {
        const { value, done: streamDone } = await reader.read();
        done = streamDone;
        
        if (value) {
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (line.trim()) {
              try {
                const parsed: ChatStreamResponse = JSON.parse(line);
                
                if (parsed.message?.content) {
                  assistantMessage.content += parsed.message.content;
                  
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
              } catch (error) {
                console.error('Error parsing stream:', error);
              }
            }
          }
        }
      }

      // Process any remaining buffer
      if (buffer.trim()) {
        try {
          const parsed: ChatStreamResponse = JSON.parse(buffer);
          if (parsed.message?.content) {
            assistantMessage.content += parsed.message.content;
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

    } catch (error) {
      console.error('Error sending message:', error);
      
      const errorMessage: Message = {
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please try again.',
        timestamp: new Date().toISOString(),
      };

      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const clearMessages = () => {
    setMessages([]);
  };

  return (
    <ChatContext.Provider
      value={{
        messages,
        isLoading,
        selectedModel,
        availableModels,
        setSelectedModel,
        sendMessage,
        clearMessages,
        fetchModels,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
};