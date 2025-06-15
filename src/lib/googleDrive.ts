// src/lib/googleDrive.ts - FIXED VERSION
import { GoogleAuth, OAuth2Client } from 'google-auth-library';
import { drive_v3, google } from 'googleapis';

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

export class GoogleDriveService {
  private oauth2Client: OAuth2Client;
  private drive: drive_v3.Drive;
  private credentials: DriveCredentials;

  constructor(credentials: DriveCredentials) {
    this.credentials = credentials;
    this.oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    );
    
    // Set the credentials with the access token
    this.oauth2Client.setCredentials({
      access_token: credentials.access_token,
      refresh_token: credentials.refresh_token,
    });

    // Create the Drive client with the OAuth2 client
    this.drive = google.drive({ 
      version: 'v3', 
      auth: this.oauth2Client 
    });

    // Log the token status
    console.log('GoogleDriveService initialized with:', {
      hasAccessToken: !!credentials.access_token,
      hasRefreshToken: !!credentials.refresh_token,
      clientId: !!process.env.GOOGLE_CLIENT_ID,
      clientSecret: !!process.env.GOOGLE_CLIENT_SECRET,
      redirectUri: !!process.env.GOOGLE_REDIRECT_URI,
    });
  }

  // Helper method to handle token refresh
  private async ensureValidToken(): Promise<void> {
    try {
      // Check if token is expired or about to expire (within 5 minutes)
      const expiryDate = this.credentials.expiry_date;
      const now = Date.now();
      const fiveMinutes = 5 * 60 * 1000;

      if (expiryDate && now + fiveMinutes >= expiryDate) {
        console.log('🔑 Access token expired or about to expire, refreshing...');
        
        if (!this.credentials.refresh_token) {
          throw new Error('No refresh token available');
        }

        // Refresh the token
        const { credentials } = await this.oauth2Client.refreshAccessToken();
        
        // Update the stored credentials
        this.credentials = {
          ...this.credentials,
          access_token: credentials.access_token || this.credentials.access_token,
          expiry_date: credentials.expiry_date || this.credentials.expiry_date,
        };

        // Update the OAuth2 client with new credentials
        this.oauth2Client.setCredentials(this.credentials);
        
        console.log('✅ Token refreshed successfully');
      }
    } catch (error) {
      console.error('❌ Failed to refresh token:', error);
      throw new Error('Failed to refresh access token. Please reconnect your Drive account.');
    }
  }

  getDriveClient(): drive_v3.Drive {
    return this.drive;
  }

  async listFiles(connection: DriveConnection): Promise<drive_v3.Schema$File[]> {
    await this.ensureValidToken();

    const files: drive_v3.Schema$File[] = [];
    let pageToken: string | undefined;

    do {
      const response = await this.drive.files.list({
        pageSize: 1000,
        pageToken,
        fields: 'nextPageToken, files(id, name, mimeType, size, modifiedTime, webViewLink)',
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
      await this.ensureValidToken();
      
      console.log(`Getting content for file ${fileId}...`);
      
      // First check if we have permission to access the file
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

      // Check if we have permission to export/read the file
      const capabilities = file.data.capabilities as { canRead?: boolean; canCopy?: boolean };
      if (!capabilities?.canRead) {
        throw new Error(`No permission to read file: ${fileName}`);
      }

      if (mimeType === 'application/vnd.google-apps.document') {
        // Check if we have permission to export
        if (!capabilities?.canCopy) {
          throw new Error(`No permission to export Google Doc: ${fileName}`);
        }

        // Export Google Docs as plain text
        console.log(`📄 Exporting Google Doc: ${fileName}`);
        try {
          const response = await this.drive.files.export({
            fileId,
            mimeType: 'text/plain',
          });
          const content = response.data as string;
          console.log(`✅ Extracted ${content.length} characters from ${fileName}`);
          return content;
        } catch (exportError) {
          console.error(`Failed to export Google Doc ${fileName}:`, exportError);
          throw new Error(`Cannot export Google Doc: ${fileName}. You may need to request edit access.`);
        }
      } else if (mimeType === 'text/plain') {
        // Get plain text files directly
        console.log(`📄 Reading text file: ${fileName}`);
        const response = await this.drive.files.get({
          fileId,
          alt: 'media',
        });
        const content = response.data as string;
        console.log(`✅ Read ${content.length} characters from ${fileName}`);
        return content;
      } else if (mimeType === 'application/vnd.google-apps.spreadsheet') {
        // Check if we have permission to export
        if (!capabilities?.canCopy) {
          throw new Error(`No permission to export Google Sheet: ${fileName}`);
        }

        // Export Google Sheets as CSV
        console.log(`📊 Exporting Google Sheet: ${fileName}`);
        try {
          const response = await this.drive.files.export({
            fileId,
            mimeType: 'text/csv',
          });
          const content = response.data as string;
          console.log(`✅ Extracted ${content.length} characters from ${fileName}`);
          return content;
        } catch (exportError) {
          console.error(`Failed to export Google Sheet ${fileName}:`, exportError);
          throw new Error(`Cannot export Google Sheet: ${fileName}. You may need to request edit access.`);
        }
      } else if (mimeType === 'application/vnd.google-apps.presentation') {
        // Check if we have permission to export
        if (!capabilities?.canCopy) {
          throw new Error(`No permission to export Google Slides: ${fileName}`);
        }

        // Export Google Slides as plain text
        console.log(`📽️ Exporting Google Slides: ${fileName}`);
        try {
          const response = await this.drive.files.export({
            fileId,
            mimeType: 'text/plain',
          });
          const content = response.data as string;
          console.log(`✅ Extracted ${content.length} characters from ${fileName}`);
          return content;
        } catch (exportError) {
          console.error(`Failed to export Google Slides ${fileName}:`, exportError);
          throw new Error(`Cannot export Google Slides: ${fileName}. You may need to request edit access.`);
        }
      } else {
        console.log(`⏭️ Skipping unsupported file type: ${fileName} (${mimeType})`);
        throw new Error(`Unsupported file type: ${mimeType}`);
      }
    } catch (error) {
      console.error(`❌ Error getting file content for ${fileId}:`, error);
      if (error instanceof Error) {
        if (error.message.includes('invalid_grant')) {
          throw new Error('Drive access token expired. Please reconnect your Drive account.');
        }
        if (error.message.includes('insufficient permission')) {
          throw new Error('Insufficient permissions to access Drive. Please check your Google Drive permissions.');
        }
        if (error.message.includes('No permission to')) {
          throw error; // Re-throw permission errors with their specific messages
        }
        if (error.message.includes('Unsupported file type')) {
          throw error; // Re-throw unsupported file type errors
        }
      }
      throw new Error('Failed to get file content');
    }
  }

  async searchFiles(query: string): Promise<DriveFile[]> {
    try {
      await this.ensureValidToken();

      const response = await this.drive.files.list({
        q: `fullText contains '${query}' and trashed=false`,
        fields: 'files(id, name, mimeType, modifiedTime, size, parents, webViewLink)',
        pageSize: 50,
      });

      return response.data.files as DriveFile[] || [];
    } catch (error) {
      console.error('Error searching Drive files:', error);
      throw new Error('Failed to search Drive files');
    }
  }
}