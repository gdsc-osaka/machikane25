"use client";
/* v8 ignore start */

import { type Analytics, getAnalytics } from "firebase/analytics";
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getRemoteConfig } from "firebase/remote-config";

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
		return dummy;
	}
	try {
		return JSON.parse(raw);
	} catch (_error) {
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

export { app, analytics, auth, db, config };
