import { DriveContext } from './drive';

// src/types/chat.ts

// Chat message structure
export interface Message {
  id: string;
  content: string;
  sender: string;
  timestamp: string;
  images: string[];
  driveContext?: DriveContext[];
}

// Chat structure
export interface Chat {
  id: string;
  summary: string;
  userId: string;
  createdAt: Date;
  updatedAt: Date;
  messages: Message[];
}

// Chat context type for React context
export interface ChatContextType {
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