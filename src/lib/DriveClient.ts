import { google, drive_v3 } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';

export interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  modifiedTime: string;
  size?: string;
  parents?: string[];
  webViewLink?: string;
}

export interface DriveCredentials {
  access_token: string;
  refresh_token?: string;
  expiry_date?: number;
}

export interface DriveConnection {
  userId: string;
  id: string;
  accessToken: string;
  refreshToken: string | null;
  isConnected: boolean;
  connectedAt: Date;
  lastSyncAt: Date | null;
}

export class DriveClient {
  private static instance: DriveClient;
  private oauth2Client: OAuth2Client;
  private drive: drive_v3.Drive;
  private credentials: DriveCredentials | null = null;

  private constructor() {
    this.oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    );
    
    this.drive = google.drive({ version: 'v3', auth: this.oauth2Client });
  }

  static getInstance(): DriveClient {
    if (!DriveClient.instance) {
      DriveClient.instance = new DriveClient();
    }
    return DriveClient.instance;
  }

  // Auth methods
  getAuthUrl(state: string): string {
    const scopes = [
      'https://www.googleapis.com/auth/drive',
    ];

    return this.oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: scopes,
      prompt: 'consent',
      state: state,
      include_granted_scopes: true
    });
  }

  async exchangeCodeForTokens(code: string): Promise<DriveCredentials> {
    const { tokens } = await this.oauth2Client.getToken(code);
    return tokens as DriveCredentials;
  }

  async authenticate(credentials: DriveCredentials): Promise<void> {
    this.credentials = credentials;
    this.oauth2Client.setCredentials(credentials);
    
    // Auto-refresh tokens
    this.oauth2Client.on('tokens', (tokens) => {
      console.log('Tokens refreshed:', tokens);
      if (this.credentials && tokens.access_token) {
        this.credentials = {
          ...this.credentials,
          access_token: tokens.access_token,
          expiry_date: tokens.expiry_date || this.credentials.expiry_date,
        };
      }
      // TODO: Update database with new tokens
    });
  }

  // Helper method to handle token refresh
  private async ensureValidToken(): Promise<void> {
    if (!this.credentials) {
      throw new Error('No credentials set. Please authenticate first.');
    }

    try {
      const expiryDate = this.credentials.expiry_date;
      const now = Date.now();
      const fiveMinutes = 5 * 60 * 1000;

      if (expiryDate && now + fiveMinutes >= expiryDate) {
        console.log('🔑 Access token expired or about to expire, refreshing...');
        
        if (!this.credentials.refresh_token) {
          throw new Error('No refresh token available');
        }

        const { credentials } = await this.oauth2Client.refreshAccessToken();
        
        this.credentials = {
          ...this.credentials,
          access_token: credentials.access_token || this.credentials.access_token,
          expiry_date: credentials.expiry_date || this.credentials.expiry_date,
        };

        this.oauth2Client.setCredentials(this.credentials);
        console.log('✅ Token refreshed successfully');
      }
    } catch (error) {
      console.error('❌ Failed to refresh token:', error);
      throw new Error('Failed to refresh access token. Please reconnect your Drive account.');
    }
  }

  // Drive API methods
  getDriveAPI(): drive_v3.Drive {
    return this.drive;
  }

  async listFiles(options: drive_v3.Params$Resource$Files$List = {}): Promise<drive_v3.Schema$File[]> {
    await this.ensureValidToken();

    const files: drive_v3.Schema$File[] = [];
    let pageToken: string | undefined;

    do {
      const response = await this.drive.files.list({
        pageSize: 1000,
        pageToken,
        fields: 'nextPageToken, files(id, name, mimeType, size, modifiedTime, webViewLink, parents)',
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
    await this.ensureValidToken();
    
    console.log(`Getting content for file ${fileId}...`);
    
    const file = await this.drive.files.get({
      fileId,
      fields: 'mimeType, name, capabilities'
    });

    if (!file.data.mimeType) {
      throw new Error('Could not determine file type');
    }

    const mimeType = file.data.mimeType;
    const fileName = file.data.name || 'Unknown';
    console.log(`Processing file: ${fileName} (${mimeType})`);

    const capabilities = file.data.capabilities as { canRead?: boolean; canCopy?: boolean };
    if (!capabilities?.canRead) {
      throw new Error(`No permission to read file: ${fileName}`);
    }

    switch (mimeType) {
      case 'application/vnd.google-apps.document':
        if (!capabilities?.canCopy) {
          throw new Error(`No permission to export Google Doc: ${fileName}`);
        }
        return this.exportAsText(fileId, fileName);
        
      case 'application/vnd.google-apps.spreadsheet':
        if (!capabilities?.canCopy) {
          throw new Error(`No permission to export Google Sheet: ${fileName}`);
        }
        return this.exportAsCSV(fileId, fileName);
        
      case 'application/vnd.google-apps.presentation':
        if (!capabilities?.canCopy) {
          throw new Error(`No permission to export Google Slides: ${fileName}`);
        }
        return this.exportAsText(fileId, fileName);
        
      case 'text/plain':
        return this.getPlainText(fileId, fileName);
        
      default:
        console.log(`⏭️ Skipping unsupported file type: ${fileName} (${mimeType})`);
        throw new Error(`Unsupported file type: ${mimeType}`);
    }
  }

  private async exportAsText(fileId: string, fileName: string): Promise<string> {
    try {
      const response = await this.drive.files.export({
        fileId,
        mimeType: 'text/plain',
      });
      const content = response.data as string;
      console.log(`✅ Extracted ${content.length} characters from ${fileName}`);
      return content;
    } catch (error) {
      console.error(`Failed to export ${fileName}:`, error);
      throw new Error(`Cannot export ${fileName}. You may need to request edit access.`);
    }
  }

  private async exportAsCSV(fileId: string, fileName: string): Promise<string> {
    try {
      const response = await this.drive.files.export({
        fileId,
        mimeType: 'text/csv',
      });
      const content = response.data as string;
      console.log(`✅ Extracted ${content.length} characters from ${fileName}`);
      return content;
    } catch (error) {
      console.error(`Failed to export ${fileName}:`, error);
      throw new Error(`Cannot export ${fileName}. You may need to request edit access.`);
    }
  }

  private async getPlainText(fileId: string, fileName: string): Promise<string> {
    const response = await this.drive.files.get({
      fileId,
      alt: 'media',
    });
    const content = response.data as string;
    console.log(`✅ Read ${content.length} characters from ${fileName}`);
    return content;
  }

  async searchFiles(query: string): Promise<DriveFile[]> {
    await this.ensureValidToken();
    
    const response = await this.drive.files.list({
      q: query,
      pageSize: 100,
      fields: 'files(id, name, mimeType, modifiedTime, size, webViewLink, parents)',
    });

    return response.data.files as DriveFile[] || [];
  }
} 