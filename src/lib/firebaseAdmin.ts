import * as admin from 'firebase-admin';

try {
  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        // Handle both literal '\\n', real '\n', and strip surrounding quotes that sometimes get pasted into secret managers
        privateKey: process.env.FIREBASE_PRIVATE_KEY 
          ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n').replace(/^"|"$/g, '') 
          : undefined,
      }),
    });
  }
} catch (error) {
  console.error("Firebase Admin Initialization Error:", error);
}

export const auth = admin.apps.length > 0 ? admin.auth() : null;
export default admin;
