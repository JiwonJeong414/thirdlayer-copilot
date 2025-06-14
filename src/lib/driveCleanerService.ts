// src/lib/driveCleanerService.ts
import { GoogleDriveService } from '@/lib/googleDrive';
import { VectorService } from '@/lib/vectorService';
import { PrismaClient } from '@/generated/prisma';

const prisma = new PrismaClient();

export interface CleanableFile {
  id: string;
  name: string;
  mimeType: string;
  size: number;
  modifiedTime: string;
  webViewLink?: string;
  thumbnailLink?: string;
  content?: string; // For LLM analysis
  category: 'empty' | 'tiny' | 'small' | 'duplicate' | 'old' | 'low_quality' | 'system';
  reason: string;
  confidence: 'low' | 'medium' | 'high'; // AI confidence in deletion recommendation
  aiSummary?: string;
  duplicateOf?: string;
  lastAccessed?: string;
  selected: boolean;
}

export interface CleanupRecommendation {
  action: 'keep' | 'delete' | 'review';
  confidence: number; // 0-1
  reasoning: string;
  tags: string[];
}

export class DriveCleanerService {
  private static EMPTY_FILE_THRESHOLD = 50; // bytes
  private static TINY_FILE_THRESHOLD = 2048; // 2KB
  private static SMALL_FILE_THRESHOLD = 10240; // 10KB
  private static OLD_FILE_THRESHOLD = 365 * 24 * 60 * 60 * 1000; // 1 year in ms
  private static MAX_CONTENT_LENGTH = 2000; // chars for LLM analysis

  constructor(private driveService: GoogleDriveService) {}

  // ===================================================================
  // CORE SCANNING LOGIC - Separate from indexing
  // ===================================================================
  
