// src/lib/googleDrive.ts
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

  async listFiles(pageSize: number = 100, pageToken?: string): Promise<{
    files: DriveFile[];
    nextPageToken?: string;
  }> {
    try {
      console.log('Listing Drive files...');
      const response = await this.drive.files.list({
        pageSize,
        pageToken,
        fields: 'nextPageToken, files(id, name, mimeType, modifiedTime, size, parents, webViewLink)',
        q: "trashed=false",
      });

      if (!response.data) {
        throw new Error('No data received from Drive API');
      }

      console.log(`Found ${response.data.files?.length || 0} files`);
      return {
        files: response.data.files as DriveFile[] || [],
        nextPageToken: response.data.nextPageToken || undefined,
      };
    } catch (error) {
      console.error('Error listing Drive files:', error);
      if (error instanceof Error) {
        if (error.message.includes('invalid_grant')) {
          throw new Error('Drive access token expired. Please reconnect your Drive account.');
        }
        if (error.message.includes('insufficient permission')) {
          throw new Error('Insufficient permissions to access Drive. Please check your Google Drive permissions.');
        }
      }
      throw new Error('Failed to list Drive files');
    }
  }

  async getFileContent(fileId: string): Promise<string> {
    try {
      console.log(`Getting content for file ${fileId}...`);
      const file = await this.drive.files.get({
        fileId,
        fields: 'mimeType'
      });

      if (!file.data.mimeType) {
        throw new Error('Could not determine file type');
      }

      const mimeType = file.data.mimeType;
      console.log(`File type: ${mimeType}`);

      if (mimeType === 'application/vnd.google-apps.document') {
        // Export Google Docs as plain text
        const response = await this.drive.files.export({
          fileId,
          mimeType: 'text/plain',
        });
        return response.data as string;
      } else if (mimeType === 'text/plain') {
        // Get plain text files directly
        const response = await this.drive.files.get({
          fileId,
          alt: 'media',
        });
        return response.data as string;
      } else {
        throw new Error(`Unsupported file type: ${mimeType}`);
      }
    } catch (error) {
      console.error(`Error getting file content for ${fileId}:`, error);
      if (error instanceof Error) {
        if (error.message.includes('invalid_grant')) {
          throw new Error('Drive access token expired. Please reconnect your Drive account.');
        }
        if (error.message.includes('insufficient permission')) {
          throw new Error('Insufficient permissions to access Drive. Please check your Google Drive permissions.');
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