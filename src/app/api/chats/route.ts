// src/app/api/chat/route.ts
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Clone the request to send to Ollama
    const ollamaResponse = await fetch(`${process.env.OLLAMA_ENDPOINT}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!ollamaResponse.ok || !ollamaResponse.body) {
      throw new Error('Failed to get response from Ollama');
    }

    // Return the streaming response
    return new NextResponse(ollamaResponse.body, {
      headers: {
        'Content-Type': 'application/json',
        'Transfer-Encoding': 'chunked',
      },
      status: ollamaResponse.status,
    });
  } catch (error) {
    console.error('Ollama API Error:', error);
    return NextResponse.json(
      { error: `Ollama Error - ${error}` }, 
      { status: 500 }
    );
  }
}