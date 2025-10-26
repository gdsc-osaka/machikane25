/**
 * T206 [FOUND] Infrastructure: Firebase Client Setup
 *
 * Firebase Client SDK initialization for browser/client-side usage.
 * Supports Firebase Emulator in development mode.
 */

import { initializeApp, getApps, type FirebaseApp } from "firebase/app";
import {
  getAuth,
  connectAuthEmulator,
  signInAnonymously,
  onAuthStateChanged,
  type Auth,
  type User,
} from "firebase/auth";
import {
  getFirestore,
  connectFirestoreEmulator,
  type Firestore,
} from "firebase/firestore";
import {
  getStorage,
  connectStorageEmulator,
  type FirebaseStorage,
} from "firebase/storage";

/**
 * Parse Firebase configuration from environment variable
 */
const getFirebaseConfig = (): Record<string, string> => {
  const configJson = process.env.NEXT_PUBLIC_FIREBASE_CONFIG;
  if (!configJson) {
    throw new Error("NEXT_PUBLIC_FIREBASE_CONFIG is not defined");
  }
  return JSON.parse(configJson);
};

let firebaseApp: FirebaseApp | null = null;
let auth: Auth | null = null;
let firestore: Firestore | null = null;
let storage: FirebaseStorage | null = null;

/**
 * Initialize Firebase Client SDK
 * Only initializes once (singleton pattern)
 * Connects to Firebase Emulator in development mode
 */
export const initializeFirebaseClient = (): void => {
  // Only initialize if not already initialized
  if (getApps().length === 0) {
    const config = getFirebaseConfig();
    firebaseApp = initializeApp(config);

    // Connect to emulators in development mode
    if (process.env.NODE_ENV === "development") {
      auth = getAuth(firebaseApp);
      firestore = getFirestore(firebaseApp);
      storage = getStorage(firebaseApp);

      // Connect to Auth Emulator
      connectAuthEmulator(auth, "http://localhost:9099", {
        disableWarnings: true,
      });

      // Connect to Firestore Emulator
      connectFirestoreEmulator(firestore, "localhost", 8080);

      // Connect to Storage Emulator
      connectStorageEmulator(storage, "localhost", 9199);
    }
  }
};

/**
 * Get Firebase Auth instance
 */
export const getFirebaseAuth = (): Auth => {
  if (!auth) {
    initializeFirebaseClient();
    auth = getAuth();
  }
  return auth;
};

/**
 * Get Firestore instance
 */
export const getFirebaseFirestore = (): Firestore => {
  if (!firestore) {
    initializeFirebaseClient();
    firestore = getFirestore();
  }
  return firestore;
};

/**
 * Get Firebase Storage instance
 */
export const getFirebaseStorage = (): FirebaseStorage => {
  if (!storage) {
    initializeFirebaseClient();
    storage = getStorage();
  }
  return storage;
};

/**
 * Ensure anonymous sign-in (FR-001)
 * Promise-based wrapper that signs in only if no user is currently signed in
 * Uses onAuthStateChanged to wait for existing auth state
 *
 * @returns Promise that resolves with the anonymous user
 */
export const ensureAnonymousSignIn = (): Promise<User> => {
  const authInstance = getFirebaseAuth();

  return new Promise((resolve, reject) => {
    const unsubscribe = onAuthStateChanged(
      authInstance,
      (user) => {
        unsubscribe();
        if (user) {
          // User already signed in
          resolve(user);
        } else {
          // No user, sign in anonymously
          signInAnonymously(authInstance)
            .then((credential) => resolve(credential.user))
            .catch(reject);
        }
      },
      reject
    );
  });
};
