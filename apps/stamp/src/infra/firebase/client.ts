import type { Analytics } from "firebase/analytics";
import type { Auth } from "firebase/auth";
import type { Firestore } from "firebase/firestore";
import type { RemoteConfig } from "firebase/remote-config";
import { analytics, auth, db, config as remoteConfig } from "@/firebase";

export type FirebaseClientBundle = {
	auth: Auth;
	db: Firestore;
	remoteConfig: RemoteConfig;
	analytics: () => Analytics | null;
};

let cached: FirebaseClientBundle | null = null;

const createBundle = (): FirebaseClientBundle => ({
	auth,
	db,
	remoteConfig,
	analytics: () => {
		try {
			return analytics();
		} catch {
			return null;
		}
	},
});

export const getFirebaseClient = (): FirebaseClientBundle => {
	if (!cached) {
		cached = createBundle();
	}
	return cached;
};

export const getAuthClient = (): Auth => getFirebaseClient().auth;

export const getFirestoreClient = (): Firestore => getFirebaseClient().db;

export const getRemoteConfigClient = (): RemoteConfig =>
	getFirebaseClient().remoteConfig;
