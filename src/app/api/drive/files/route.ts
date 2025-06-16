// src/app/api/drive/files/route.ts - Updated for session-based auth with embeddings support
import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@/generated/prisma';
import { VectorService } from '@/lib/VectorService';

const prisma = new PrismaClient();

export async function GET(request: NextRequest) {
  try {
    const session = request.cookies.get('session');
    if (!session) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { userId } = JSON.parse(session.value);
    const url = new URL(request.url);
    const includeEmbeddings = url.searchParams.get('embeddings') === 'true';

    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // If embeddings are requested (for organization), return detailed embedding data
    if (includeEmbeddings) {
      console.log(`📊 Fetching file embeddings for organization for user ${userId}`);

      // Get all indexed files with embeddings for the user
      const embeddings = await prisma.documentEmbedding.findMany({
        where: { userId },
        select: {
          fileId: true,
          fileName: true,
          embedding: true,
          content: true,
          metadata: true,
          chunkIndex: true,
          createdAt: true,
        },
        orderBy: {
          createdAt: 'desc'
        }
      });

      console.log(`📄 Found ${embeddings.length} document embeddings`);

      // Group embeddings by fileId and take the first chunk for each file
      const fileMap = new Map();
      embeddings.forEach(embedding => {
        if (!fileMap.has(embedding.fileId)) {
          fileMap.set(embedding.fileId, embedding);
        }
      });

      const uniqueFiles = Array.from(fileMap.values());
      console.log(`📁 Unique files: ${uniqueFiles.length}`);

      // Convert to the expected format for clustering
      const fileEmbeddings = uniqueFiles.map(e => ({
        fileId: e.fileId,
        fileName: e.fileName,
        embedding: Array.isArray(e.embedding) ? e.embedding : JSON.parse(e.embedding || '[]'),
        content: e.content,
        metadata: e.metadata,
        folderPath: (e.metadata as any)?.folderPath || 'Root',
        chunkIndex: e.chunkIndex,
        createdAt: e.createdAt
      }));

      // Filter out files with invalid embeddings
      const validEmbeddings = fileEmbeddings.filter(file => 
        Array.isArray(file.embedding) && file.embedding.length > 0
      );

      console.log(`✅ Valid embeddings for organization: ${validEmbeddings.length}`);

      return NextResponse.json({
        success: true,
        embeddings: validEmbeddings,
        totalFiles: uniqueFiles.length,
        validFiles: validEmbeddings.length,
        totalEmbeddings: embeddings.length
      });
    } else {
      // Original functionality - return indexed files list
      const indexedFiles = await VectorService.getUserIndexedFiles(user.id);
      return NextResponse.json({ files: indexedFiles });
    }

  } catch (error) {
    console.error('Error getting indexed files:', error);
    return NextResponse.json({ error: 'Failed to get indexed files' }, { status: 500 });
  }
}