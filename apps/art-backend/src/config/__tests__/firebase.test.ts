import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import type { Config } from "../env.js";

type AppStub = { readonly name: string };

const apps: AppStub[] = [];

const appInstance: AppStub = { name: "mock-app" };

const getAppsMock = vi.fn(() => apps);
const initializeAppMock = vi.fn(() => {
	apps.push(appInstance);
	return appInstance;
});
const getAppMock = vi.fn(() => appInstance);
const applicationDefaultMock = vi.fn(() => ({ credential: "default" }));

const firestoreInstance = { kind: "firestore" };
const getFirestoreMock = vi.fn(() => firestoreInstance);

const storageInstance = { kind: "storage" };
const getStorageMock = vi.fn(() => storageInstance);

vi.mock("firebase-admin/app", () => ({
	getApps: getAppsMock,
	getApp: getAppMock,
	initializeApp: initializeAppMock,
	applicationDefault: applicationDefaultMock,
}));

vi.mock("firebase-admin/firestore", () => ({
	getFirestore: getFirestoreMock,
	Timestamp: {
		fromDate: (input: Date) => input,
	},
}));

vi.mock("firebase-admin/storage", () => ({
	getStorage: getStorageMock,
}));

const baseConfig: Config = {
	apiKey: "api",
	firebaseProjectId: "project",
	credentialsPath: "/credentials.json",
	fishTtlMinutes: 60,
	maxPhotoSizeMb: 10,
};

describe("getFirebaseServices", () => {
	beforeEach(() => {
		vi.resetModules();
		apps.splice(0, apps.length);
		getAppsMock.mockClear();
		initializeAppMock.mockClear();
		getAppMock.mockClear();
		applicationDefaultMock.mockClear();
		getFirestoreMock.mockClear();
		getStorageMock.mockClear();
		delete process.env.GOOGLE_APPLICATION_CREDENTIALS;
	});

	afterEach(() => {
		delete process.env.GOOGLE_APPLICATION_CREDENTIALS;
	});

	test("initializes Firebase app and returns services + converters", async () => {
		const { getFirebaseServices } = await import("../firebase.js");

		const services = getFirebaseServices(baseConfig);

		expect(applicationDefaultMock).toHaveBeenCalledTimes(1);
		expect(initializeAppMock).toHaveBeenCalledWith({
			credential: { credential: "default" },
			projectId: baseConfig.firebaseProjectId,
		});
		expect(getFirestoreMock).toHaveBeenCalledWith(appInstance);
		expect(getStorageMock).toHaveBeenCalledWith(appInstance);
		expect(services.firestore).toBe(firestoreInstance);
		expect(services.storage).toBe(storageInstance);
		expect(services.converters.fish).toBeDefined();
		expect(typeof services.converters.fish.toFirestore).toBe("function");
		expect(typeof services.converters.fish.fromFirestore).toBe("function");
		expect(process.env.GOOGLE_APPLICATION_CREDENTIALS).toBe(
			baseConfig.credentialsPath,
		);
	});

	test("reuses existing Firebase app without reinitializing", async () => {
		apps.push(appInstance);
		const { getFirebaseServices } = await import("../firebase.js");

		const services = getFirebaseServices(baseConfig);

		expect(initializeAppMock).not.toHaveBeenCalled();
		expect(getAppMock).toHaveBeenCalledTimes(1);
		expect(services.firestore).toBe(firestoreInstance);
	});

	test("wraps initialization errors in FirebaseInitializationError", async () => {
		initializeAppMock.mockImplementationOnce(() => {
			throw new Error("boom");
		});

		const { getFirebaseServices, FirebaseInitializationError } = await import(
			"../firebase.js"
		);

		let caught: unknown = null;
		try {
			getFirebaseServices(baseConfig);
		} catch (error) {
			caught = error;
		}

		expect(caught).toBeInstanceOf(FirebaseInitializationError);
	});
});
