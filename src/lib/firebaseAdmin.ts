import * as admin from 'firebase-admin';
import firebaseConfig from '../../firebase-applet-config.json';

if (!admin.apps.length) {
  const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT 
    ? JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT) 
    : null;

  if (serviceAccount) {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      databaseURL: `https://${firebaseConfig.projectId}.firebaseio.com`
    });
  } else {
    // Fallback for environments with default credentials
    admin.initializeApp({
      projectId: firebaseConfig.projectId
    });
  }
}

export const adminDb = admin.firestore();
export const adminAuth = admin.auth();
