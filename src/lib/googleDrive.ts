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
      process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    );
    
    this.oauth2Client.setCredentials(credentials);
    this.drive = google.drive({ version: 'v3', auth: this.oauth2Client });
  }

  async listFiles(pageSize: number = 100, pageToken?: string): Promise<{
    files: DriveFile[];
    nextPageToken?: string;
  }> {
    try {
      const response = await this.drive.files.list({
        pageSize,
        pageToken,
        fields: 'nextPageToken, files(id, name, mimeType, modifiedTime, size, parents, webViewLink)',
        q: "trashed=false and (mimeType='application/pdf' or mimeType='application/vnd.google-apps.document' or mimeType='text/plain' or mimeType='application/vnd.openxmlformats-officedocument.wordprocessingml.document')",
      });

      return {
        files: response.data.files as DriveFile[] || [],
        nextPageToken: response.data.nextPageToken || undefined,
      };
    } catch (error) {
      console.error('Error listing Drive files:', error);
      throw new Error('Failed to list Drive files');
    }
  }

  async getFileContent(fileId: string): Promise<string> {
    try {
      const file = await this.drive.files.get({
        fileId,
        fields: 'mimeType'
      });

      const mimeType = file.data.mimeType;

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
        // For other file types, we'll need additional processing
        throw new Error(`Unsupported file type: ${mimeType}`);
      }
    } catch (error) {
      console.error(`Error getting file content for ${fileId}:`, error);
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