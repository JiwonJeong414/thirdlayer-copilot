
// src/app/api/drive/files/route.ts - Updated for session-based auth
import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@/generated/prisma';
import { VectorService } from '@/lib/vectorService';

const prisma = new PrismaClient();

export async function GET(request: NextRequest) {
  try {
    const session = request.cookies.get('session');
    if (!session) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { userId } = JSON.parse(session.value);

    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const indexedFiles = await VectorService.getUserIndexedFiles(user.id);

    return NextResponse.json({ files: indexedFiles });
  } catch (error) {
    console.error('Error getting indexed files:', error);
    return NextResponse.json({ error: 'Failed to get indexed files' }, { status: 500 });
  }
}