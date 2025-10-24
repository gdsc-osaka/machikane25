import { describe, expect, it, vi, beforeEach } from "vitest";

const initializeAppMock = vi.fn();
const connectAuthEmulatorMock = vi.fn();
const connectFirestoreEmulatorMock = vi.fn();
const connectStorageEmulatorMock = vi.fn();
const connectFunctionsEmulatorMock = vi.fn();
const signInAnonymouslyMock = vi.fn();
const getAuthMock = vi.fn();
const getFirestoreMock = vi.fn();
const getStorageMock = vi.fn();
const getFunctionsMock = vi.fn();
const getRemoteConfigMock = vi.fn();

const mockAuth = { currentUser: null } as { currentUser: null | { uid: string } };
const mockFirestore = { app: "test" };
const mockStorage = { app: "test" };
const mockFunctions = { app: "test" };
const mockRemoteConfig = {};
const mockApp = { name: "photo" };

vi.mock("firebase/app", () => ({
	initializeApp: initializeAppMock.mockImplementation(() => mockApp),
	getApps: vi.fn(() => []),
}));

vi.mock("firebase/auth", () => ({
	getAuth: getAuthMock.mockImplementation(() => mockAuth),
	signInAnonymously: signInAnonymouslyMock.mockResolvedValue({ user: { uid: "anon" } }),
	connectAuthEmulator: connectAuthEmulatorMock,
}));

vi.mock("firebase/firestore", () => ({
	getFirestore: getFirestoreMock.mockImplementation(() => mockFirestore),
	connectFirestoreEmulator: connectFirestoreEmulatorMock,
}));

vi.mock("firebase/storage", () => ({
	getStorage: getStorageMock.mockImplementation(() => mockStorage),
	connectStorageEmulator: connectStorageEmulatorMock,
}));

vi.mock("firebase/functions", () => ({
	getFunctions: getFunctionsMock.mockImplementation(() => mockFunctions),
	connectFunctionsEmulator: connectFunctionsEmulatorMock,
}));

vi.mock("firebase/remote-config", () => ({
	getRemoteConfig: getRemoteConfigMock.mockImplementation(() => mockRemoteConfig),
}));

const resetMocks = () => {
	initializeAppMock.mockClear();
	connectAuthEmulatorMock.mockClear();
	connectFirestoreEmulatorMock.mockClear();
	connectStorageEmulatorMock.mockClear();
	connectFunctionsEmulatorMock.mockClear();
	signInAnonymouslyMock.mockClear();
	getAuthMock.mockClear();
	getFirestoreMock.mockClear();
	getStorageMock.mockClear();
	getFunctionsMock.mockClear();
	getRemoteConfigMock.mockClear();
	mockAuth.currentUser = null;
};

const importFirebaseModule = async () => {
	const mod = await import("@/firebase");
	return mod;
};

describe("Firebase client bootstrap", () => {
	beforeEach(() => {
		resetMocks();
		delete process.env.NEXT_PUBLIC_FIREBASE_EMULATORS;
		delete process.env.NEXT_PUBLIC_FIREBASE_EMULATOR_HOST;
		delete process.env.NEXT_PUBLIC_FIREBASE_EMULATOR_PORTS;
		vi.resetModules();
	});

	it("initializes once and ensures anonymous auth", async () => {
		process.env.NEXT_PUBLIC_FIREBASE_CONFIG = JSON.stringify({
			apiKey: "key",
			authDomain: "example.firebaseapp.com",
			projectId: "example",
			storageBucket: "example.appspot.com",
			messagingSenderId: "sender",
			appId: "app",
		});
		const { getFirebaseClients } = await importFirebaseModule();
		const first = await getFirebaseClients();
		expect(initializeAppMock).toHaveBeenCalledTimes(1);
		expect(signInAnonymouslyMock).toHaveBeenCalledTimes(1);
		mockAuth.currentUser = { uid: "anon" };
		const second = await getFirebaseClients();
		expect(second).toBe(first);
		expect(signInAnonymouslyMock).toHaveBeenCalledTimes(1);
		expect(first.auth).toBe(mockAuth);
		expect(first.firestore).toBe(mockFirestore);
		expect(first.storage).toBe(mockStorage);
		expect(first.functions).toBe(mockFunctions);
		expect(first.remoteConfig).toBe(mockRemoteConfig);
	});

	it("connects to emulators when requested and avoids duplicate connections", async () => {
		process.env.NEXT_PUBLIC_FIREBASE_CONFIG = JSON.stringify({
			apiKey: "key",
			authDomain: "example.firebaseapp.com",
			projectId: "example",
			storageBucket: "example.appspot.com",
			messagingSenderId: "sender",
			appId: "app",
		});
		process.env.NEXT_PUBLIC_FIREBASE_EMULATORS = "true";
		process.env.NEXT_PUBLIC_FIREBASE_EMULATOR_HOST = "127.0.0.1";
		process.env.NEXT_PUBLIC_FIREBASE_EMULATOR_PORTS = JSON.stringify({
			auth: 11000,
			firestore: 11002,
			storage: 11004,
			functions: 11006,
		});
		const { getFirebaseClients } = await importFirebaseModule();
		await getFirebaseClients();
		expect(connectAuthEmulatorMock).toHaveBeenCalledWith(
			mockAuth,
			"http://127.0.0.1:11000",
			expect.objectContaining({ disableWarnings: true }),
		);
		expect(connectFirestoreEmulatorMock).toHaveBeenCalledWith(
			mockFirestore,
			"127.0.0.1",
			11002,
		);
		expect(connectStorageEmulatorMock).toHaveBeenCalledWith(
			mockStorage,
			"127.0.0.1",
			11004,
		);
		expect(connectFunctionsEmulatorMock).toHaveBeenCalledWith(
			mockFunctions,
			"127.0.0.1",
			11006,
		);
		await getFirebaseClients();
		expect(connectAuthEmulatorMock).toHaveBeenCalledTimes(1);
		expect(connectFirestoreEmulatorMock).toHaveBeenCalledTimes(1);
		expect(connectStorageEmulatorMock).toHaveBeenCalledTimes(1);
		expect(connectFunctionsEmulatorMock).toHaveBeenCalledTimes(1);
	});
});
