/**
 * T206 [FOUND] Infrastructure: Firebase Client Setup
 *
 * Firebase Client SDK initialization for browser/client-side usage.
 * Supports Firebase Emulator in development mode.
 */

import { type FirebaseApp, getApps, initializeApp } from "firebase/app";
import {
	type Auth,
	connectAuthEmulator,
	getAuth,
	onAuthStateChanged,
	signInAnonymously,
	type User,
} from "firebase/auth";
import {
	connectFirestoreEmulator,
	type Firestore,
	getFirestore,
} from "firebase/firestore";
import {
	connectStorageEmulator,
	type FirebaseStorage,
	getStorage,
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
let isConnectedToEmulator = false;

/**
 * Initialize Firebase Client SDK
 * Only initializes once (singleton pattern)
 * Connects to Firebase Emulator in non-production environments (development and test)
 */
export const initializeFirebaseClient = (): void => {
	// Only initialize app if not already initialized
	if (getApps().length === 0) {
		const config = getFirebaseConfig();
		firebaseApp = initializeApp(config);
	} else if (!firebaseApp) {
		// Get existing app if we don't have a reference
		firebaseApp = getApps()[0];
	}

	// Initialize auth, firestore, and storage if not already initialized
	if (!auth) {
		auth = getAuth(firebaseApp);
	}
	if (!firestore) {
		firestore = getFirestore(firebaseApp, "photo");
	}
	if (!storage) {
		storage = getStorage(firebaseApp);
	}

};

/**
 * Get Firebase Auth instance
 */
export const getFirebaseAuth = (): Auth => {
	initializeFirebaseClient();
	if (!auth) {
		throw new Error(
			"Firebase Auth is not initialized. Call initializeFirebaseClient() first.",
		);
	}
	return auth;
};

/**
 * Get Firestore instance
 */
export const getFirebaseFirestore = (): Firestore => {
	initializeFirebaseClient();
	if (!firestore) {
		throw new Error(
			"Firestore is not initialized. Call initializeFirebaseClient() first.",
		);
	}
	return firestore;
};

/**
 * Get Firebase Storage instance
 */
export const getFirebaseStorage = (): FirebaseStorage => {
	initializeFirebaseClient();
	if (!storage) {
		throw new Error(
			"Firebase Storage is not initialized. Call initializeFirebaseClient() first.",
		);
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
			reject,
		);
	});
};
