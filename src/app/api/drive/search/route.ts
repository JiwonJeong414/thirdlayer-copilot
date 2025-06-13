// src/app/api/drive/search/route.ts - Updated for session-based auth
import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@/generated/prisma';
import { VectorService } from '@/lib/vectorService';

const prisma = new PrismaClient();

export async function POST(request: NextRequest) {
  try {
    // Get user ID from session cookie
    const session = request.cookies.get('session');
    if (!session) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { userId } = JSON.parse(session.value);
    const { query, limit = 5 } = await request.json();

    if (!query) {
      return NextResponse.json({ error: 'Query required' }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
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