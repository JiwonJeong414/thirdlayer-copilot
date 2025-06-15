// API route for searching through indexed Google Drive documents
// Uses vector similarity search to find relevant document chunks
import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@/generated/prisma';
import { VectorService } from '@/lib/vectorService';

const prisma = new PrismaClient();

/**
 * POST handler for document search
 * Searches through user's indexed documents using vector similarity
 * 
 * @param request - NextRequest object containing the search query and optional limit
 * @returns JSON response with search results or error message
 */
export async function POST(request: NextRequest) {
  try {
    // Verify user authentication using session cookie
    const session = request.cookies.get('session');
    if (!session) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // Extract user ID from session and search parameters from request body
    const { userId } = JSON.parse(session.value);
    const { query, limit = 5 } = await request.json();

    // Validate search query
    if (!query) {
      return NextResponse.json({ error: 'Query required' }, { status: 400 });
    }

    // Verify user exists in database
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Perform vector similarity search on user's documents
    const results = await VectorService.searchSimilarDocuments(user.id, query, limit);

    // Return search results
    return NextResponse.json({ results });
  } catch (error) {
    // Log error and return generic error message
    console.error('Error searching Drive documents:', error);
    return NextResponse.json({ error: 'Failed to search documents' }, { status: 500 });
  }
}