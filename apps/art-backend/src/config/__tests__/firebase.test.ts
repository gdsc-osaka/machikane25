import { beforeEach, describe, expect, test, vi } from "vitest";

import type { Config } from "../env.js";
import { getFirebaseServices } from "../firebase.js";

const adminState = vi.hoisted(() => {
	const firestoreInstance = { kind: "firestore" } as const;
	const storageInstance = { kind: "storage" } as const;

	class MockTimestamp {
		readonly millis: number;

		constructor(date: Date) {
			this.millis = date.getTime();
		}

		toDate() {
			return new Date(this.millis);
		}

		toMillis() {
			return this.millis;
		}
	}

	const apps: unknown[] = [];

	const initializeApp = vi.fn((options: unknown) => {
		apps.push({ options });
		return { options };
	});

	const firestoreFactory = vi.fn(() => firestoreInstance);
	const storageFactory = vi.fn(() => storageInstance);

	Object.assign(firestoreFactory, {
		Timestamp: MockTimestamp,
	});

	const credential = {
		cert: vi.fn(() => ({ mock: "cert" })),
	};

	const reset = () => {
		apps.splice(0, apps.length);
		initializeApp.mockClear();
		firestoreFactory.mockClear();
		storageFactory.mockClear();
		credential.cert.mockClear();
	};

	return {
		apps,
		initializeApp,
		firestoreFactory,
		storageFactory,
		credential,
		firestoreInstance,
		storageInstance,
		MockTimestamp,
		reset,
	};
});

const fsState = vi.hoisted(() => {
	const readFileSync = vi.fn(() =>
		JSON.stringify({
			client_email: "service@example.com",
			private_key: "key",
			project_id: "test-project",
		}),
	);

	const reset = () => {
		readFileSync.mockClear();
		readFileSync.mockImplementation(() =>
			JSON.stringify({
				client_email: "service@example.com",
				private_key: "key",
				project_id: "test-project",
			}),
		);
	};

	return {
		readFileSync,
		reset,
	};
});

vi.mock("firebase-admin", () => ({
	default: {
		apps: adminState.apps,
		initializeApp: adminState.initializeApp,
		firestore: adminState.firestoreFactory,
		storage: adminState.storageFactory,
		credential: adminState.credential,
	},
}));

vi.mock("node:fs", () => ({
	readFileSync: fsState.readFileSync,
	default: {
		readFileSync: fsState.readFileSync,
	},
}));

const baseConfig: Config = {
	apiKey: "test-key",
	firebaseProjectId: "test-project",
	credentialsPath: "/tmp/service-account.json",
	fishTtlMinutes: 60,
	maxPhotoSizeMb: 8,
};

describe("getFirebaseServices", () => {
	beforeEach(() => {
		adminState.reset();
		fsState.reset();
	});

	test("initialises Firebase Admin with credentials from disk", () => {
		const services = getFirebaseServices(baseConfig);

		expect(fsState.readFileSync).toHaveBeenCalledWith(
			"/tmp/service-account.json",
			"utf8",
		);
		expect(adminState.credential.cert).toHaveBeenCalledWith(
			expect.objectContaining({
				client_email: "service@example.com",
				private_key: "key",
			}),
		);
		expect(adminState.initializeApp).toHaveBeenCalledTimes(1);
		expect(services.firestore).toBe(adminState.firestoreInstance);
		expect(services.storage).toBe(adminState.storageInstance);
	});

	test("reuses existing Firebase app without reinitialising", () => {
		const services = getFirebaseServices(baseConfig);
		const second = getFirebaseServices(baseConfig);

		expect(services.firestore).toBe(adminState.firestoreInstance);
		expect(second.storage).toBe(adminState.storageInstance);
		expect(adminState.initializeApp).toHaveBeenCalledTimes(1);
	});

	test("provides fish converter utilities", () => {
		const services = getFirebaseServices(baseConfig);

		const fishDocument = {
			id: "fish-123",
			imageUrl: "https://example.com/fish.png",
			imagePath: "fish_images/fish-123/fish.png",
			color: "#ff0000",
			createdAt: new adminState.MockTimestamp(new Date()),
		};

		const serialized = services.converters.fish.toFirestore(fishDocument);
		expect(serialized).toBe(fishDocument);
	});
});
