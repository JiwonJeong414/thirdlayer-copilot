// src/app/api/drive/disconnect/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@/generated/prisma';

const prisma = new PrismaClient();

export async function POST(request: NextRequest) {
  try {
    const uid = request.headers.get('uid');
    if (!uid) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { uid },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Delete Drive connection and embeddings
    await prisma.$transaction([
      prisma.documentEmbedding.deleteMany({
        where: { userId: user.id },
      }),
      prisma.driveConnection.deleteMany({
        where: { userId: user.id },
      }),
    ]);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error disconnecting Drive:', error);
    return NextResponse.json({ error: 'Failed to disconnect Drive' }, { status: 500 });
  }
} 