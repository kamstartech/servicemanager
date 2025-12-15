import admin from 'firebase-admin';
import fs from 'fs';
import path from 'path';

// Initialize Firebase Admin SDK
if (!admin.apps.length) {
  try {
    // Try environment variables first (recommended for production)
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
      // Fallback: try to load from service account file
      const serviceAccountPath = path.join(process.cwd(), 'config', 'firebase-service-account.json');
      
      if (fs.existsSync(serviceAccountPath)) {
        const serviceAccountContent = fs.readFileSync(serviceAccountPath, 'utf8');
        const serviceAccount = JSON.parse(serviceAccountContent);
        
        admin.initializeApp({
          credential: admin.credential.cert(serviceAccount),
        });
        
        console.log('Firebase Admin SDK initialized from service account file');
      } else {
        console.warn('Firebase credentials not found. Push notifications will not work.');
        console.warn('Configure FIREBASE_PROJECT_ID, FIREBASE_PRIVATE_KEY, and FIREBASE_CLIENT_EMAIL environment variables.');
      }
    }
  } catch (error) {
    console.error('Failed to initialize Firebase Admin SDK:', error);
    console.warn('Push notifications will not be available.');
  }
}

// Export messaging getter to avoid initialization errors
export const getMessaging = () => {
  if (!admin.apps.length) {
    throw new Error('Firebase Admin SDK not initialized');
  }
  return admin.messaging();
};

export default admin;
