import { google } from 'googleapis';
import crypto from 'crypto';

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_DRIVE_REDIRECT_URI || 'http://localhost:3000/api/drive/callback'
);

// Store state tokens temporarily (in production, use a proper session store)
const stateTokens = new Map<string, { timestamp: number }>();

export const getAuthUrl = () => {
  const scopes = [
    'https://www.googleapis.com/auth/drive.readonly',
    'https://www.googleapis.com/auth/drive.metadata.readonly'
  ];

  // Generate a random state token
  const state = crypto.randomBytes(32).toString('hex');
  
  // Store the state token with timestamp
  stateTokens.set(state, { timestamp: Date.now() });

  // Clean up old state tokens (older than 1 hour)
  const oneHourAgo = Date.now() - 3600000;
  for (const [storedState, data] of stateTokens.entries()) {
    if (data.timestamp < oneHourAgo) {
      stateTokens.delete(storedState);
    }
  }

  return oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: scopes,
    prompt: 'consent', // Force to get refresh token
    state: state // Include state parameter
  });
};

export const verifyState = (state: string): boolean => {
  const stateData = stateTokens.get(state);
  if (!stateData) return false;
  
  // Remove the state token after verification
  stateTokens.delete(state);
  
  // Check if the state token is not too old (1 hour)
  return Date.now() - stateData.timestamp < 3600000;
};

export const getTokens = async (code: string, state: string) => {
  // Verify state parameter
  if (!verifyState(state)) {
    throw new Error('Invalid state parameter');
  }

  const { tokens } = await oauth2Client.getToken(code);
  return tokens;
};

export const refreshAccessToken = async (refreshToken: string) => {
  oauth2Client.setCredentials({
    refresh_token: refreshToken
  });
  
  const { credentials } = await oauth2Client.refreshAccessToken();
  return credentials;
}; 