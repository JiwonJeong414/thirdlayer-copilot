// src/app/api/chats/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@/generated/prisma';

const prisma = new PrismaClient();

// Get all chats for a user
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userUid = searchParams.get('userUid');

    if (!userUid) {
      return NextResponse.json({ error: 'User UID required' }, { status: 400 });
    }

    // Find user by UID instead of email
    const user = await prisma.user.findUnique({
      where: { uid: userUid },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const chats = await prisma.chat.findMany({
      where: {
        userId: user.id,
      },
      include: {
        messages: {
          orderBy: {
            timestamp: 'asc',
          },
          take: 1,
        },
      },
      orderBy: {
        updatedAt: 'desc',
      },
    });

    return NextResponse.json({ chats });
  } catch (error) {
    console.error('Error fetching chats:', error);
    return NextResponse.json({ error: 'Failed to fetch chats' }, { status: 500 });
  }
}

// Create a new chat
export async function POST(request: NextRequest) {
  try {
    const { userUid, summary, firstMessage } = await request.json();

    if (!userUid || !summary) {
      return NextResponse.json({ error: 'User UID and summary required' }, { status: 400 });
    }

    // Find user by UID
    const user = await prisma.user.findUnique({
      where: { uid: userUid },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const chat = await prisma.chat.create({
      data: {
        summary,
        userId: user.id,
        messages: firstMessage ? {
          create: {
            content: firstMessage,
            sender: 'user',
            images: [],
          },
        } : undefined,
      },
      include: {
        messages: true,
      },
    });

    return NextResponse.json({ chat });
  } catch (error) {
    console.error('Error creating chat:', error);
    return NextResponse.json({ error: 'Failed to create chat' }, { status: 500 });
  }
}

// Handle Ollama chat streaming
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    
    console.log('Ollama chat request:', JSON.stringify(body, null, 2));
    
    if (!body.model || !body.messages) {
      return NextResponse.json(
        { error: 'Model and messages are required' }, 
        { status: 400 }
      );
    }

    if (!process.env.OLLAMA_ENDPOINT) {
      return NextResponse.json(
        { error: 'Ollama endpoint not configured' }, 
        { status: 500 }
      );
    }

    const ollamaResponse = await fetch(`${process.env.OLLAMA_ENDPOINT}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!ollamaResponse.ok) {
      const errorText = await ollamaResponse.text();
      console.error('Ollama error:', errorText);
      
      if (ollamaResponse.status === 404) {
        return NextResponse.json(
          { error: `Model "${body.model}" not found. Try: ollama pull ${body.model}` }, 
          { status: 404 }
        );
      }
      
      return NextResponse.json(
        { error: `Ollama error: ${errorText}` }, 
        { status: ollamaResponse.status }
      );
    }

    if (!ollamaResponse.body) {
      return NextResponse.json(
        { error: 'No response from Ollama' }, 
        { status: 500 }
      );
    }

    return new NextResponse(ollamaResponse.body, {
      headers: {
        'Content-Type': 'application/json',
        'Transfer-Encoding': 'chunked',
      },
      status: 200,
    });

  } catch (error) {
    console.error('Ollama chat error:', error);
    
    if (error instanceof TypeError && error.message.includes('fetch')) {
      return NextResponse.json(
        { error: 'Cannot connect to Ollama. Make sure it\'s running on http://localhost:11434' }, 
        { status: 503 }
      );
    }
    
    return NextResponse.json(
      { error: `Server error: ${error instanceof Error ? error.message : 'Unknown error'}` }, 
      { status: 500 }
    );
  }
}