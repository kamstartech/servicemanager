import admin from 'firebase-admin';
import path from 'path';

// Initialize Firebase Admin SDK
if (!admin.apps.length) {
  try {
    // Try to load from service account file
    const serviceAccountPath = path.join(process.cwd(), 'config', 'firebase-service-account.json');
    const serviceAccount = require(serviceAccountPath);
    
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
    
    console.log('Firebase Admin SDK initialized successfully');
  } catch (error) {
    console.error('Failed to initialize Firebase Admin SDK:', error);
    
    // Fallback: try environment variables
    if (process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_PRIVATE_KEY && process.env.FIREBASE_CLIENT_EMAIL) {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
        }),
      });
      
      console.log('Firebase Admin SDK initialized from environment variables');
    } else {
      throw new Error('Firebase credentials not found. Please configure service account or environment variables.');
    }
  }
}

export const messaging = admin.messaging();
export default admin;
