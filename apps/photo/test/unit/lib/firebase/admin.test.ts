import * as admin from "firebase-admin";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockApp = { name: "test-app" };
const mockAuth = { name: "mock-auth" };
const mockFirestore = { name: "mock-firestore" };
const mockStorage = { name: "mock-storage" };

// Mock firebase-admin
vi.mock("firebase-admin", () => ({
	default: {
		apps: [],
		initializeApp: vi.fn(() => mockApp),
		auth: vi.fn(() => mockAuth),
		firestore: vi.fn(() => mockFirestore),
		storage: vi.fn(() => mockStorage),
		credential: {
			cert: vi.fn((serviceAccount) => ({ serviceAccount })),
			applicationDefault: vi.fn(() => ({ type: "application_default" })),
		},
	},
	apps: [],
	initializeApp: vi.fn(() => mockApp),
	auth: vi.fn(() => mockAuth),
	firestore: vi.fn(() => mockFirestore),
	storage: vi.fn(() => mockStorage),
	credential: {
		cert: vi.fn((serviceAccount) => ({ serviceAccount })),
		applicationDefault: vi.fn(() => ({ type: "application_default" })),
	},
}));

vi.mock("firebase-admin/firestore", () => ({
	getFirestore: vi.fn(() => mockFirestore),
}));

describe("Firebase Admin", () => {
	const originalEnv = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
	const mockServiceAccount = {
		type: "service_account",
		project_id: "test-project",
		private_key_id: "test-key-id",
		private_key: "test-private-key",
		client_email: "test@test-project.iam.gserviceaccount.com",
		client_id: "test-client-id",
		auth_uri: "https://accounts.google.com/o/oauth2/auth",
		token_uri: "https://oauth2.googleapis.com/token",
		auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
	};

	beforeEach(() => {
		vi.clearAllMocks();
		// Reset the apps array
		admin.apps.length = 0;
		// Clear the module cache to reset singleton
		vi.resetModules();
		// Set environment variable
		process.env.FIREBASE_SERVICE_ACCOUNT_JSON =
			JSON.stringify(mockServiceAccount);
	});

	afterEach(() => {
		process.env.FIREBASE_SERVICE_ACCOUNT_JSON = originalEnv;
	});

	describe("getAdminAuth", () => {
		it("should initialize Firebase Admin and return Auth instance", async () => {
			const { getAdminAuth } = await import("@/lib/firebase/admin");
			const auth = getAdminAuth();

			expect(auth).toBeDefined();
			expect(admin.initializeApp).toHaveBeenCalledOnce();
			expect(admin.credential.cert).toHaveBeenCalledWith(mockServiceAccount);
		});

		it("should reuse existing app instance on subsequent calls", async () => {
			const { getAdminAuth } = await import("@/lib/firebase/admin");

			getAdminAuth();
			getAdminAuth();

			expect(admin.initializeApp).toHaveBeenCalledOnce();
		});

		it("should use applicationDefault when FIREBASE_SERVICE_ACCOUNT_JSON is not defined", async () => {
			delete process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
			vi.resetModules();

			const { getAdminAuth } = await import("@/lib/firebase/admin");
			const auth = getAdminAuth();

			expect(auth).toBeDefined();
			expect(admin.credential.applicationDefault).toHaveBeenCalledOnce();
			expect(admin.initializeApp).toHaveBeenCalledOnce();
		});
	});

	describe("getAdminFirestore", () => {
		it("should initialize Firebase Admin and return Firestore instance", async () => {
			const { getAdminFirestore } = await import("@/lib/firebase/admin");
			const firestore = getAdminFirestore();

			expect(firestore).toBeDefined();
			expect(admin.initializeApp).toHaveBeenCalledOnce();
		});

		it("should reuse existing app instance", async () => {
			const { getAdminFirestore } = await import("@/lib/firebase/admin");

			getAdminFirestore();
			getAdminFirestore();

			expect(admin.initializeApp).toHaveBeenCalledOnce();
		});
	});

	describe("getAdminStorage", () => {
		it("should initialize Firebase Admin and return Storage instance", async () => {
			const { getAdminStorage } = await import("@/lib/firebase/admin");
			const storage = getAdminStorage();

			expect(storage).toBeDefined();
			expect(admin.initializeApp).toHaveBeenCalledOnce();
		});

		it("should reuse existing app instance", async () => {
			const { getAdminStorage } = await import("@/lib/firebase/admin");

			getAdminStorage();
			getAdminStorage();

			expect(admin.initializeApp).toHaveBeenCalledOnce();
		});
	});

	describe("singleton pattern", () => {
		it("should share the same app instance across all getters", async () => {
			const { getAdminAuth, getAdminFirestore, getAdminStorage } = await import(
				"@/lib/firebase/admin"
			);

			getAdminAuth();
			getAdminFirestore();
			getAdminStorage();

			expect(admin.initializeApp).toHaveBeenCalledOnce();
		});

		it("should use existing app if admin.apps is not empty", async () => {
			// Simulate an already initialized app
			const existingApp = { name: "existing-app" };
			admin.apps.push(existingApp as never);

			vi.resetModules();
			const { getAdminAuth } = await import("@/lib/firebase/admin");

			getAdminAuth();

			expect(admin.initializeApp).not.toHaveBeenCalled();
		});
	});
});
