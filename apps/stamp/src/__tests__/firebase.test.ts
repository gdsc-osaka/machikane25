import { beforeEach, describe, expect, it, vi } from "vitest";
import type { FirebaseClientName } from "@/firebase";

const mockAppRegistry: Array<Record<string, unknown>> = [];
const initializeAppMock = vi.fn(
	(config: Record<string, unknown>): Record<string, unknown> => {
		const appInstance = { config };
		mockAppRegistry.push(appInstance);
		return appInstance;
	},
);
const getAppsMock = vi.fn(() => mockAppRegistry);
const getAppMock = vi.fn(() => mockAppRegistry[0]);
const deleteAppMock = vi.fn(async (appInstance: Record<string, unknown>) => {
	const index = mockAppRegistry.findIndex(
		(candidate) => candidate === appInstance,
	);
	if (index >= 0) {
		mockAppRegistry.splice(index, 1);
	}
});

const mockAuthClient = { kind: "auth" };
const getAuthMock = vi.fn(() => mockAuthClient);
const connectAuthEmulatorMock = vi.fn();

const mockFirestoreClient = { kind: "firestore" };
const getFirestoreMock = vi.fn(() => mockFirestoreClient);
const connectFirestoreEmulatorMock = vi.fn();

const mockRemoteConfig = {
	defaultConfig: {},
	settings: {},
};
const getRemoteConfigMock = vi.fn(() => mockRemoteConfig);

const mockAnalyticsClient = { kind: "analytics" };
const getAnalyticsMock = vi.fn(() => mockAnalyticsClient);
const isAnalyticsSupportedMock = vi.fn(async () => true);

vi.mock("firebase/app", () => ({
	deleteApp: deleteAppMock,
	getApp: getAppMock,
	getApps: getAppsMock,
	initializeApp: initializeAppMock,
}));
vi.mock("firebase/auth", () => ({
	connectAuthEmulator: connectAuthEmulatorMock,
	getAuth: getAuthMock,
}));
vi.mock("firebase/firestore", () => ({
	connectFirestoreEmulator: connectFirestoreEmulatorMock,
	getFirestore: getFirestoreMock,
}));
vi.mock("firebase/remote-config", () => ({
	getRemoteConfig: getRemoteConfigMock,
}));
vi.mock("firebase/analytics", () => ({
	getAnalytics: getAnalyticsMock,
	isSupported: isAnalyticsSupportedMock,
}));

const firebaseConfigPayload = {
	apiKey: "api-key",
	authDomain: "auth.example.com",
	projectId: "machikane-fes",
	appId: "stamp-app",
};

const importFirebaseModule = async () => {
	process.env.NEXT_PUBLIC_FIREBASE_CONFIG = JSON.stringify(
		firebaseConfigPayload,
	);
	process.env.NODE_ENV = "development";
	vi.resetModules();
	return import("@/firebase");
};

beforeEach(() => {
	mockAppRegistry.splice(0);
	initializeAppMock.mockClear();
	getAppsMock.mockClear();
	getAppMock.mockClear();
	deleteAppMock.mockClear();
	getAuthMock.mockClear();
	connectAuthEmulatorMock.mockClear();
	getFirestoreMock.mockClear();
	connectFirestoreEmulatorMock.mockClear();
	getRemoteConfigMock.mockClear();
	getAnalyticsMock.mockClear();
	isAnalyticsSupportedMock.mockClear();
	mockRemoteConfig.settings = {};
	mockRemoteConfig.defaultConfig = {};
});

describe("firebase client helpers", () => {
	it("exposes typed firebase clients with remote config defaults", async () => {
		const firebaseModule = await importFirebaseModule();
		const clients = firebaseModule.getFirebaseClients();

		expect(initializeAppMock).toHaveBeenCalledOnce();
		expect(clients.auth).toBe(mockAuthClient);
		expect(clients.firestore).toBe(mockFirestoreClient);
		expect(clients.remoteConfig?.settings?.minimumFetchIntervalMillis).toBe(
			60_000,
		);
		expect(clients.remoteConfig?.defaultConfig?.stamp_app_status).toBe(
			"online",
		);
		expect(clients.remoteConfig?.defaultConfig?.stamp_app_message_ja).toBe("");
		expect(clients.remoteConfig?.defaultConfig?.stamp_app_message_en).toBe("");
	});

	it("provides individual client lookups", async () => {
		const firebaseModule = await importFirebaseModule();
		const clientNames: Array<FirebaseClientName> = [
			"app",
			"auth",
			"firestore",
			"remoteConfig",
		];

		const resolvedClients = clientNames.map((name) =>
			firebaseModule.getFirebaseClient(name),
		);

		expect(resolvedClients[0]).toEqual(mockAppRegistry[0]);
		expect(resolvedClients[1]).toBe(mockAuthClient);
		expect(resolvedClients[2]).toBe(mockFirestoreClient);
		expect(resolvedClients[3]).toBe(mockRemoteConfig);
	});

	it("connects to firebase emulators in development", async () => {
		await importFirebaseModule();

		expect(connectAuthEmulatorMock).toHaveBeenCalledWith(
			mockAuthClient,
			"http://localhost:11000",
			{ disableWarnings: true },
		);
		expect(connectFirestoreEmulatorMock).toHaveBeenCalledWith(
			mockFirestoreClient,
			"localhost",
			11002,
		);
	});

	it("resets firebase apps via deleteApp", async () => {
		const firebaseModule = await importFirebaseModule();
		const existingApp = mockAppRegistry[0];
		expect(mockAppRegistry).toHaveLength(1);

		await firebaseModule.resetFirebaseApp();

		expect(deleteAppMock).toHaveBeenCalledWith(existingApp);
		expect(mockAppRegistry).toHaveLength(0);
	});
});
