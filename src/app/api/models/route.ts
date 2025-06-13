// src/app/api/models/route.ts - No authentication required for getting available models
import { NextRequest, NextResponse } from 'next/server';

// List of known embedding models that should be excluded from chat
const EMBEDDING_MODELS = [
  'mxbai-embed-large',
  'nomic-embed-text',
  'all-minilm',
  'bge-large',
  'bge-base',
  'bge-small',
  'embed-english',
  'embed-multilingual'
];

export async function GET(request: NextRequest) {
  try {
    if (!process.env.OLLAMA_ENDPOINT) {
      return NextResponse.json(
        { error: 'Ollama endpoint not configured' }, 
        { status: 500 }
      );
    }

    const response = await fetch(`${process.env.OLLAMA_ENDPOINT}/api/tags`);
    
    if (!response.ok) {
      throw new Error('Failed to fetch models from Ollama');
    }

    const data = await response.json();
    
    // Filter out embedding models from the chat model list
    const chatModels = data.models?.filter((model: any) => {
      const modelName = model.name.toLowerCase();
      return !EMBEDDING_MODELS.some(embeddingModel => 
        modelName.includes(embeddingModel.toLowerCase())
      );
    }) || [];

    return NextResponse.json({
      models: chatModels,
      totalModels: data.models?.length || 0,
      chatModels: chatModels.length,
      embeddingModels: (data.models?.length || 0) - chatModels.length
    });
  } catch (error) {
    console.error('Error fetching models:', error);
    
    if (error instanceof TypeError && error.message.includes('fetch')) {
      return NextResponse.json(
        { error: 'Cannot connect to Ollama. Make sure it\'s running.' }, 
        { status: 503 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to fetch models' }, 
      { status: 500 }
    );
  }
}