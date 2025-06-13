import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

// Initialize Firebase Admin
const apps = getApps();

if (!apps.length) {
  try {
    console.log('Initializing Firebase Admin...');
    console.log('Project ID:', process.env.FIREBASE_PROJECT_ID);
    console.log('Client Email:', process.env.FIREBASE_CLIENT_EMAIL);
    console.log('Private Key exists:', !!process.env.FIREBASE_PRIVATE_KEY);

    if (!process.env.FIREBASE_PROJECT_ID) {
      throw new Error('FIREBASE_PROJECT_ID is not set');
    }
    if (!process.env.FIREBASE_CLIENT_EMAIL) {
      throw new Error('FIREBASE_CLIENT_EMAIL is not set');
    }
    if (!process.env.FIREBASE_PRIVATE_KEY) {
      throw new Error('FIREBASE_PRIVATE_KEY is not set');
    }

    // Format the private key properly
    const privateKey = process.env.FIREBASE_PRIVATE_KEY
      .replace(/\\n/g, '\n')
      .replace(/"/g, '') // Remove any quotes
      .trim();

    // Ensure the key has proper PEM format
    const formattedKey = privateKey.includes('-----BEGIN PRIVATE KEY-----')
      ? privateKey
      : `-----BEGIN PRIVATE KEY-----\n${privateKey}\n-----END PRIVATE KEY-----`;

    console.log('Private Key format check:', formattedKey.startsWith('-----BEGIN PRIVATE KEY-----'));

    initializeApp({
      credential: cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: formattedKey,
      }),
    });
    console.log('Firebase Admin initialized successfully');
  } catch (error) {
    console.error('Error initializing Firebase Admin:', error);
    throw error;
  }
}

export const auth = getAuth(); 