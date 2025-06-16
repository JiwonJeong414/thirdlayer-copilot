import { google, drive_v3 } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import { PrismaClient } from '@/generated/prisma';

const prisma = new PrismaClient();

export interface DriveCredentials {
  access_token: string;
  refresh_token?: string;
  expiry_date?: number;
}

export interface DriveConnectionStatus {
  isConnected: boolean;
  connectedAt?: Date;
  lastSyncAt?: Date;
  indexedFiles: number;
}

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
    const file = await this.drive.files.get({
      fileId,
      fields: 'mimeType, name, capabilities'
    });

    const mimeType = file.data.mimeType!;
    const fileName = file.data.name || 'Unknown';

    switch (mimeType) {
      case 'application/vnd.google-apps.document':
        return this.exportAsText(fileId);
      case 'application/vnd.google-apps.spreadsheet':
        return this.exportAsCSV(fileId);
      case 'application/vnd.google-apps.presentation':
        return this.exportAsText(fileId);
      case 'text/plain':
        return this.getPlainText(fileId);
      default:
        throw new Error(`Unsupported file type: ${mimeType}`);
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
  // PRIVATE HELPERS
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
} 