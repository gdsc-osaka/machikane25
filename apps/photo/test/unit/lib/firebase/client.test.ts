import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Mock Firebase modules
vi.mock("firebase/app", () => ({
	getApps: vi.fn(() => []),
	initializeApp: vi.fn(() => ({ name: "test-app" })),
}));

vi.mock("firebase/auth", () => ({
	getAuth: vi.fn(() => ({ name: "mock-auth" })),
	connectAuthEmulator: vi.fn(),
	onAuthStateChanged: vi.fn((_auth, callback) => {
		callback({ uid: "test-user", isAnonymous: true });
		return vi.fn(); // Return unsubscribe function
	}),
	signInAnonymously: vi.fn(() =>
		Promise.resolve({
			user: { uid: "test-user", isAnonymous: true },
		}),
	),
}));

vi.mock("firebase/firestore", () => ({
	getFirestore: vi.fn(() => ({ name: "mock-firestore" })),
	connectFirestoreEmulator: vi.fn(),
}));

vi.mock("firebase/storage", () => ({
	getStorage: vi.fn(() => ({ name: "mock-storage" })),
	connectStorageEmulator: vi.fn(),
}));

describe("Firebase Client", () => {
	const originalEnv = process.env.NEXT_PUBLIC_FIREBASE_CONFIG;
	const mockConfig = {
		apiKey: "test-api-key",
		authDomain: "test-auth-domain",
		projectId: "test-project-id",
		storageBucket: "test-storage-bucket",
		messagingSenderId: "test-sender-id",
		appId: "test-app-id",
	};

	beforeEach(async () => {
		vi.clearAllMocks();
		process.env.NEXT_PUBLIC_FIREBASE_CONFIG = JSON.stringify(mockConfig);

		// Reset module cache to ensure fresh imports
		vi.resetModules();
	});

	afterEach(() => {
		process.env.NEXT_PUBLIC_FIREBASE_CONFIG = originalEnv;
	});

	describe("getFirebaseAuth", () => {
		it("should initialize and return Auth instance", async () => {
			const { getFirebaseAuth } = await import("@/lib/firebase/client");
			const auth = getFirebaseAuth();

			expect(auth).toBeDefined();
			expect(auth.name).toBe("mock-auth");
		});

		it("should throw error when config is not defined", async () => {
			delete process.env.NEXT_PUBLIC_FIREBASE_CONFIG;
			vi.resetModules();

			const { getFirebaseAuth } = await import("@/lib/firebase/client");

			expect(() => getFirebaseAuth()).toThrow(
				"NEXT_PUBLIC_FIREBASE_CONFIG is not defined",
			);
		});
	});

	describe("getFirebaseFirestore", () => {
		it("should initialize and return Firestore instance", async () => {
			const { getFirebaseFirestore } = await import("@/lib/firebase/client");
			const firestore = getFirebaseFirestore();

			expect(firestore).toBeDefined();
			expect((firestore as { name?: string }).name).toBe("mock-firestore");
		});
	});

	describe("getFirebaseStorage", () => {
		it("should initialize and return Storage instance", async () => {
			const { getFirebaseStorage } = await import("@/lib/firebase/client");
			const storage = getFirebaseStorage();

			expect(storage).toBeDefined();
			expect((storage as { name?: string }).name).toBe("mock-storage");
		});
	});

	describe("ensureAnonymousSignIn", () => {
		it("should resolve with existing user if already signed in", async () => {
			const { onAuthStateChanged } = await import("firebase/auth");
			vi.mocked(onAuthStateChanged).mockImplementation((_auth, callback) => {
				// Use setTimeout to ensure unsubscribe is assigned before callback is called
				setTimeout(
					() =>
						(callback as (user: unknown) => void)({
							uid: "existing-user",
							isAnonymous: true,
						}),
					0,
				);
				return vi.fn();
			});

			vi.resetModules();
			const { ensureAnonymousSignIn } = await import("@/lib/firebase/client");

			const user = await ensureAnonymousSignIn();

			expect(user).toBeDefined();
			expect(user.uid).toBe("existing-user");
		});

		it("should sign in anonymously if no user is signed in", async () => {
			const { onAuthStateChanged, signInAnonymously } = await import(
				"firebase/auth"
			);
			vi.mocked(onAuthStateChanged).mockImplementation((_auth, callback) => {
				// Use setTimeout to ensure unsubscribe is assigned before callback is called
				setTimeout(() => (callback as (user: unknown) => void)(null), 0);
				return vi.fn();
			});
			vi.mocked(signInAnonymously).mockResolvedValue({
				user: { uid: "new-anonymous-user", isAnonymous: true },
			} as never);

			vi.resetModules();
			const { ensureAnonymousSignIn } = await import("@/lib/firebase/client");

			const user = await ensureAnonymousSignIn();

			expect(user).toBeDefined();
			expect(user.uid).toBe("new-anonymous-user");
			expect(signInAnonymously).toHaveBeenCalled();
		});

		it("should reject if sign in fails", async () => {
			const { onAuthStateChanged, signInAnonymously } = await import(
				"firebase/auth"
			);
			vi.mocked(onAuthStateChanged).mockImplementation((_auth, callback) => {
				// Use setTimeout to ensure unsubscribe is assigned before callback is called
				setTimeout(() => (callback as (user: unknown) => void)(null), 0);
				return vi.fn();
			});
			vi.mocked(signInAnonymously).mockRejectedValue(
				new Error("Sign in failed"),
			);

			vi.resetModules();
			const { ensureAnonymousSignIn } = await import("@/lib/firebase/client");

			await expect(ensureAnonymousSignIn()).rejects.toThrow("Sign in failed");
		});

		it("should reject if auth state check fails", async () => {
			const { onAuthStateChanged } = await import("firebase/auth");
			vi.mocked(onAuthStateChanged).mockImplementation(
				(_auth, _successCallback, errorCallback) => {
					errorCallback?.(new Error("Auth state check failed"));
					return vi.fn();
				},
			);

			vi.resetModules();
			const { ensureAnonymousSignIn } = await import("@/lib/firebase/client");

			await expect(ensureAnonymousSignIn()).rejects.toThrow(
				"Auth state check failed",
			);
		});
	});

	describe("initializeFirebaseClient", () => {
		it("should initialize all Firebase services", async () => {
			const { initializeApp } = await import("firebase/app");
			const { getAuth, connectAuthEmulator } = await import("firebase/auth");
			const { getFirestore, connectFirestoreEmulator } = await import(
				"firebase/firestore"
			);
			const { getStorage, connectStorageEmulator } = await import(
				"firebase/storage"
			);

			const { initializeFirebaseClient } = await import(
				"@/lib/firebase/client"
			);

			initializeFirebaseClient();

			expect(initializeApp).toHaveBeenCalled();
			expect(getAuth).toHaveBeenCalled();
			expect(getFirestore).toHaveBeenCalled();
			expect(getStorage).toHaveBeenCalled();
			expect(connectAuthEmulator).toHaveBeenCalled();
			expect(connectFirestoreEmulator).toHaveBeenCalled();
			expect(connectStorageEmulator).toHaveBeenCalled();
		});

		it("should use existing app if already initialized", async () => {
			const { getApps, initializeApp } = await import("firebase/app");
			const existingApp = { name: "existing-app" };
			vi.mocked(getApps).mockReturnValue([existingApp] as never);

			vi.resetModules();
			const { initializeFirebaseClient } = await import(
				"@/lib/firebase/client"
			);

			initializeFirebaseClient();

			expect(initializeApp).not.toHaveBeenCalled();
		});

		it("should not reconnect to emulator on subsequent calls", async () => {
			const { connectAuthEmulator } = await import("firebase/auth");

			vi.resetModules();
			const { initializeFirebaseClient } = await import(
				"@/lib/firebase/client"
			);

			initializeFirebaseClient();
			const firstCallCount = vi.mocked(connectAuthEmulator).mock.calls.length;

			initializeFirebaseClient();
			const secondCallCount = vi.mocked(connectAuthEmulator).mock.calls.length;

			expect(secondCallCount).toBe(firstCallCount);
		});
	});
});
