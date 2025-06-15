/**
 * VectorService handles document embedding and semantic search functionality.
 * 
 * Key features:
 * - Converts text documents into vector embeddings using Ollama
 * - Splits documents into overlapping chunks for better context
 * - Stores and retrieves document embeddings from database
 * - Performs semantic search using cosine similarity
 * - Supports both structured (markdown, code) and plain text documents
 */

import { prisma } from '@/lib/prisma';

export class VectorService {
  // Configuration constants for text chunking and embedding
  private static CHUNK_SIZE = 800;
  private static CHUNK_OVERLAP = 150;
  private static EMBEDDING_MODEL = 'mxbai-embed-large';
  private static MIN_CHUNK_SIZE = 50;
  private static MIN_DOCUMENT_SIZE = 20;
  private static RELEVANCE_THRESHOLD = 0.3;

  // Generates embedding vector for given text using Ollama API
  static async generateEmbedding(text: string, context?: { fileName?: string, docType?: string }): Promise<number[]> {
    try {
      if (!process.env.OLLAMA_ENDPOINT) {
        throw new Error('OLLAMA_ENDPOINT not configured');
      }

      let promptText = text;
      if (context?.fileName) {
        promptText = `Document: ${context.fileName}\n\nContent: ${text}`;
      }

      console.log(`Generating embedding for text (${text.length} chars) with model: ${this.EMBEDDING_MODEL}`);
      
      const response = await fetch(`${process.env.OLLAMA_ENDPOINT}/api/embeddings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: this.EMBEDDING_MODEL,
          prompt: promptText.substring(0, 2000),
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
      
      console.log(`✅ Generated embedding with ${data.embedding.length} dimensions`);
      return data.embedding;
    } catch (error) {
      console.error('Error generating embedding:', error);
      throw new Error(`Failed to generate embedding: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Splits text into overlapping chunks for better context preservation
  static splitTextIntoChunks(text: string, fileName: string): { content: string; metadata: any }[] {
    const chunks: { content: string; metadata: any }[] = [];
    
    if (text.length <= this.CHUNK_SIZE) {
      console.log(`📝 Small document (${text.length} chars) - creating single chunk`);
      chunks.push({
        content: text.trim(),
        metadata: {
          wordCount: text.split(' ').length,
          docType: 'small',
          chunkIndex: 0,
        }
      });
      return chunks;
    }
    
    const docType = this.detectDocumentType(fileName, text);
    
    if (docType === 'structured') {
      return this.chunkStructuredDocument(text, fileName);
    } else {
      return this.chunkPlainText(text, fileName);
    }
  }

  // Detects if document has structured format (headers, lists, code)
  private static detectDocumentType(fileName: string, text: string): string {
    const hasHeaders = /^#{1,6}\s/.test(text) || /^\d+\.\s/.test(text);
    const hasList = /^[\*\-\+]\s/m.test(text) || /^\d+\.\s/m.test(text);
    const isCode = fileName.includes('.') && (fileName.endsWith('.js') || fileName.endsWith('.py') || fileName.endsWith('.md'));
    
    if (hasHeaders || hasList || isCode) {
      return 'structured';
    }
    return 'plain';
  }

  // Chunks structured documents while preserving section context
  private static chunkStructuredDocument(text: string, fileName: string): { content: string; metadata: any }[] {
    const chunks: { content: string; metadata: any }[] = [];
    const paragraphs = text.split(/\n\s*\n/).filter(p => p.trim().length > 0);
    
    let currentChunk = '';
    let chunkIndex = 0;
    
    for (let i = 0; i < paragraphs.length; i++) {
      const paragraph = paragraphs[i].trim();
      
      if (currentChunk.length + paragraph.length > this.CHUNK_SIZE && currentChunk.length > 0) {
        chunks.push({
          content: currentChunk.trim(),
          metadata: {
            wordCount: currentChunk.split(' ').length,
            section: this.extractSection(currentChunk),
            docType: 'structured',
            chunkIndex,
          }
        });
        chunkIndex++;
        
        const words = currentChunk.split(' ');
        const overlapWords = words.slice(-Math.floor(this.CHUNK_OVERLAP / 5));
        currentChunk = overlapWords.join(' ') + '\n\n' + paragraph;
      } else {
        currentChunk += (currentChunk ? '\n\n' : '') + paragraph;
      }
    }
    
    if (currentChunk.trim().length > 0) {
      chunks.push({
        content: currentChunk.trim(),
        metadata: {
          wordCount: currentChunk.split(' ').length,
          section: this.extractSection(currentChunk),
          docType: 'structured',
          chunkIndex,
        }
      });
    }
    
    return chunks;
  }

  // Chunks plain text documents using sentence boundaries
  private static chunkPlainText(text: string, fileName: string): { content: string; metadata: any }[] {
    const chunks: { content: string; metadata: any }[] = [];
    const sentences = this.splitIntoSentences(text);
    
    let currentChunk = '';
    let chunkIndex = 0;
    
    for (const sentence of sentences) {
      if (currentChunk.length + sentence.length > this.CHUNK_SIZE && currentChunk.length > 0) {
        chunks.push({
          content: currentChunk.trim(),
          metadata: {
            wordCount: currentChunk.split(' ').length,
            docType: 'plain',
            chunkIndex,
          }
        });
        chunkIndex++;
        
        const words = currentChunk.split(' ');
        const overlapWords = words.slice(-Math.floor(this.CHUNK_OVERLAP / 5));
        currentChunk = overlapWords.join(' ') + ' ' + sentence;
      } else {
        currentChunk += (currentChunk ? ' ' : '') + sentence;
      }
    }
    
    if (currentChunk.trim().length > 0) {
      chunks.push({
        content: currentChunk.trim(),
        metadata: {
          wordCount: currentChunk.split(' ').length,
          docType: 'plain',
          chunkIndex,
        }
      });
    }
    
    return chunks;
  }

  // Splits text into sentences using punctuation and capitalization
  private static splitIntoSentences(text: string): string[] {
    return text
      .split(/(?<=[.!?])\s+(?=[A-Z])/)
      .filter(s => s.trim().length > 0)
      .map(s => s.trim());
  }

  // Extracts section headers from structured text
  private static extractSection(text: string): string | undefined {
    const headerMatch = text.match(/^#{1,6}\s+(.+)$/m) || text.match(/^(\d+\.?\s+[A-Z][^.\n]+)/m);
    return headerMatch ? headerMatch[1].trim() : undefined;
  }

  // Stores document embeddings in database with duplicate checking
  static async storeDocumentEmbeddings(
    userId: string,
    fileId: string,
    fileName: string,
    content: string
  ): Promise<void> {
    try {
      if (content.trim().length < this.MIN_DOCUMENT_SIZE) {
        console.log(`❌ Document too small to process: ${fileName} (${content.length} chars)`);
        throw new Error(`Document content too small (${content.length} chars, minimum ${this.MIN_DOCUMENT_SIZE})`);
      }

      // FIXED: More thorough existing embeddings check with better error handling
      let existingCount = 0;
      try {
        existingCount = await prisma.documentEmbedding.count({
          where: { 
            fileId: fileId,
            userId: userId 
          }
        });
      } catch (countError) {
        console.error(`❌ Error checking existing embeddings for ${fileName}:`, countError);
        throw new Error(`Failed to check existing embeddings: ${countError instanceof Error ? countError.message : 'Unknown error'}`);
      }

      if (existingCount > 0) {
        console.log(`⚠️ Embeddings already exist for ${fileName} (${existingCount} chunks), skipping...`);
        return;
      }

      const chunks = this.splitTextIntoChunks(content, fileName);
      console.log(`📊 Processing ${chunks.length} chunks for file: ${fileName}`);
      
      if (chunks.length === 0) {
        console.log(`❌ No chunks created for ${fileName} - content might be too small or invalid`);
        throw new Error(`No valid chunks created for ${fileName}`);
      }
      
      let successfulChunks = 0;
      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        
        try {
          console.log(`   🧠 Creating embedding for chunk ${i + 1}/${chunks.length} (${chunk.content.length} chars)`);
          
          const embedding = await this.generateEmbedding(
            chunk.content, 
            { fileName, docType: chunk.metadata.docType }
          );
          
          // FIXED: Add validation and better error handling for database insert
          console.log(`   💾 Storing embedding in database...`);
          console.log(`   📊 Embedding info: ${embedding.length} dimensions, userId: ${userId}, fileId: ${fileId}`);
          
          // Validate the embedding data before inserting
          if (!Array.isArray(embedding) || embedding.length === 0) {
            throw new Error(`Invalid embedding format: ${typeof embedding}`);
          }
          
          if (!userId || !fileId || !fileName) {
            throw new Error(`Missing required fields: userId=${userId}, fileId=${fileId}, fileName=${fileName}`);
          }

          // FIXED: Check for duplicate before inserting
          const duplicate = await prisma.documentEmbedding.findFirst({
            where: {
              fileId: fileId,
              chunkIndex: i,
              userId: userId
            }
          });

          if (duplicate) {
            console.log(`   ⚠️ Chunk ${i} already exists for ${fileName}, skipping...`);
            continue;
          }

          const result = await prisma.documentEmbedding.create({
            data: {
              fileId: fileId,
              fileName: fileName,
              content: chunk.content,
              embedding: embedding, // Make sure this is a proper array
              chunkIndex: i,
              userId: userId,
              metadata: chunk.metadata || {}, // Ensure metadata is never null
            },
          });
          
          successfulChunks++;
          console.log(`   ✅ Chunk ${i + 1} stored successfully with ID: ${result.id}`);
        } catch (chunkError) {
          console.error(`   ❌ DETAILED Error processing chunk ${i} for ${fileName}:`, {
            error: chunkError,
            chunkContent: chunk.content.substring(0, 100) + '...',
            chunkMetadata: chunk.metadata,
            userId,
            fileId,
            fileName,
            chunkIndex: i
          });
          
          // Log the full Prisma error for debugging
          if (chunkError instanceof Error) {
            console.error(`   🔍 Full error details:`, {
              name: chunkError.name,
              message: chunkError.message,
              stack: chunkError.stack
            });
          }
          
          throw chunkError; // Re-throw to fail the entire document
        }
      }
      
      console.log(`🎉 Successfully processed ${successfulChunks}/${chunks.length} chunks for ${fileName}`);
    } catch (error) {
      console.error(`💥 FULL Error storing document embeddings for ${fileName}:`, {
        error,
        userId,
        fileId,
        fileName,
        contentLength: content.length
      });
      throw new Error(`Failed to store document embeddings: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Searches for similar documents using cosine similarity and relevance scoring
  static async searchSimilarDocuments(
    userId: string,
    query: string,
    limit: number = 5
  ): Promise<any[]> {
    try {
      console.log(`🔍 Enhanced search for user ${userId} with query: "${query}"`);
      
      const queryEmbedding = await this.generateEmbedding(query);
      
      const embeddings = await prisma.documentEmbedding.findMany({
        where: { userId },
        select: {
          id: true,
          fileId: true,
          fileName: true,
          content: true,
          embedding: true,
          chunkIndex: true,
          metadata: true,
        },
      });

      if (embeddings.length === 0) {
        console.log('❌ No embeddings found for user');
        return [];
      }

      console.log(`Found ${embeddings.length} embeddings to search`);

      const similarities = embeddings.map((doc) => {
        try {
          const similarity = this.cosineSimilarity(queryEmbedding, doc.embedding as number[]);
          const relevanceScore = this.calculateRelevanceScore(query, doc.content, similarity, doc.metadata as any);
          
          return {
            content: doc.content,
            fileName: doc.fileName,
            fileId: doc.fileId,
            similarity,
            relevanceScore,
            chunkIndex: doc.chunkIndex,
            metadata: doc.metadata as any,
          };
        } catch (error) {
          console.error(`Error calculating similarity for doc ${doc.id}:`, error);
          return null;
        }
      }).filter((result): result is any => result !== null);

      const results = similarities
        .filter(result => result.similarity > this.RELEVANCE_THRESHOLD)
        .sort((a, b) => b.relevanceScore - a.relevanceScore)
        .slice(0, limit);
      
      console.log(`✅ Returning ${results.length} enhanced search results:`, 
        results.map(r => `${r.fileName}: ${(r.similarity * 100).toFixed(1)}% (relevance: ${r.relevanceScore.toFixed(2)})`));
      
      return results;
    } catch (error) {
      console.error('Error in enhanced search:', error);
      throw new Error(`Failed to search documents: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Calculates relevance score based on similarity, keyword matches, and metadata
  private static calculateRelevanceScore(
    query: string, 
    content: string, 
    similarity: number, 
    metadata: any
  ): number {
    let score = similarity;
    
    const queryWords = query.toLowerCase().split(' ').filter(w => w.length > 2);
    const contentLower = content.toLowerCase();
    
    let keywordMatches = 0;
    for (const word of queryWords) {
      if (contentLower.includes(word)) {
        keywordMatches++;
      }
    }
    
    const keywordBoost = (keywordMatches / queryWords.length) * 0.2;
    score += keywordBoost;
    
    if (metadata?.wordCount > 100) {
      score += 0.1;
    }
    
    if (metadata?.docType === 'structured') {
      score += 0.05;
    }
    
    return Math.min(score, 1.0);
  }

  // Computes cosine similarity between two vectors
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

  // Retrieves list of indexed files with metadata for a user
  static async getUserIndexedFiles(userId: string): Promise<{
    fileId: string;
    fileName: string;
    chunkCount: number;
    lastUpdated: Date;
    totalWords: number;
    docType: string;
  }[]> {
    try {
      console.log(`📊 Getting indexed files for user: ${userId}`);
      
      const result = await prisma.documentEmbedding.groupBy({
        by: ['fileId', 'fileName'],
        where: { userId },
        _count: { id: true },
        _max: { updatedAt: true },
      });

      console.log(`📈 Found ${result.length} unique files with embeddings`);

      const enrichedResults = await Promise.all(
        result.map(async (item) => {
          try {
            const chunks = await prisma.documentEmbedding.findMany({
              where: { fileId: item.fileId, userId },
              select: { metadata: true },
            });
            
            const totalWords = chunks.reduce((sum, chunk) => 
              sum + ((chunk.metadata as any)?.wordCount || 0), 0);
            
            const docType = (chunks[0]?.metadata as any)?.docType || 'unknown';
            
            return {
              fileId: item.fileId,
              fileName: item.fileName,
              chunkCount: item._count.id,
              lastUpdated: item._max.updatedAt!,
              totalWords,
              docType,
            };
          } catch (itemError) {
            console.error(`Error processing file ${item.fileId}:`, itemError);
            return {
              fileId: item.fileId,
              fileName: item.fileName,
              chunkCount: item._count.id,
              lastUpdated: item._max.updatedAt!,
              totalWords: 0,
              docType: 'error',
            };
          }
        })
      );

      return enrichedResults;
    } catch (error) {
      console.error('DETAILED error getting user indexed files:', {
        error,
        userId,
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        errorStack: error instanceof Error ? error.stack : undefined
      });
      throw new Error(`Failed to get indexed files: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Verifies if the required embedding model is available in Ollama
  static async checkEmbeddingModel(): Promise<boolean> {
    try {
      if (!process.env.OLLAMA_ENDPOINT) {
        console.error('OLLAMA_ENDPOINT not configured');
        return false;
      }

      const response = await fetch(`${process.env.OLLAMA_ENDPOINT}/api/tags`);
      if (!response.ok) {
        console.error('Failed to fetch Ollama models');
        return false;
      }
      
      const data = await response.json();
      const modelExists = data.models?.some((model: any) => 
        model.name.toLowerCase().includes(this.EMBEDDING_MODEL.toLowerCase())
      );
      
      if (!modelExists) {
        console.warn(`❌ Embedding model ${this.EMBEDDING_MODEL} not found. Please run: ollama pull ${this.EMBEDDING_MODEL}`);
      } else {
        console.log(`✅ Embedding model ${this.EMBEDDING_MODEL} is available`);
      }
      
      return modelExists;
    } catch (error) {
      console.error('Error checking embedding model:', error);
      return false;
    }
  }
}