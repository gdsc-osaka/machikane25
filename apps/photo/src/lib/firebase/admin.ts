/**
 * T207 [FOUND] Infrastructure: Firebase Admin Setup
 *
 * Firebase Admin SDK initialization for server-side usage.
 * Singleton pattern to ensure only one instance is created.
 */

import * as admin from "firebase-admin";
import type { App, AppOptions } from "firebase-admin/app";
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
		const storageBucket = process.env.FIREBASE_STORAGE_BUCKET;
		const appOptions: admin.AppOptions = {
			credential: admin.credential.cert(serviceAccount),
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
	const firestore = admin.firestore(app);

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
