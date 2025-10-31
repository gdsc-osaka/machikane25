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
import { getFirestore } from "firebase-admin/firestore";
import type { Storage } from "firebase-admin/storage";

/**
 * Get Firebase credential based on environment
 * Uses Application Default Credentials (ADC) in Firebase App Hosting
 * Falls back to service account JSON from environment variable for local development
 */
const getCredential = (): admin.credential.Credential => {
	const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;

	if (!serviceAccountJson) {
		// Use Application Default Credentials (ADC) for Firebase App Hosting
		return admin.credential.applicationDefault();
	}

	// Use service account JSON for local development/testing
	const serviceAccount = JSON.parse(serviceAccountJson) as admin.ServiceAccount;
	return admin.credential.cert(serviceAccount);
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
		const credential = getCredential();
		const storageBucket = process.env.FIREBASE_STORAGE_BUCKET;
		const appOptions: admin.AppOptions = {
			credential,
		};
		if (storageBucket) {
			appOptions.storageBucket = storageBucket;
		}
		adminApp = admin.initializeApp(appOptions);
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
 * Automatically connects to Firestore Emulator in development/test environments
 */
export const getAdminFirestore = (): Firestore => {
	const app = initializeAdminApp();
	const firestore = getFirestore(app, "photo");

	// Connect to Firestore Emulator if not in production
	if (process.env.NODE_ENV !== "production") {
		const firestoreEmulatorHost = process.env.FIRESTORE_EMULATOR_HOST;
		if (!firestoreEmulatorHost) {
			// Default to localhost:11002 (from firebase.json)
			process.env.FIRESTORE_EMULATOR_HOST = "localhost:11002";
			console.log("[admin] Using Firestore Emulator at localhost:11002");
		}
	}

	return firestore;
};

/**
 * Get Firebase Admin Storage instance
 * Automatically connects to Storage Emulator in development/test environments
 */
export const getAdminStorage = (): Storage => {
	const app = initializeAdminApp();
	const storage = admin.storage(app);

	// Connect to Storage Emulator if environment variable is set
	const storageEmulatorHost =
		process.env.FIREBASE_STORAGE_EMULATOR_HOST ||
		process.env.STORAGE_EMULATOR_HOST;

	if (storageEmulatorHost) {
		// Parse host and port from the emulator host string
		const [host, portStr] = storageEmulatorHost.split(":");
		const port = portStr ? parseInt(portStr, 10) : 9199;

		// Set the emulator host for the storage instance
		if (host && port) {
			process.env.STORAGE_EMULATOR_HOST = `${host}:${port}`;
			console.log(`[admin] Using Storage Emulator at ${host}:${port}`);
		}
	}

	return storage;
};
