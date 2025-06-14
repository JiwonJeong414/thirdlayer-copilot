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

  constructor(credentials: DriveCredentials) {
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

  async listFiles(connection: DriveConnection): Promise<drive_v3.Schema$File[]> {
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    );

    oauth2Client.setCredentials({
      access_token: connection.accessToken,
      refresh_token: connection.refreshToken,
    });

    const drive = google.drive({ version: 'v3', auth: oauth2Client });
    const files: drive_v3.Schema$File[] = [];
    let pageToken: string | undefined;

    do {
      const response = await drive.files.list({
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
      console.log(`Getting content for file ${fileId}...`);
      const file = await this.drive.files.get({
        fileId,
        fields: 'mimeType, name'
      });

      if (!file.data.mimeType) {
        throw new Error('Could not determine file type');
      }

      const mimeType = file.data.mimeType;
      const fileName = file.data.name || 'Unknown';
      console.log(`Processing file: ${fileName} (${mimeType})`);

      if (mimeType === 'application/vnd.google-apps.document') {
        // Export Google Docs as plain text
        console.log(`📄 Exporting Google Doc: ${fileName}`);
        const response = await this.drive.files.export({
          fileId,
          mimeType: 'text/plain',
        });
        const content = response.data as string;
        console.log(`✅ Extracted ${content.length} characters from ${fileName}`);
        return content;
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
        // Export Google Sheets as CSV
        console.log(`📊 Exporting Google Sheet: ${fileName}`);
        const response = await this.drive.files.export({
          fileId,
          mimeType: 'text/csv',
        });
        const content = response.data as string;
        console.log(`✅ Extracted ${content.length} characters from ${fileName}`);
        return content;
      } else if (mimeType === 'application/vnd.google-apps.presentation') {
        // Export Google Slides as plain text
        console.log(`📽️ Exporting Google Slides: ${fileName}`);
        const response = await this.drive.files.export({
          fileId,
          mimeType: 'text/plain',
        });
        const content = response.data as string;
        console.log(`✅ Extracted ${content.length} characters from ${fileName}`);
        return content;
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
        if (error.message.includes('Unsupported file type')) {
          throw error; // Re-throw unsupported file type errors
        }
      }
      throw new Error('Failed to get file content');
    }
  }

  async searchFiles(query: string): Promise<DriveFile[]> {
    try {
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