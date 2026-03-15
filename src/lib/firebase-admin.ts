import "server-only";
import { initializeApp, getApps, cert, ServiceAccount } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

// Helper to get or initialize the Firebase Admin app
function getFirebaseAdminApp() {
  const apps = getApps();
  if (apps.length > 0) {
    return apps[0];
  }

  // Parse service account from environment variable
  // It should be the full JSON content of the service account file
  const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT;
  
  if (!serviceAccountJson) {
    throw new Error("FIREBASE_SERVICE_ACCOUNT environment variable is not set.");
  }

  let serviceAccount: ServiceAccount;
  try {
    serviceAccount = JSON.parse(serviceAccountJson);
  } catch (error) {
    throw new Error("Failed to parse FIREBASE_SERVICE_ACCOUNT environment variable as JSON.");
  }

  return initializeApp({
    credential: cert(serviceAccount),
  });
}

// Export a function to get the Firestore instance
// This ensures we don't initialize until needed
export function getAdminFirestore() {
  const app = getFirebaseAdminApp();
  return getFirestore(app);
}
