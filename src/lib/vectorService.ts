// src/lib/vectorService.ts
import { PrismaClient } from '@/generated/prisma';

const prisma = new PrismaClient();

export interface DocumentChunk {
  id: string;
  content: string;
  embedding: number[];
  fileId: string;
  fileName: string;
  chunkIndex: number;
  userId: string;
}

export interface SearchResult {
  content: string;
  fileName: string;
  fileId: string;
  similarity: number;
}

export class VectorService {
  private static CHUNK_SIZE = 1000;
  private static CHUNK_OVERLAP = 200;

  // Generate embeddings using Ollama's embedding model
  static async generateEmbedding(text: string): Promise<number[]> {
    try {
      const response = await fetch(`${process.env.OLLAMA_ENDPOINT}/api/embeddings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'mxbai-embed-large', // or your preferred embedding model
          prompt: text,
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to generate embedding: ${response.statusText}`);
      }

      const data = await response.json();
      return data.embedding;
    } catch (error) {
      console.error('Error generating embedding:', error);
      throw new Error('Failed to generate embedding');
    }
  }

  // Split text into chunks
  static splitTextIntoChunks(text: string): string[] {
    const chunks: string[] = [];
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
    
    let currentChunk = '';
    
    for (const sentence of sentences) {
      const trimmedSentence = sentence.trim();
      if (currentChunk.length + trimmedSentence.length > this.CHUNK_SIZE) {
        if (currentChunk.length > 0) {
          chunks.push(currentChunk.trim());
          // Keep some overlap
          const words = currentChunk.split(' ');
          const overlapWords = words.slice(-Math.floor(this.CHUNK_OVERLAP / 5));
          currentChunk = overlapWords.join(' ') + ' ' + trimmedSentence;
        } else {
          currentChunk = trimmedSentence;
        }
      } else {
        currentChunk += (currentChunk ? '. ' : '') + trimmedSentence;
      }
    }
    
    if (currentChunk.length > 0) {
      chunks.push(currentChunk.trim());
    }
    
    return chunks;
  }

  // Store document chunks with embeddings
  static async storeDocumentEmbeddings(
    userId: string,
    fileId: string,
    fileName: string,
    content: string
  ): Promise<void> {
    try {
      const chunks = this.splitTextIntoChunks(content);
      
      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        const embedding = await this.generateEmbedding(chunk);
        
        await prisma.documentEmbedding.upsert({
          where: {
            fileId_chunkIndex: {
              fileId,
              chunkIndex: i,
            },
          },
          update: {
            content: chunk,
            embedding: embedding,
            fileName,
            updatedAt: new Date(),
          },
          create: {
            fileId,
            fileName,
            content: chunk,
            embedding: embedding,
            chunkIndex: i,
            userId,
          },
        });
      }
    } catch (error) {
      console.error('Error storing document embeddings:', error);
      throw new Error('Failed to store document embeddings');
    }
  }

  // Search similar documents using cosine similarity
  static async searchSimilarDocuments(
    userId: string,
    query: string,
    limit: number = 5
  ): Promise<SearchResult[]> {
    try {
      const queryEmbedding = await this.generateEmbedding(query);
      
      // Get all embeddings for the user
      const embeddings = await prisma.documentEmbedding.findMany({
        where: { userId },
        select: {
          id: true,
          fileId: true,
          fileName: true,
          content: true,
          embedding: true,
        },
      });

      // Calculate cosine similarity for each embedding
      const similarities = embeddings.map((doc) => {
        const similarity = this.cosineSimilarity(queryEmbedding, doc.embedding as number[]);
        return {
          content: doc.content,
          fileName: doc.fileName,
          fileId: doc.fileId,
          similarity,
        };
      });

      // Sort by similarity and return top results
      return similarities
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, limit);
    } catch (error) {
      console.error('Error searching similar documents:', error);
      throw new Error('Failed to search documents');
    }
  }

  // Calculate cosine similarity between two vectors
  static cosineSimilarity(vecA: number[], vecB: number[]): number {
    if (vecA.length !== vecB.length) {
      throw new Error('Vectors must have the same length');
    }

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < vecA.length; i++) {
      dotProduct += vecA[i] * vecB[i];
      normA += vecA[i] * vecA[i];
      normB += vecB[i] * vecB[i];
    }

    normA = Math.sqrt(normA);
    normB = Math.sqrt(normB);

    if (normA === 0 || normB === 0) {
      return 0;
    }

    return dotProduct / (normA * normB);
  }

  // Delete embeddings for a specific file
  static async deleteFileEmbeddings(fileId: string): Promise<void> {
    try {
      await prisma.documentEmbedding.deleteMany({
        where: { fileId },
      });
    } catch (error) {
      console.error('Error deleting file embeddings:', error);
      throw new Error('Failed to delete file embeddings');
    }
  }

  // Get user's indexed files
  static async getUserIndexedFiles(userId: string): Promise<{
    fileId: string;
    fileName: string;
    chunkCount: number;
    lastUpdated: Date;
  }[]> {
    try {
      const result = await prisma.documentEmbedding.groupBy({
        by: ['fileId', 'fileName'],
        where: { userId },
        _count: { id: true },
        _max: { updatedAt: true },
      });

      return result.map((item) => ({
        fileId: item.fileId,
        fileName: item.fileName,
        chunkCount: item._count.id,
        lastUpdated: item._max.updatedAt!,
      }));
    } catch (error) {
      console.error('Error getting user indexed files:', error);
      throw new Error('Failed to get indexed files');
    }
  }
}