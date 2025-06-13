// src/app/api/drive/search/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@/generated/prisma';
import { VectorService } from '@/lib/vectorService';
import { auth } from '@/lib/firebase-admin';

const prisma = new PrismaClient();

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const token = authHeader.split('Bearer ')[1];
    const decodedToken = await auth.verifyIdToken(token);
    const uid = decodedToken.uid;

    const { query, limit = 5 } = await request.json();

    if (!query) {
      return NextResponse.json({ error: 'Query required' }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { uid },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const results = await VectorService.searchSimilarDocuments(user.id, query, limit);

    return NextResponse.json({ results });
  } catch (error) {
    console.error('Error searching Drive documents:', error);
    return NextResponse.json({ error: 'Failed to search documents' }, { status: 500 });
  }
} 