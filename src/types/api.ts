// src/types/api.ts - API request/response types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface ChatCompletionRequest {
  model: string;
  messages: Array<{
    role: 'user' | 'assistant' | 'system';
    content: string;
  }>;
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

export interface SyncRequest {
  limit?: number;
  force?: boolean;
}

export interface SyncResponse {
  success: boolean;
  message: string;
  strategy: string;
  targetDocuments: number;
  totalFilesInDrive: number;
  processableFilesInDrive: number;
  newFilesAvailable: number;
  processedCount: number;
  embeddingCount: number;
  skippedCount: number;
  errorCount: number;
  processedFiles: string[];
  totalIndexedFiles: number;
  embeddingModelAvailable: boolean;
} 