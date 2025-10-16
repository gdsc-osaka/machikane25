import { type FirebaseApp, getApp, getApps, initializeApp } from "firebase/app";
import { type Auth, connectAuthEmulator, getAuth } from "firebase/auth";
import {
	connectFirestoreEmulator,
	type Firestore,
	getFirestore,
} from "firebase/firestore";
import { getRemoteConfig, type RemoteConfig } from "firebase/remote-config";
import { getLogger } from "@/packages/logger";

type FirebaseConfig = {
	apiKey: string;
	authDomain: string;
	projectId: string;
	storageBucket: string;
	messagingSenderId: string;
	appId: string;
};

const firebaseConfig = (): FirebaseConfig => {
	const {
		NEXT_PUBLIC_FIREBASE_API_KEY,
		NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
		NEXT_PUBLIC_FIREBASE_PROJECT_ID,
		NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
		NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
		NEXT_PUBLIC_FIREBASE_APP_ID,
	} = process.env;

	if (
		!NEXT_PUBLIC_FIREBASE_API_KEY ||
		!NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ||
		!NEXT_PUBLIC_FIREBASE_PROJECT_ID ||
		!NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ||
		!NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ||
		!NEXT_PUBLIC_FIREBASE_APP_ID
	) {
		getLogger().warn(
			"Firebase config incomplete, falling back to dummy values",
		);
		return {
			apiKey: "dummy",
			authDomain: "dummy.firebaseapp.com",
			projectId: "dummy",
			storageBucket: "dummy.appspot.com",
			messagingSenderId: "0",
			appId: "dummy",
		};
	}

	return {
		apiKey: NEXT_PUBLIC_FIREBASE_API_KEY,
		authDomain: NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
		projectId: NEXT_PUBLIC_FIREBASE_PROJECT_ID,
		storageBucket: NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
		messagingSenderId: NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
		appId: NEXT_PUBLIC_FIREBASE_APP_ID,
	};
};

const ensureFirebaseApp = (): FirebaseApp => {
	if (!getApps().length) {
		initializeApp(firebaseConfig());
	}
	return getApp();
};

const getFirebaseAuth = (): Auth => {
	const app = ensureFirebaseApp();
	const auth = getAuth(app);
	if (process.env.NODE_ENV === "development" && typeof window !== "undefined") {
		const emulatorHost =
			process.env.NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_HOST ??
			"http://localhost:9099";
		connectAuthEmulator(auth, emulatorHost, { disableWarnings: true });
	}
	return auth;
};

const getFirebaseFirestore = (): Firestore => {
	const app = ensureFirebaseApp();
	const firestore = getFirestore(app);
	if (process.env.NODE_ENV === "development" && typeof window !== "undefined") {
		const [host, port] = (
			process.env.NEXT_PUBLIC_FIREBASE_FIRESTORE_EMULATOR ?? "localhost:8080"
		).split(":");
		connectFirestoreEmulator(firestore, host, Number.parseInt(port, 10));
	}
	return firestore;
};

const getFirebaseRemoteConfig = (): RemoteConfig => {
	const app = ensureFirebaseApp();
	const remoteConfig = getRemoteConfig(app);

	const cacheSeconds = Number.parseInt(
		process.env.NEXT_PUBLIC_REMOTE_CONFIG_CACHE_SECONDS ?? "60",
		10,
	);
	remoteConfig.settings = {
		minimumFetchIntervalMillis: cacheSeconds * 1000,
		fetchTimeoutMillis: 60 * 1000,
	};
	return remoteConfig;
};

export {
	ensureFirebaseApp,
	getFirebaseAuth,
	getFirebaseFirestore,
	getFirebaseRemoteConfig,
};
