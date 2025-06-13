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
  private static EMBEDDING_MODEL = 'mxbai-embed-large'; // This is ONLY for embeddings

  // Generate embeddings using Ollama's embedding model
  static async generateEmbedding(text: string): Promise<number[]> {
    try {
      console.log(`Generating embedding with model: ${this.EMBEDDING_MODEL}`);
      
      const response = await fetch(`${process.env.OLLAMA_ENDPOINT}/api/embeddings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: this.EMBEDDING_MODEL,
          prompt: text,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Embedding API error:', errorText);
        throw new Error(`Failed to generate embedding: ${response.statusText}`);
      }

      const data = await response.json();
      
      if (!data.embedding || !Array.isArray(data.embedding)) {
        throw new Error('Invalid embedding response format');
      }
      
      return data.embedding;
    } catch (error) {
      console.error('Error generating embedding:', error);
      throw new Error(`Failed to generate embedding: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Check if embedding model is available
  static async checkEmbeddingModel(): Promise<boolean> {
    try {
      const response = await fetch(`${process.env.OLLAMA_ENDPOINT}/api/tags`);
      if (!response.ok) return false;
      
      const data = await response.json();
      const modelExists = data.models?.some((model: any) => 
        model.name.toLowerCase().includes(this.EMBEDDING_MODEL.toLowerCase())
      );
      
      if (!modelExists) {
        console.warn(`Embedding model ${this.EMBEDDING_MODEL} not found. Please run: ollama pull ${this.EMBEDDING_MODEL}`);
      }
      
      return modelExists;
    } catch (error) {
      console.error('Error checking embedding model:', error);
      return false;
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
      // Check if embedding model is available
      const modelAvailable = await this.checkEmbeddingModel();
      if (!modelAvailable) {
        throw new Error(`Embedding model ${this.EMBEDDING_MODEL} is not available. Please install it first.`);
      }

      const chunks = this.splitTextIntoChunks(content);
      console.log(`Processing ${chunks.length} chunks for file: ${fileName}`);
      
      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        
        try {
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
          
          console.log(`Processed chunk ${i + 1}/${chunks.length} for ${fileName}`);
        } catch (chunkError) {
          console.error(`Error processing chunk ${i} for ${fileName}:`, chunkError);
          // Continue with other chunks instead of failing completely
        }
      }
    } catch (error) {
      console.error('Error storing document embeddings:', error);
      throw new Error(`Failed to store document embeddings: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Search similar documents using cosine similarity
  static async searchSimilarDocuments(
    userId: string,
    query: string,
    limit: number = 5
  ): Promise<SearchResult[]> {
    try {
      // Check if embedding model is available
      const modelAvailable = await this.checkEmbeddingModel();
      if (!modelAvailable) {
        console.warn(`Embedding model ${this.EMBEDDING_MODEL} not available, returning empty results`);
        return [];
      }

      console.log(`Searching documents for user ${userId} with query: "${query}"`);
      
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

      if (embeddings.length === 0) {
        console.log('No embeddings found for user');
        return [];
      }

      console.log(`Found ${embeddings.length} embeddings to search`);

      // Calculate cosine similarity for each embedding
      const similarities = embeddings.map((doc) => {
        try {
          const similarity = this.cosineSimilarity(queryEmbedding, doc.embedding as number[]);
          return {
            content: doc.content,
            fileName: doc.fileName,
            fileId: doc.fileId,
            similarity,
          };
        } catch (error) {
          console.error(`Error calculating similarity for doc ${doc.id}:`, error);
          return {
            content: doc.content,
            fileName: doc.fileName,
            fileId: doc.fileId,
            similarity: 0,
          };
        }
      });

      // Sort by similarity and return top results
      const results = similarities
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, limit);
      
      console.log(`Returning ${results.length} search results`);
      return results;
    } catch (error) {
      console.error('Error searching similar documents:', error);
      throw new Error(`Failed to search documents: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Calculate cosine similarity between two vectors
  static cosineSimilarity(vecA: number[], vecB: number[]): number {
    if (vecA.length !== vecB.length) {
      throw new Error(`Vector length mismatch: ${vecA.length} vs ${vecB.length}`);
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
      const result = await prisma.documentEmbedding.deleteMany({
        where: { fileId },
      });
      console.log(`Deleted ${result.count} embeddings for file ${fileId}`);
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