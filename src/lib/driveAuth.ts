import { google } from 'googleapis';
import { randomBytes } from 'crypto';

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);

export const getDriveAuthUrl = (state: string) => {
  const scopes = [
    'https://www.googleapis.com/auth/drive.readonly',
    'https://www.googleapis.com/auth/drive.metadata.readonly'
  ];

  return oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: scopes,
    prompt: 'consent',
    state: state,
    include_granted_scopes: true
  });
};

export const exchangeCodeForTokens = async (code: string) => {
  const { tokens } = await oauth2Client.getToken(code);
  return tokens;
};
