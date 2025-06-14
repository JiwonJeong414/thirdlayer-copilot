import { drive_v3 } from 'googleapis';

export interface CleanableFile extends drive_v3.Schema$File {
  category?: string;
  reason?: string;
  confidence?: number;
  aiSummary?: string;
}

export class DriveCleanerService {
  async analyzeFiles(files: drive_v3.Schema$File[]): Promise<CleanableFile[]> {
    const suggestions: CleanableFile[] = [];

    for (const file of files) {
      const suggestion = await this.analyzeFile(file);
      if (suggestion) {
        suggestions.push(suggestion);
      }
    }

    return suggestions;
  }

  private async analyzeFile(file: drive_v3.Schema$File): Promise<CleanableFile | null> {
    // Basic file analysis logic
    const suggestion: CleanableFile = { ...file };

    // Check file size
    if (file.size && typeof file.size === 'string' && parseInt(file.size) > 100 * 1024 * 1024) { // 100MB
      suggestion.category = 'large_files';
      suggestion.reason = 'File is larger than 100MB';
      suggestion.confidence = 0.8;
    }

    // Check file type
    if (file.mimeType) {
      if (file.mimeType.includes('image/')) {
        suggestion.category = 'images';
        suggestion.reason = 'Image file';
        suggestion.confidence = 0.9;
      } else if (file.mimeType.includes('video/')) {
        suggestion.category = 'videos';
        suggestion.reason = 'Video file';
        suggestion.confidence = 0.9;
      } else if (file.mimeType.includes('application/pdf')) {
        suggestion.category = 'documents';
        suggestion.reason = 'PDF document';
        suggestion.confidence = 0.9;
      }
    }

    // Check last modified date
    if (file.modifiedTime) {
      const modifiedDate = new Date(file.modifiedTime);
      const now = new Date();
      const monthsSinceModified = (now.getTime() - modifiedDate.getTime()) / (1000 * 60 * 60 * 24 * 30);
      
      if (monthsSinceModified > 12) {
        suggestion.category = 'old_files';
        suggestion.reason = `File hasn't been modified in ${Math.floor(monthsSinceModified)} months`;
        suggestion.confidence = 0.7;
      }
    }

    return suggestion;
  }
} 