/* v8 ignore start */

import { type Analytics, getAnalytics } from "firebase/analytics";
import { initializeApp } from "firebase/app";
import { getAuth, connectAuthEmulator } from "firebase/auth";
import { getFirestore, connectFirestoreEmulator } from "firebase/firestore";
import { getRemoteConfig } from "firebase/remote-config";
import {getLogger} from "@machikane25/logger/src";

const firebaseConfig = () => {
	const dummy = {
		apiKey: "dummy",
		authDomain: "dummy",
		projectId: "dummy",
		storageBucket: "dummy",
		messagingSenderId: "dummy",
		appId: "dummy",
		measurementId: "dummy",
	};
	const raw = process.env.NEXT_PUBLIC_FIREBASE_CONFIG;
	if (!raw) {
		getLogger().warn("FIREBASE_CONFIG is not set, using dummy config");
		return dummy;
	}
	try {
		return JSON.parse(raw);
	} catch (e) {
		getLogger().error(e, "FIREBASE_CONFIG is not valid JSON, using dummy config");
		return dummy;
	}
};

const app = initializeApp(firebaseConfig());
const auth = getAuth(app);
const db = getFirestore(app, process.env.NEXT_PUBLIC_FIRESTORE_DATABASE_ID);
const config = getRemoteConfig(app);
let _analytics: Analytics | null = null;
const analytics = () => {
	if (_analytics && typeof window !== "undefined") {
		return _analytics;
	}
	_analytics = getAnalytics(app);
	return _analytics;
};

if (process.env.NODE_ENV === "development") {
	connectAuthEmulator(auth, "http://localhost:11000", { disableWarnings: true });
	connectFirestoreEmulator(db, "localhost", 11002);
}

export { app, analytics, auth, db, config };
