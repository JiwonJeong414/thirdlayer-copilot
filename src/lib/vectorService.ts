// src/lib/vectorService.ts - IMPROVED VERSION
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
  metadata?: {
    wordCount: number;
    section?: string;
    docType: string;
  };
}

export interface SearchResult {
  content: string;
  fileName: string;
  fileId: string;
  similarity: number;
  relevanceScore: number;
  chunkIndex: number;
  metadata?: any;
}

export class VectorService {
  private static CHUNK_SIZE = 800; // Slightly smaller for better coherence
  private static CHUNK_OVERLAP = 150;
  private static EMBEDDING_MODEL = 'mxbai-embed-large';
  private static MIN_CHUNK_SIZE = 100; // Skip very small chunks
  private static RELEVANCE_THRESHOLD = 0.3; // Filter low-relevance results

  // Enhanced embedding generation with context
  static async generateEmbedding(text: string, context?: { fileName?: string, docType?: string }): Promise<number[]> {
    try {
      if (!process.env.OLLAMA_ENDPOINT) {
        throw new Error('OLLAMA_ENDPOINT not configured');
      }

      // Add context to improve embedding quality
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

  // Improved text chunking with semantic awareness
  static splitTextIntoChunks(text: string, fileName: string): { content: string; metadata: any }[] {
    const chunks: { content: string; metadata: any }[] = [];
    
    // Detect document type
    const docType = this.detectDocumentType(fileName, text);
    
    // Handle different document types differently
    if (docType === 'structured') {
      return this.chunkStructuredDocument(text, fileName);
    } else {
      return this.chunkPlainText(text, fileName);
    }
  }

  private static detectDocumentType(fileName: string, text: string): string {
    // Check for structured document indicators
    const hasHeaders = /^#{1,6}\s/.test(text) || /^\d+\.\s/.test(text);
    const hasList = /^[\*\-\+]\s/m.test(text) || /^\d+\.\s/m.test(text);
    const isCode = fileName.includes('.') && (fileName.endsWith('.js') || fileName.endsWith('.py') || fileName.endsWith('.md'));
    
    if (hasHeaders || hasList || isCode) {
      return 'structured';
    }
    return 'plain';
  }

  private static chunkStructuredDocument(text: string, fileName: string): { content: string; metadata: any }[] {
    const chunks: { content: string; metadata: any }[] = [];
    
    // Split by double newlines (paragraphs) first
    const paragraphs = text.split(/\n\s*\n/).filter(p => p.trim().length > 0);
    
    let currentChunk = '';
    let chunkIndex = 0;
    
    for (let i = 0; i < paragraphs.length; i++) {
      const paragraph = paragraphs[i].trim();
      
      // Check if adding this paragraph would exceed chunk size
      if (currentChunk.length + paragraph.length > this.CHUNK_SIZE && currentChunk.length > 0) {
        // Save current chunk
        if (currentChunk.length >= this.MIN_CHUNK_SIZE) {
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
        }
        
        // Start new chunk with overlap
        const words = currentChunk.split(' ');
        const overlapWords = words.slice(-Math.floor(this.CHUNK_OVERLAP / 5));
        currentChunk = overlapWords.join(' ') + '\n\n' + paragraph;
      } else {
        currentChunk += (currentChunk ? '\n\n' : '') + paragraph;
      }
    }
    
    // Add final chunk
    if (currentChunk.length >= this.MIN_CHUNK_SIZE) {
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

  private static chunkPlainText(text: string, fileName: string): { content: string; metadata: any }[] {
    const chunks: { content: string; metadata: any }[] = [];
    
    // Use improved sentence splitting
    const sentences = this.splitIntoSentences(text);
    
    let currentChunk = '';
    let chunkIndex = 0;
    
    for (const sentence of sentences) {
      if (currentChunk.length + sentence.length > this.CHUNK_SIZE && currentChunk.length > 0) {
        if (currentChunk.length >= this.MIN_CHUNK_SIZE) {
          chunks.push({
            content: currentChunk.trim(),
            metadata: {
              wordCount: currentChunk.split(' ').length,
              docType: 'plain',
              chunkIndex,
            }
          });
          chunkIndex++;
        }
        
        // Create overlap
        const words = currentChunk.split(' ');
        const overlapWords = words.slice(-Math.floor(this.CHUNK_OVERLAP / 5));
        currentChunk = overlapWords.join(' ') + ' ' + sentence;
      } else {
        currentChunk += (currentChunk ? ' ' : '') + sentence;
      }
    }
    
    if (currentChunk.length >= this.MIN_CHUNK_SIZE) {
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

  private static splitIntoSentences(text: string): string[] {
    // Improved sentence splitting that handles edge cases
    return text
      .split(/(?<=[.!?])\s+(?=[A-Z])/)
      .filter(s => s.trim().length > 0)
      .map(s => s.trim());
  }

  private static extractSection(text: string): string | undefined {
    // Try to extract section headers
    const headerMatch = text.match(/^#{1,6}\s+(.+)$/m) || text.match(/^(\d+\.?\s+[A-Z][^.\n]+)/m);
    return headerMatch ? headerMatch[1].trim() : undefined;
  }

  // Enhanced storage with metadata
  static async storeDocumentEmbeddings(
    userId: string,
    fileId: string,
    fileName: string,
    content: string
  ): Promise<void> {
    try {
      // Check for existing embeddings
      const existingEmbeddings = await prisma.documentEmbedding.findMany({
        where: { fileId },
        select: { id: true }
      });

      if (existingEmbeddings.length > 0) {
        console.log(`Embeddings already exist for ${fileName}, skipping...`);
        return;
      }

      const chunks = this.splitTextIntoChunks(content, fileName);
      console.log(`Processing ${chunks.length} chunks for file: ${fileName}`);
      
      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        
        try {
          const embedding = await this.generateEmbedding(
            chunk.content, 
            { fileName, docType: chunk.metadata.docType }
          );
          
          await prisma.documentEmbedding.create({
            data: {
              fileId,
              fileName,
              content: chunk.content,
              embedding: embedding,
              chunkIndex: i,
              userId,
              metadata: chunk.metadata,
            },
          });
          
          console.log(`✅ Processed chunk ${i + 1}/${chunks.length} for ${fileName} (${chunk.metadata.wordCount} words)`);
        } catch (chunkError) {
          console.error(`❌ Error processing chunk ${i} for ${fileName}:`, chunkError);
        }
      }
    } catch (error) {
      console.error('Error storing document embeddings:', error);
      throw new Error(`Failed to store document embeddings: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Enhanced search with better ranking
  static async searchSimilarDocuments(
    userId: string,
    query: string,
    limit: number = 5
  ): Promise<SearchResult[]> {
    try {
      console.log(`🔍 Enhanced search for user ${userId} with query: "${query}"`);
      
      // Generate query embedding
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
          chunkIndex: true,
          metadata: true,
        },
      });

      if (embeddings.length === 0) {
        console.log('❌ No embeddings found for user');
        return [];
      }

      console.log(`Found ${embeddings.length} embeddings to search`);

      // Calculate similarities with enhanced scoring
      const similarities = embeddings.map((doc) => {
        try {
          const similarity = this.cosineSimilarity(queryEmbedding, doc.embedding as number[]);
          
          // Enhanced relevance scoring
          const relevanceScore = this.calculateRelevanceScore(query, doc.content, similarity, doc.metadata as any);
          
          return {
            content: doc.content,
            fileName: doc.fileName,
            fileId: doc.fileId,
            similarity,
            relevanceScore,
            chunkIndex: doc.chunkIndex,
            metadata: doc.metadata as any,
          } as SearchResult;
        } catch (error) {
          console.error(`Error calculating similarity for doc ${doc.id}:`, error);
          return null;
        }
      }).filter((result): result is SearchResult => result !== null);

      // Filter by relevance threshold and sort by relevance score
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

  // Enhanced relevance scoring
  private static calculateRelevanceScore(
    query: string, 
    content: string, 
    similarity: number, 
    metadata: any
  ): number {
    let score = similarity;
    
    // Boost score for exact keyword matches
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
    
    // Boost score for longer, more substantial chunks
    if (metadata?.wordCount > 100) {
      score += 0.1;
    }
    
    // Boost score for structured content (often more informative)
    if (metadata?.docType === 'structured') {
      score += 0.05;
    }
    
    return Math.min(score, 1.0); // Cap at 1.0
  }

  // Same cosine similarity function (this part was already good)
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

  // Enhanced file stats
  static async getUserIndexedFiles(userId: string): Promise<{
    fileId: string;
    fileName: string;
    chunkCount: number;
    lastUpdated: Date;
    totalWords: number;
    docType: string;
  }[]> {
    try {
      const result = await prisma.documentEmbedding.groupBy({
        by: ['fileId', 'fileName'],
        where: { userId },
        _count: { id: true },
        _max: { updatedAt: true },
      });

      // Get additional metadata for each file
      const enrichedResults = await Promise.all(
        result.map(async (item) => {
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
        })
      );

      return enrichedResults;
    } catch (error) {
      console.error('Error getting enhanced user indexed files:', error);
      throw new Error('Failed to get indexed files');
    }
  }

  // Check if embedding model is available (same as before)
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