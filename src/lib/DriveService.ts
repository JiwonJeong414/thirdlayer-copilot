import { google, drive_v3 } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import { PrismaClient } from '@/generated/prisma';
import { DriveCredentials, DriveConnectionStatus } from '@/types';

const prisma = new PrismaClient();

/**
 * SINGLE source of truth for ALL Google Drive operations
 * Handles: Auth, File Operations, Connection Management
 */
export class DriveService {
  private static instance: DriveService;
  private oauth2Client: OAuth2Client;
  private drive: drive_v3.Drive;
  private currentUserId: string | null = null;

  private constructor() {
    this.oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    );
    this.drive = google.drive({ version: 'v3', auth: this.oauth2Client });
  }

  static getInstance(): DriveService {
    if (!DriveService.instance) {
      DriveService.instance = new DriveService();
    }
    return DriveService.instance;
  }

  // ===================================================================
  // AUTH METHODS - Single point for all auth logic
  // ===================================================================

  generateAuthUrl(state: string): string {
    const scopes = [
      'openid',
      'email',
      'profile',
      'https://www.googleapis.com/auth/drive'
    ];

    return this.oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: scopes,
      prompt: 'consent',
      state,
      include_granted_scopes: true
    });
  }

  async exchangeCodeForTokens(code: string): Promise<DriveCredentials> {
    const { tokens } = await this.oauth2Client.getToken(code);
    return tokens as DriveCredentials;
  }

  async authenticateUser(userId: string): Promise<void> {
    this.currentUserId = userId;
    
    const connection = await prisma.driveConnection.findUnique({
      where: { userId }
    });

    if (!connection?.isConnected) {
      throw new Error('Drive not connected for this user');
    }

    await this.setCredentials({
      access_token: connection.accessToken,
      refresh_token: connection.refreshToken || undefined
    });
  }

  private async setCredentials(credentials: DriveCredentials): Promise<void> {
    this.oauth2Client.setCredentials(credentials);
    
    // Auto-refresh tokens
    this.oauth2Client.on('tokens', (newTokens) => {
      this.updateStoredTokens(newTokens);
    });
  }

  private async updateStoredTokens(tokens: any): Promise<void> {
    if (!this.currentUserId) return;

    await prisma.driveConnection.update({
      where: { userId: this.currentUserId },
      data: {
        accessToken: tokens.access_token,
        updatedAt: new Date()
      }
    });
  }

  // ===================================================================
  // CONNECTION MANAGEMENT - Single point for connection state
  // ===================================================================

  async connectUser(userId: string, credentials: DriveCredentials): Promise<void> {
    await prisma.driveConnection.upsert({
      where: { userId },
      update: {
        accessToken: credentials.access_token,
        refreshToken: credentials.refresh_token,
        isConnected: true,
        connectedAt: new Date(),
        updatedAt: new Date()
      },
      create: {
        userId,
        accessToken: credentials.access_token,
        refreshToken: credentials.refresh_token,
        isConnected: true,
        connectedAt: new Date(),
        updatedAt: new Date()
      }
    });
  }

  async getConnectionStatus(userId: string): Promise<DriveConnectionStatus> {
    const connection = await prisma.driveConnection.findUnique({
      where: { userId }
    });

    if (!connection) {
      return { isConnected: false, indexedFiles: 0 };
    }

    const indexedCount = await prisma.documentEmbedding.groupBy({
      by: ['fileId'],
      where: { userId },
      _count: { fileId: true }
    });

    return {
      isConnected: connection.isConnected,
      connectedAt: connection.connectedAt || undefined,
      lastSyncAt: connection.lastSyncAt || undefined,
      indexedFiles: indexedCount.length
    };
  }

  async disconnectUser(userId: string): Promise<void> {
    await prisma.driveConnection.update({
      where: { userId },
      data: { isConnected: false, updatedAt: new Date() }
    });
  }

  // ===================================================================
  // FILE OPERATIONS - Single point for all file ops
  // ===================================================================

  async listFiles(options: drive_v3.Params$Resource$Files$List = {}): Promise<drive_v3.Schema$File[]> {
    const files: drive_v3.Schema$File[] = [];
    let pageToken: string | undefined;

    do {
      const response = await this.drive.files.list({
        pageSize: 1000,
        pageToken,
        fields: 'nextPageToken, files(id, name, mimeType, size, modifiedTime, webViewLink, parents, owners)',
        ...options
      });

      if (response.data.files) {
        files.push(...response.data.files);
      }
      pageToken = response.data.nextPageToken || undefined;
    } while (pageToken);

    return files;
  }

  async getFileContent(fileId: string): Promise<string> {
    try {
      const file = await this.drive.files.get({
        fileId,
        fields: 'mimeType, name, capabilities'
      });

      const mimeType = file.data.mimeType!;
      const fileName = file.data.name || 'Unknown';

      console.log(`📄 Processing ${fileName} (${mimeType})`);

      switch (mimeType) {
        case 'application/vnd.google-apps.document':
          console.log(`📄 Google Doc detected: ${fileName} - exporting as text...`);
          return this.exportAsText(fileId);
        case 'application/vnd.google-apps.spreadsheet':
          console.log(`📊 Google Sheet detected: ${fileName} - exporting as CSV...`);
          return this.exportAsCSV(fileId);
        case 'application/vnd.google-apps.presentation':
          console.log(`📽️ Google Slides detected: ${fileName} - exporting as text...`);
          return this.exportAsText(fileId);
        case 'text/plain':
          console.log(`📄 Plain text detected: ${fileName} - reading content...`);
          return this.getPlainText(fileId);
        case 'application/pdf':
          console.log(`📄 PDF detected: ${fileName} - extracting metadata...`);
          return this.extractPDFText(fileId, fileName);
        case 'application/msword':
        case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
          console.log(`📄 Word document detected: ${fileName} - extracting metadata...`);
          return this.extractDocumentText(fileId, fileName);
        case 'application/vnd.ms-excel':
        case 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet':
          console.log(`📊 Excel document detected: ${fileName} - extracting metadata...`);
          return this.extractSpreadsheetText(fileId, fileName);
        case 'application/vnd.ms-powerpoint':
        case 'application/vnd.openxmlformats-officedocument.presentationml.presentation':
          console.log(`📽️ PowerPoint detected: ${fileName} - extracting metadata...`);
          return this.extractPresentationText(fileId, fileName);
        default:
          console.log(`⚠️ Unsupported file type: ${fileName} (${mimeType}) - returning filename as content`);
          // Instead of throwing error, return basic file info
          return `File: ${fileName}\nType: ${mimeType}\nThis file type cannot be processed for content extraction.`;
      }
    } catch (error: any) {
      if (error.code === 404) {
        throw new Error(`File not found or no longer accessible: ${fileId}`);
      }
      console.error(`❌ Error processing file ${fileId}:`, error);
      // Return a fallback instead of throwing
      return `Error processing file: ${error.message || 'Unknown error'}`;
    }
  }

  async createFolder(name: string, parentId?: string): Promise<string> {
    const response = await this.drive.files.create({
      requestBody: {
        name,
        mimeType: 'application/vnd.google-apps.folder',
        parents: parentId ? [parentId] : []
      },
      fields: 'id'
    } as drive_v3.Params$Resource$Files$Create);
    return response.data.id!;
  }

  async createShortcut(targetFileId: string, folderId: string, name: string): Promise<void> {
    // Get target file type first
    const targetFile = await this.drive.files.get({
      fileId: targetFileId,
      fields: 'mimeType'
    });

    await this.drive.files.create({
      requestBody: {
        name,
        mimeType: 'application/vnd.google-apps.shortcut',
        parents: [folderId],
        shortcutDetails: {
          targetId: targetFileId,
          targetMimeType: targetFile.data.mimeType
        }
      }
    } as drive_v3.Params$Resource$Files$Create);
  }

  async deleteFile(fileId: string): Promise<void> {
    await this.drive.files.delete({ fileId });
  }

  async getFileInfo(fileId: string): Promise<{
    id: string;
    name: string;
    size: number;
    mimeType: string;
    ownedByMe: boolean;
    owners: Array<{ emailAddress: string; displayName: string }>;
  }> {
    const response = await this.drive.files.get({
      fileId,
      fields: 'id, name, size, mimeType, ownedByMe, owners'
    });

    return {
      id: response.data.id!,
      name: response.data.name!,
      size: Number(response.data.size) || 0,
      mimeType: response.data.mimeType!,
      ownedByMe: response.data.ownedByMe || false,
      owners: (response.data.owners || []).map(owner => ({
        emailAddress: owner.emailAddress || '',
        displayName: owner.displayName || ''
      }))
    };
  }

  // ===================================================================
  // PRIVATE HELPERS - Enhanced with more file type support
  // ===================================================================

  private async exportAsText(fileId: string): Promise<string> {
    const response = await this.drive.files.export({
      fileId,
      mimeType: 'text/plain'
    });
    return response.data as string;
  }

  private async exportAsCSV(fileId: string): Promise<string> {
    const response = await this.drive.files.export({
      fileId,
      mimeType: 'text/csv'
    });
    return response.data as string;
  }

  private async getPlainText(fileId: string): Promise<string> {
    const response = await this.drive.files.get({
      fileId,
      alt: 'media'
    });
    return response.data as string;
  }

  private async extractPDFText(fileId: string, fileName: string): Promise<string> {
    try {
      // For PDFs, we can't directly extract text through Google Drive API
      // But we can provide meaningful metadata and encourage manual processing
      console.log(`📄 PDF file: ${fileName} - providing metadata as content`);
      
      // Get file metadata
      const fileInfo = await this.drive.files.get({
        fileId,
        fields: 'name, size, modifiedTime, description, properties'
      });
      
      let content = `PDF Document: ${fileName}\n`;
      content += `File Size: ${fileInfo.data.size ? `${Math.round(parseInt(fileInfo.data.size) / 1024)} KB` : 'Unknown'}\n`;
      content += `Modified: ${fileInfo.data.modifiedTime ? new Date(fileInfo.data.modifiedTime).toLocaleDateString() : 'Unknown'}\n`;
      
      if (fileInfo.data.description) {
        content += `Description: ${fileInfo.data.description}\n`;
      }
      
      content += `\nNote: This is a PDF file. For full text extraction, consider using a dedicated PDF processing service.`;
      
      return content;
    } catch (error) {
      console.error(`❌ Error extracting PDF metadata for ${fileName}:`, error);
      return `PDF Document: ${fileName}\nError: Could not extract content from PDF file.`;
    }
  }

  private async extractDocumentText(fileId: string, fileName: string): Promise<string> {
    try {
      console.log(`📄 Attempting to extract Word document metadata: ${fileName}`);
      return this.getFileMetadataAsContent(fileId, fileName, 'Word Document');
    } catch (error) {
      console.log(`⚠️ Could not extract Word content, providing basic info for ${fileName}`);
      return `Word Document: ${fileName}\nError: Could not extract content or metadata.`;
    }
  }

  private async extractSpreadsheetText(fileId: string, fileName: string): Promise<string> {
    try {
      console.log(`📊 Attempting to extract Excel document metadata: ${fileName}`);
      return this.getFileMetadataAsContent(fileId, fileName, 'Excel Spreadsheet');
    } catch (error) {
      console.log(`⚠️ Could not extract Excel content, providing basic info for ${fileName}`);
      return `Excel Spreadsheet: ${fileName}\nError: Could not extract content or metadata.`;
    }
  }

  private async extractPresentationText(fileId: string, fileName: string): Promise<string> {
    try {
      console.log(`📽️ Attempting to extract PowerPoint metadata: ${fileName}`);
      return this.getFileMetadataAsContent(fileId, fileName, 'PowerPoint Presentation');
    } catch (error) {
      console.log(`⚠️ Could not extract PowerPoint content, providing basic info for ${fileName}`);
      return `PowerPoint Presentation: ${fileName}\nError: Could not extract content or metadata.`;
    }
  }

  private async getFileMetadataAsContent(fileId: string, fileName: string, fileType: string): Promise<string> {
    try {
      const fileInfo = await this.drive.files.get({
        fileId,
        fields: 'name, size, modifiedTime, description, properties, createdTime'
      });
      
      let content = `${fileType}: ${fileName}\n`;
      content += `File Size: ${fileInfo.data.size ? `${Math.round(parseInt(fileInfo.data.size) / 1024)} KB` : 'Unknown'}\n`;
      content += `Created: ${fileInfo.data.createdTime ? new Date(fileInfo.data.createdTime).toLocaleDateString() : 'Unknown'}\n`;
      content += `Modified: ${fileInfo.data.modifiedTime ? new Date(fileInfo.data.modifiedTime).toLocaleDateString() : 'Unknown'}\n`;
      
      if (fileInfo.data.description) {
        content += `Description: ${fileInfo.data.description}\n`;
      }
      
      // Add properties if they exist
      if (fileInfo.data.properties) {
        content += `Properties: ${JSON.stringify(fileInfo.data.properties)}\n`;
      }
      
      content += `\nNote: This file's content could not be directly extracted, but it can be found using filename and metadata searches.`;
      
      return content;
    } catch (error) {
      console.error(`❌ Error getting metadata for ${fileName}:`, error);
      return `${fileType}: ${fileName}\nError: Could not extract content or metadata.`;
    }
  }
}