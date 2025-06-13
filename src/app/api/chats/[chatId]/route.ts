// src/app/api/chats/[chatId]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@/generated/prisma';

const prisma = new PrismaClient();

// Get specific chat with messages
export async function GET(
  request: NextRequest,
  { params }: { params: { chatId: string } }
) {
  try {
    const chat = await prisma.chat.findUnique({
      where: {
        id: params.chatId,
      },
      include: {
        messages: {
          orderBy: {
            timestamp: 'asc',
          },
        },
        user: {
          select: {
            id: true,
            uid: true,
            email: true,
          },
        },
      },
    });

    if (!chat) {
      return NextResponse.json({ error: 'Chat not found' }, { status: 404 });
    }

    return NextResponse.json({ chat });
  } catch (error) {
    console.error('Error fetching chat:', error);
    return NextResponse.json({ error: 'Failed to fetch chat' }, { status: 500 });
  }
}

// Add a new message to existing chat
export async function POST(
  request: NextRequest,
  { params }: { params: { chatId: string } }
) {
  try {
    const { content, sender, images = [] } = await request.json();

    if (!content || !sender) {
      return NextResponse.json({ error: 'Content and sender required' }, { status: 400 });
    }

    const message = await prisma.message.create({
      data: {
        content,
        sender,
        images,
        chatId: params.chatId,
      },
    });

    // Update chat's updatedAt timestamp
    await prisma.chat.update({
      where: { id: params.chatId },
      data: { updatedAt: new Date() },
    });

    return NextResponse.json({ message });
  } catch (error) {
    console.error('Error creating message:', error);
    return NextResponse.json({ error: 'Failed to create message' }, { status: 500 });
  }
}

// Delete a chat
export async function DELETE(
  request: NextRequest,
  { params }: { params: { chatId: string } }
) {
  try {
    await prisma.chat.delete({
      where: {
        id: params.chatId,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting chat:', error);
    return NextResponse.json({ error: 'Failed to delete chat' }, { status: 500 });
  }
}