/**
 * T207 [FOUND] Infrastructure: Firebase Admin Setup
 *
 * Firebase Admin SDK initialization for server-side usage.
 * Singleton pattern to ensure only one instance is created.
 */

import * as admin from "firebase-admin";
import type { App } from "firebase-admin/app";
import type { Auth } from "firebase-admin/auth";
import type { Firestore } from "firebase-admin/firestore";
import type { Storage } from "firebase-admin/storage";

/**
 * Parse service account from environment variable
 */
const getServiceAccount = (): admin.ServiceAccount => {
  const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (!serviceAccountJson) {
    throw new Error("FIREBASE_SERVICE_ACCOUNT_JSON is not defined");
  }
  return JSON.parse(serviceAccountJson) as admin.ServiceAccount;
};

let adminApp: App | null = null;

/**
 * Initialize Firebase Admin SDK
 * Singleton pattern - only initializes once
 */
const initializeAdminApp = (): App => {
  if (adminApp) {
    return adminApp;
  }

  // Check if already initialized by checking apps length
  if (admin.apps.length === 0) {
    const serviceAccount = getServiceAccount();
    adminApp = admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
  } else {
    adminApp = admin.apps[0] as App;
  }

  return adminApp;
};

/**
 * Get Firebase Admin Auth instance
 */
export const getAdminAuth = (): Auth => {
  const app = initializeAdminApp();
  return admin.auth(app);
};

/**
 * Get Firebase Admin Firestore instance
 */
export const getAdminFirestore = (): Firestore => {
  const app = initializeAdminApp();
  return admin.firestore(app);
};

/**
 * Get Firebase Admin Storage instance
 */
export const getAdminStorage = (): Storage => {
  const app = initializeAdminApp();
  return admin.storage(app);
};
