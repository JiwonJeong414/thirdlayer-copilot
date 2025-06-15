// Retrieve, Create new chats
import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@/generated/prisma';

const prisma = new PrismaClient();

// GET /api/chats - Retrieves all chats for the authenticated user
export async function GET(request: NextRequest) {
  try {
    // Get user ID from session cookie (via middleware)
    const session = request.cookies.get('session');
    if (!session) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { userId } = JSON.parse(session.value);

    // Find user by ID
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Fetch chats with their first message for preview
    const chats = await prisma.chat.findMany({
      where: {
        userId: user.id,
      },
      include: {
        messages: {
          orderBy: {
            timestamp: 'asc',
          },
          take: 1, // Only get the first message for preview
        },
      },
      orderBy: {
        updatedAt: 'desc', // Most recent chats first
      },
    });

    return NextResponse.json({ chats });
  } catch (error) {
    console.error('Error fetching chats:', error);
    return NextResponse.json({ error: 'Failed to fetch chats' }, { status: 500 });
  }
}

// POST /api/chats - Creates a new chat with optional first message
// Creates the chat containe rin my database (new notebook)
export async function POST(request: NextRequest) {
  try {
    const { summary, firstMessage } = await request.json();
    
    // Get user ID from session cookie
    const session = request.cookies.get('session');
    if (!session) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { userId } = JSON.parse(session.value);

    if (!summary) {
      return NextResponse.json({ error: 'Summary required' }, { status: 400 });
    }

    // Find user
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Create new chat with optional first message
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

// PUT /api/chats - Handles streaming chat responses from Ollama
// Actual back-and-forth conversation with the AI
export async function PUT(request: NextRequest) {
  try {
    // Get user ID from session cookie
    const session = request.cookies.get('session');
    if (!session) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { userId } = JSON.parse(session.value);

    const body = await request.json();
    
    console.log('Ollama chat request:', JSON.stringify(body, null, 2));
    
    // Validate required fields
    if (!body.model || !body.messages) {
      return NextResponse.json(
        { error: 'Model and messages are required' }, 
        { status: 400 }
      );
    }

    // Check if Ollama endpoint is configured
    if (!process.env.OLLAMA_ENDPOINT) {
      return NextResponse.json(
        { error: 'Ollama endpoint not configured' }, 
        { status: 500 }
      );
    }

    // Forward request to Ollama API
    const ollamaResponse = await fetch(`${process.env.OLLAMA_ENDPOINT}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    // Handle Ollama API errors
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

    // Stream the response back to the client
    return new NextResponse(ollamaResponse.body, {
      headers: {
        'Content-Type': 'application/json',
        'Transfer-Encoding': 'chunked',
      },
      status: 200,
    });

  } catch (error) {
    console.error('Ollama chat error:', error);
    
    // Handle connection errors specifically
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