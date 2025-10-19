import { type Analytics, getAnalytics, isSupported } from "firebase/analytics";
import {
	deleteApp,
	type FirebaseApp,
	type FirebaseOptions,
	getApp,
	getApps,
	initializeApp,
} from "firebase/app";
import { type Auth, connectAuthEmulator, getAuth } from "firebase/auth";
import {
	connectFirestoreEmulator,
	type Firestore,
	getFirestore,
} from "firebase/firestore";
import { getRemoteConfig, type RemoteConfig } from "firebase/remote-config";
import { getLogger } from "@/packages/logger";

type RequiredConfigKey = "apiKey" | "authDomain" | "projectId" | "appId";
const REQUIRED_CONFIG_KEYS: ReadonlyArray<RequiredConfigKey> = [
	"apiKey",
	"authDomain",
	"projectId",
	"appId",
];
const OPTIONAL_CONFIG_KEYS: ReadonlyArray<keyof FirebaseOptions> = [
	"measurementId",
	"messagingSenderId",
	"storageBucket",
	"databaseURL",
];
const AUTH_EMULATOR_PROTOCOL = "http";
const AUTH_EMULATOR_FALLBACK_PORT = 11000;
const FIRESTORE_EMULATOR_FALLBACK_PORT = 11002;
const REMOTE_CONFIG_MIN_FETCH_INTERVAL_MS = 60_000;

const isNonEmptyString = (value: unknown): value is string =>
	typeof value === "string" && value.trim().length > 0;

const isConfigRecord = (value: unknown): value is Record<string, unknown> =>
	typeof value === "object" && value !== null;

const parseFirebaseConfig = (): FirebaseOptions => {
	const raw = process.env.NEXT_PUBLIC_FIREBASE_CONFIG;
	if (!isNonEmptyString(raw)) {
		throw new Error(
			"NEXT_PUBLIC_FIREBASE_CONFIG is not defined. Please set it in your .env.local file following the example in .env.local.example.",
		);
	}
	let parsed: unknown;
	try {
		parsed = JSON.parse(raw);
	} catch (error) {
		getLogger().error(
			error,
			`Failed to parse NEXT_PUBLIC_FIREBASE_CONFIG. Parse error: ${error instanceof Error ? error.message : "unknown"}`,
		);
		throw new Error("NEXT_PUBLIC_FIREBASE_CONFIG must be valid JSON.");
	}
	if (!isConfigRecord(parsed)) {
		throw new Error(
			`NEXT_PUBLIC_FIREBASE_CONFIG must be a JSON object, but received: ${typeof parsed}.`,
		);
	}
	const config: Record<string, unknown> = parsed;

	const base = REQUIRED_CONFIG_KEYS.reduce<FirebaseOptions>((options, key) => {
		const value = config[key];
		if (!isNonEmptyString(value)) {
			throw new Error(`Missing Firebase config key: ${String(key)}`);
		}
		return {
			...options,
			[key]: value,
		};
	}, {});

	return OPTIONAL_CONFIG_KEYS.reduce<FirebaseOptions>((options, key) => {
		const value = config[key];
		if (isNonEmptyString(value)) {
			return {
				...options,
				[key]: value,
			};
		}
		return options;
	}, base);
};

const resolveFirebaseApp = (): FirebaseApp => {
	const existingApps = getApps();
	if (existingApps.length > 0) {
		return getApp();
	}
	return initializeApp(parseFirebaseConfig());
};

const parsePort = (value: string | undefined, fallback: number): number => {
	if (!value) {
		return fallback;
	}
	const parsed = Number.parseInt(value, 10);
	if (Number.isNaN(parsed)) {
		getLogger().warn(
			{ value },
			"Invalid emulator port provided. Falling back to default.",
		);
		return fallback;
	}
	return parsed;
};

const shouldUseEmulators = () => process.env.NODE_ENV === "development";

const connectEmulators = (auth: Auth, firestore: Firestore) => {
	if (!shouldUseEmulators()) {
		return;
	}
	const host = process.env.NEXT_PUBLIC_FIREBASE_EMULATOR_HOST ?? "localhost";
	const firestorePort = parsePort(
		process.env.NEXT_PUBLIC_FIREBASE_EMULATOR_PORT,
		FIRESTORE_EMULATOR_FALLBACK_PORT,
	);
	const authPort = parsePort(
		process.env.NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_PORT,
		AUTH_EMULATOR_FALLBACK_PORT,
	);
	const authOrigin = `${AUTH_EMULATOR_PROTOCOL}://${host}:${authPort}`;

	connectAuthEmulator(auth, authOrigin, { disableWarnings: true });
	connectFirestoreEmulator(firestore, host, firestorePort);
};

const firebaseApp = resolveFirebaseApp();
const firebaseAuth = getAuth(firebaseApp);
const firestoreClient = getFirestore(
	firebaseApp,
	process.env.NEXT_PUBLIC_FIRESTORE_DATABASE_ID,
);

connectEmulators(firebaseAuth, firestoreClient);

const isBrowserEnvironment = () => typeof window !== "undefined";

const configureRemoteConfig = (
	appInstance: FirebaseApp,
): RemoteConfig | null => {
	if (!isBrowserEnvironment()) {
		return null;
	}
	const remoteConfig = getRemoteConfig(appInstance);
	remoteConfig.settings = {
		...remoteConfig.settings,
		minimumFetchIntervalMillis: REMOTE_CONFIG_MIN_FETCH_INTERVAL_MS,
	};
	remoteConfig.defaultConfig = {
		stamp_app_status: "online",
		stamp_app_message_ja: "",
		stamp_app_message_en: "",
	};
	return remoteConfig;
};

const remoteConfigClient = configureRemoteConfig(firebaseApp);

type FirebaseClients = {
	app: FirebaseApp;
	auth: Auth;
	firestore: Firestore;
	remoteConfig: RemoteConfig | null;
};

type FirebaseClientName = keyof FirebaseClients;

const firebaseClients: FirebaseClients = {
	app: firebaseApp,
	auth: firebaseAuth,
	firestore: firestoreClient,
	remoteConfig: remoteConfigClient,
};

const getFirebaseClients = (): FirebaseClients => firebaseClients;

const getFirebaseClient = <Name extends FirebaseClientName>(
	name: Name,
): FirebaseClients[Name] => firebaseClients[name];

const getFirebaseApp = () => firebaseClients.app;
const getFirebaseAuth = () => firebaseClients.auth;
const getFirestoreClient = () => firebaseClients.firestore;
const getRemoteConfigClient = () => firebaseClients.remoteConfig;

const getAnalyticsClient = async (): Promise<Analytics | null> => {
	if (!isBrowserEnvironment()) {
		return null;
	}
	const supported = await isSupported();
	if (!supported) {
		return null;
	}
	return getAnalytics(firebaseApp);
};

const resetFirebaseApp = async () => {
	const apps = getApps();
	await Promise.all(apps.map((appInstance) => deleteApp(appInstance)));
};

export {
	getAnalyticsClient,
	getFirebaseClient,
	getFirebaseClients,
	getFirebaseApp,
	getFirebaseAuth,
	getFirestoreClient,
	getRemoteConfigClient,
	resetFirebaseApp,
};

export type { FirebaseClientName, FirebaseClients };
