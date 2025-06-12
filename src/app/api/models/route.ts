// src/app/api/models/route.ts
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
    try {
      const response = await fetch(`${process.env.OLLAMA_ENDPOINT}/api/tags`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch models from Ollama');
      }
  
      const data = await response.json();
      return NextResponse.json(data);
    } catch (error) {
      console.error('Error fetching models:', error);
      return NextResponse.json(
        { error: 'Failed to fetch models' }, 
        { status: 500 }
      );
    }
  }