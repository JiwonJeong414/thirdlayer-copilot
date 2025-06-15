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

// Drive context for messages
export interface DriveContext {
  fileId: string;
  fileName: string;
  similarity: number;
}

// Chat structure
export interface Chat {
  id: string;
  summary: string;
  updatedAt: string;
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

// API request/response types
export interface ChatCompletionRequest {
  model: string;
  messages: {
    role: 'user' | 'assistant' | 'system';
    content: string;
  }[];
  stream?: boolean;
  options?: {
    temperature?: number;
    top_p?: number;
    top_k?: number;
    num_predict?: number;
  };
}

export interface ChatCompletionResponse {
  model: string;
  created_at: string;
  message: {
    role: 'user' | 'assistant' | 'system';
    content: string;
  };
  done: boolean;
  total_duration?: number;
  load_duration?: number;
  prompt_eval_count?: number;
  prompt_eval_duration?: number;
  eval_count?: number;
  eval_duration?: number;
}

export interface ChatStreamResponse {
  model: string;
  created_at: string;
  message?: {
    role: 'user' | 'assistant' | 'system';
    content: string;
  };
  done: boolean;
}