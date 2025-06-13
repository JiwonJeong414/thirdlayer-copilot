// src/app/api/drive/files/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@/generated/prisma';
import { VectorService } from '@/lib/vectorService';

const prisma = new PrismaClient();

export async function GET(request: NextRequest) {
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

    const indexedFiles = await VectorService.getUserIndexedFiles(user.id);

    return NextResponse.json({ files: indexedFiles });
  } catch (error) {
    console.error('Error getting indexed files:', error);
    return NextResponse.json({ error: 'Failed to get indexed files' }, { status: 500 });
  }
} 