  async scanForCleanableFiles(
    userId: string, 
    options: {
      maxFiles?: number;
      includeContent?: boolean;
      enableAI?: boolean;
    } = {}
  ): Promise<CleanableFile[]> {
    const { maxFiles = 1000, includeContent = true, enableAI = true } = options;
    
    console.log('🧹 Starting Drive cleaner scan (separate from indexing)...');
    
    const cleanableFiles: CleanableFile[] = [];
    let nextPageToken: string | undefined;
    let totalScanned = 0;

    // Get existing indexed files to avoid conflicts
    const indexedFiles = await this.getIndexedFileIds(userId);
    console.log(`📚 Found ${indexedFiles.size} already indexed files to preserve`);

    // Get user's drive connection
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { driveConnection: true },
    });

    if (!user?.driveConnection) {
      throw new Error('Drive connection not found');
    }

    do {
      const files = await this.driveService.listFiles({
        userId,
        id: user.driveConnection.id,
        accessToken: user.driveConnection.accessToken,
        refreshToken: user.driveConnection.refreshToken,
        isConnected: user.driveConnection.isConnected,
        connectedAt: user.driveConnection.connectedAt,
        lastSyncAt: user.driveConnection.lastSyncAt
      });
      totalScanned += files.length;

      for (const file of files) {
        if (!file.id || !file.name || !file.mimeType) continue;
        
        const fileSize = file.size ? parseInt(file.size) : 0;
        const fileAge = Date.now() - new Date(file.modifiedTime || new Date()).getTime();
        
        // Basic categorization (non-AI)
        const basicCategory = this.categorizeFileBasic(file, fileSize, fileAge);
        
        if (basicCategory) {
          let content: string | undefined;
          let aiSummary: string | undefined;
          
          // Get content for AI analysis if requested
          if (includeContent && this.shouldAnalyzeContent(file.mimeType, fileSize)) {
            try {
              content = await this.driveService.getFileContent(file.id);
              if (content && content.length > DriveCleanerService.MAX_CONTENT_LENGTH) {
                content = content.substring(0, DriveCleanerService.MAX_CONTENT_LENGTH) + '...';
              }
            } catch (error) {
              console.log(`⚠️ Could not get content for ${file.name}: ${error}`);
            }
          }

          const cleanableFile: CleanableFile = {
            id: file.id,
            name: file.name,
            mimeType: file.mimeType,
            size: fileSize,
            modifiedTime: file.modifiedTime || new Date().toISOString(),
            webViewLink: file.webViewLink || undefined,
            content,
            category: basicCategory.category,
            reason: basicCategory.reason,
            confidence: basicCategory.confidence,
            selected: false,
          };

          // Add AI analysis if enabled and content available
          if (enableAI && content) {
            try {
              const aiRecommendation = await this.getAIRecommendation(cleanableFile);
              cleanableFile.confidence = this.combineConfidence(
                basicCategory.confidence, 
                aiRecommendation.confidence
              );
              cleanableFile.aiSummary = aiRecommendation.reasoning;
              
              // Update category based on AI analysis
              if (aiRecommendation.action === 'delete' && aiRecommendation.confidence > 0.8) {
                cleanableFile.category = this.getAICategory(aiRecommendation.tags);
              }
            } catch (error) {
              console.log(`🤖 AI analysis failed for ${file.name}: ${error}`);
            }
          }

          cleanableFiles.push(cleanableFile);
        }

        if (cleanableFiles.length >= maxFiles) break;
      }

      if (totalScanned >= maxFiles * 2) break; // Safety limit
      
    } while (cleanableFiles.length < maxFiles);

    // Find duplicates (separate operation)
    if (enableAI) {
      await this.findDuplicates(cleanableFiles);
    }

    console.log(`✅ Cleaner scan complete: ${cleanableFiles.length} cleanable files found`);
    return cleanableFiles.sort((a, b) => this.getSortScore(b) - this.getSortScore(a));
  }

  // ===================================================================
  // BASIC CATEGORIZATION - Rule-based, fast
  // ===================================================================
  
  private categorizeFileBasic(
    file: any, 
    fileSize: number, 
    fileAge: number
  ): { category: CleanableFile['category']; reason: string; confidence: 'low' | 'medium' | 'high' } | null {
    
    // System files - high confidence
    if (this.isSystemFile(file.name)) {
      return {
        category: 'system',
        reason: 'System file (safe to delete)',
        confidence: 'high'
      };
    }

    // Empty files - high confidence
    if (fileSize === 0) {
      return {
        category: 'empty',
        reason: 'Empty file (0 bytes)',
        confidence: 'high'
      };
    }

    if (fileSize <= DriveCleanerService.EMPTY_FILE_THRESHOLD) {
      return {
        category: 'empty',
        reason: `Nearly empty (${fileSize} bytes)`,
        confidence: 'high'
      };
    }

    // Tiny files - medium confidence
    if (fileSize <= DriveCleanerService.TINY_FILE_THRESHOLD) {
      return {
        category: 'tiny',
        reason: `Very small file (${this.formatFileSize(fileSize)})`,
        confidence: 'medium'
      };
    }

    // Small files - lower confidence, needs AI
    if (fileSize <= DriveCleanerService.SMALL_FILE_THRESHOLD) {
      return {
        category: 'small',
        reason: `Small file (${this.formatFileSize(fileSize)}) - needs review`,
        confidence: 'low'
      };
    }

    // Old files - very low confidence, definitely needs AI
    if (fileAge > DriveCleanerService.OLD_FILE_THRESHOLD) {
      return {
        category: 'old',
        reason: `Old file (${Math.floor(fileAge / (365 * 24 * 60 * 60 * 1000))} years old)`,
        confidence: 'low'
      };
    }

    // Potential duplicates based on name
    if (this.isPotentialDuplicate(file.name)) {
      return {
        category: 'duplicate',
        reason: 'Potential duplicate based on filename',
        confidence: 'medium'
      };
    }

    return null; // File doesn't meet basic cleanup criteria
  }

  // ===================================================================
  // AI-POWERED ANALYSIS - Content understanding
  // ===================================================================
  
  private async getAIRecommendation(file: CleanableFile): Promise<CleanupRecommendation> {
    if (!file.content) {
      return {
        action: 'review',
        confidence: 0.3,
        reasoning: 'No content available for analysis',
        tags: ['no-content']
      };
    }

    try {
      const prompt = this.buildAnalysisPrompt(file);
      
      const response = await fetch(`${process.env.OLLAMA_ENDPOINT}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'llama3.2:1b', // Use fast model for analysis
          prompt,
          stream: false,
          options: {
            temperature: 0.1, // Low temperature for consistent analysis
            num_predict: 200,
          }
        }),
      });

      if (!response.ok) throw new Error('AI analysis failed');

      const data = await response.json();
      return this.parseAIResponse(data.response);
      
    } catch (error) {
      console.error('AI recommendation failed:', error);
      return {
        action: 'review',
        confidence: 0.2,
        reasoning: 'AI analysis unavailable',
        tags: ['ai-error']
      };
    }
  }

  private buildAnalysisPrompt(file: CleanableFile): string {
    return `Analyze this file for cleanup recommendation:

Filename: ${file.name}
Size: ${this.formatFileSize(file.size)}
Type: ${file.mimeType}
Age: ${this.getFileAge(file.modifiedTime)}
Content preview: ${file.content?.substring(0, 500)}

Task: Determine if this file should be KEPT, DELETED, or needs REVIEW.

Consider:
- Is the content meaningful/useful?
- Is it a template, draft, or test file?
- Does it contain sensitive/important information?
- Is the quality poor (corrupted, blank, incomplete)?
- Could it be a duplicate or old version?

Respond in this format:
ACTION: [KEEP|DELETE|REVIEW]
CONFIDENCE: [0.0-1.0]
REASONING: [brief explanation]
TAGS: [comma-separated tags like: empty, template, important, personal, work, etc.]`;
  }

  private parseAIResponse(response: string): CleanupRecommendation {
    try {
      const lines = response.split('\n');
      let action: 'keep' | 'delete' | 'review' = 'review';
      let confidence = 0.5;
      let reasoning = 'AI analysis completed';
      let tags: string[] = [];

      for (const line of lines) {
        const [key, ...valueParts] = line.split(':');
        const value = valueParts.join(':').trim();

        switch (key.trim().toUpperCase()) {
          case 'ACTION':
            action = value.toLowerCase() as 'keep' | 'delete' | 'review';
            break;
          case 'CONFIDENCE':
            confidence = Math.max(0, Math.min(1, parseFloat(value) || 0.5));
            break;
          case 'REASONING':
            reasoning = value;
            break;
          case 'TAGS':
            tags = value.split(',').map(t => t.trim().toLowerCase()).filter(Boolean);
            break;
        }
      }

      return { action, confidence, reasoning, tags };
    } catch (error) {
      return {
        action: 'review',
        confidence: 0.3,
        reasoning: 'Failed to parse AI response',
        tags: ['parse-error']
      };
    }
  }

  // ===================================================================
  // DUPLICATE DETECTION - Vector similarity
  // ===================================================================
  
  private async findDuplicates(files: CleanableFile[]): Promise<void> {
    console.log('🔍 Finding duplicates using content similarity...');
    
    const filesWithContent = files.filter(f => f.content && f.content.length > 100);
    
    for (let i = 0; i < filesWithContent.length; i++) {
      const fileA = filesWithContent[i];
      
      for (let j = i + 1; j < filesWithContent.length; j++) {
        const fileB = filesWithContent[j];
        
        // Skip if already marked as duplicate
        if (fileA.category === 'duplicate' || fileB.category === 'duplicate') continue;
        
        try {
          const similarity = await this.calculateContentSimilarity(fileA.content!, fileB.content!);
          
          if (similarity > 0.85) { // High similarity threshold
            // Mark the newer/larger file as potential duplicate
            const isDuplicateA = this.shouldMarkAsDuplicate(fileA, fileB);
            const duplicateFile = isDuplicateA ? fileA : fileB;
            const originalFile = isDuplicateA ? fileB : fileA;
            
            duplicateFile.category = 'duplicate';
            duplicateFile.reason = `${(similarity * 100).toFixed(1)}% similar to "${originalFile.name}"`;
            duplicateFile.confidence = similarity > 0.95 ? 'high' : 'medium';
            duplicateFile.duplicateOf = originalFile.id;
          }
        } catch (error) {
          console.log(`Error comparing ${fileA.name} and ${fileB.name}:`, error);
        }
      }
    }
  }

  private async calculateContentSimilarity(contentA: string, contentB: string): Promise<number> {
    try {
      // Use vector embeddings for semantic similarity
      const embeddingA = await VectorService.generateEmbedding(contentA.substring(0, 1000));
      const embeddingB = await VectorService.generateEmbedding(contentB.substring(0, 1000));
      
      return VectorService.cosineSimilarity(embeddingA, embeddingB);
    } catch (error) {
      // Fallback to simple text similarity
      return this.simpleTextSimilarity(contentA, contentB);
    }
  }

  // ===================================================================
  // BATCH OPERATIONS - Smart suggestions
  // ===================================================================
  
  async getBatchCleanupSuggestion(files: CleanableFile[]): Promise<{
    autoDelete: CleanableFile[];
    review: CleanableFile[];
    keep: CleanableFile[];
    summary: string;
  }> {
    const autoDelete = files.filter(f => 
      f.confidence === 'high' && 
      ['empty', 'system', 'duplicate'].includes(f.category)
    );
    
    const review = files.filter(f => 
      f.confidence === 'medium' || 
      ['small', 'old'].includes(f.category)
    );
    
    const keep = files.filter(f => 
      !autoDelete.includes(f) && !review.includes(f)
    );

    const totalSize = autoDelete.reduce((sum, f) => sum + f.size, 0);
    
    const summary = `Found ${files.length} cleanable files:
• ${autoDelete.length} safe to auto-delete (${this.formatFileSize(totalSize)} freed)
• ${review.length} need your review
• ${keep.length} recommended to keep`;

    return { autoDelete, review, keep, summary };
  }

  // ===================================================================
  // HELPER METHODS
  // ===================================================================
  
  private async getIndexedFileIds(userId: string): Promise<Set<string>> {
    const indexed = await prisma.documentEmbedding.findMany({
      where: { userId },
      select: { fileId: true },
      distinct: ['fileId']
    });
    return new Set(indexed.map(doc => doc.fileId));
  }

  private shouldAnalyzeContent(mimeType: string, size: number): boolean {
    const analyzableTypes = [
      'application/vnd.google-apps.document',
      'application/vnd.google-apps.spreadsheet',
      'application/vnd.google-apps.presentation',
      'text/plain',
      'application/pdf'
    ];
    
    return analyzableTypes.includes(mimeType) && size < 1024 * 1024; // Max 1MB
  }

  private isSystemFile(filename: string): boolean {
    const systemFiles = [
      '.DS_Store', 'Thumbs.db', '.gitignore', '.htaccess',
      'desktop.ini', '.directory', '._*'
    ];
    
    return systemFiles.some(pattern => {
      if (pattern.includes('*')) {
        return filename.startsWith(pattern.replace('*', ''));
      }
      return filename === pattern;
    });
  }

  private isPotentialDuplicate(filename: string): boolean {
    const duplicatePatterns = [
      / - Copy/, / \(1\)/, / \(2\)/, /_copy/, /_backup/, 
      /copy of /i, /backup/i, / - version/i
    ];
    
    return duplicatePatterns.some(pattern => pattern.test(filename));
  }

  private shouldMarkAsDuplicate(fileA: CleanableFile, fileB: CleanableFile): boolean {
    // Mark the newer file as duplicate (keep older original)
    const dateA = new Date(fileA.modifiedTime);
    const dateB = new Date(fileB.modifiedTime);
    
    if (dateA.getTime() !== dateB.getTime()) {
      return dateA > dateB;
    }
    
    // If same date, mark smaller file as duplicate
    return fileA.size < fileB.size;
  }

  private combineConfidence(basic: string, ai: number): 'low' | 'medium' | 'high' {
    const basicScore = basic === 'high' ? 0.8 : basic === 'medium' ? 0.5 : 0.2;
    const combined = (basicScore + ai) / 2;
    
    if (combined > 0.7) return 'high';
    if (combined > 0.4) return 'medium';
    return 'low';
  }

  private getAICategory(tags: string[]): CleanableFile['category'] {
    if (tags.includes('empty') || tags.includes('blank')) return 'empty';
    if (tags.includes('template') || tags.includes('test')) return 'low_quality';
    if (tags.includes('duplicate') || tags.includes('copy')) return 'duplicate';
    return 'small';
  }

  private getSortScore(file: CleanableFile): number {
    let score = 0;
    
    // Confidence boost
    if (file.confidence === 'high') score += 30;
    else if (file.confidence === 'medium') score += 20;
    else score += 10;
    
    // Category boost
    const categoryScores = {
      'system': 25, 'empty': 20, 'duplicate': 15, 
      'tiny': 10, 'low_quality': 8, 'small': 5, 'old': 3
    };
    score += categoryScores[file.category] || 0;
    
    // Size factor (larger files more important to clean)
    score += Math.min(file.size / 1024, 10); // Cap at 10KB
    
    return score;
  }

  private simpleTextSimilarity(a: string, b: string): number {
    const wordsA = new Set(a.toLowerCase().split(/\s+/));
    const wordsB = new Set(b.toLowerCase().split(/\s+/));
    const intersection = new Set([...wordsA].filter(x => wordsB.has(x)));
    const union = new Set([...wordsA, ...wordsB]);
    
    return intersection.size / union.size;
  }

  private formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 B';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  private getFileAge(modifiedTime: string): string {
    const age = Date.now() - new Date(modifiedTime).getTime();
    const days = Math.floor(age / (24 * 60 * 60 * 1000));
    
    if (days < 1) return 'Today';
    if (days < 7) return `${days} days ago`;
    if (days < 30) return `${Math.floor(days / 7)} weeks ago`;
    if (days < 365) return `${Math.floor(days / 30)} months ago`;
    return `${Math.floor(days / 365)} years ago`;
  }
}