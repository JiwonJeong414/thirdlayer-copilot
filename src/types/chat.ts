// src/types/chat.ts
export interface Message {
    role: 'user' | 'assistant' | 'system';
    content: string;
    timestamp?: string;
  }
  
  export interface ChatCompletionRequest {
    model: string;
    messages: Message[];
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
    message: Message;
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
    message?: Message;
    done: boolean;
  }