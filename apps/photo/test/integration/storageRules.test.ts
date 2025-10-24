import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
	assertFails,
	assertSucceeds,
	initializeTestEnvironment,
} from "@firebase/rules-unit-testing";
import {
	afterAll,
	afterEach,
	beforeAll,
	describe,
	it,
} from "vitest";
import { deleteApp } from "firebase/app";

const projectId = "photo-storage-security-test";
const rulesPath = join(process.cwd(), "apps/photo/storage.rules");
const firestoreRulesPath = join(process.cwd(), "apps/photo/firestore.rules");

let testEnv: Awaited<ReturnType<typeof initializeTestEnvironment>>;

const loadRules = (path: string) => readFileSync(path, "utf8");

beforeAll(async () => {
	testEnv = await initializeTestEnvironment({
		projectId,
		firestore: {
			rules: loadRules(firestoreRulesPath),
		},
		storage: {
			rules: loadRules(rulesPath),
		},
	});
});

afterEach(async () => {
	await testEnv.clearFirestore();
	await testEnv.clearStorage();
});

afterAll(async () => {
	await Promise.all(
		testEnv.apps().map(async (app) => {
			await deleteApp(app);
		}),
	);
});

describe("Storage security rules", () => {
	it("permits original uploads for the owning session and blocks others", async () => {
		await testEnv.withSecurityRulesDisabled(async (context) => {
			await context.firestore().doc("visitorSessions/session-10").set({
				anonymousUid: "anon-10",
				status: "capturing",
				themeId: null,
				originalImageRef: null,
				generatedImageRef: null,
				publicTokenId: null,
				aquariumEventId: null,
				expiresAt: new Date().toISOString(),
				createdAt: new Date().toISOString(),
				updatedAt: new Date().toISOString(),
			});
		});
		const ownerStorage = testEnv.authenticatedContext("anon-10").storage();
		const ownerFile = ownerStorage.ref(
			"originals/session-10/source.jpg",
		);
		await assertSucceeds(
			ownerFile.putString("binary-data", "raw", {
				contentType: "image/jpeg",
			}),
		);

		const strangerStorage = testEnv.authenticatedContext("anon-stranger").storage();
		const strangerFile = strangerStorage.ref(
			"originals/session-10/source.jpg",
		);
		await assertFails(
			strangerFile.putString("binary-data", "raw", {
				contentType: "image/jpeg",
			}),
		);
	});

	it("allows generated asset reads for session owners while keeping originals private", async () => {
		await testEnv.withSecurityRulesDisabled(async (context) => {
			await context.firestore().doc("visitorSessions/session-11").set({
				anonymousUid: "anon-11",
				status: "completed",
				themeId: "theme",
				originalImageRef: "originals/session-11/source.jpg",
				generatedImageRef: "generated/session-11/result.png",
				publicTokenId: "token-11",
				aquariumEventId: null,
				expiresAt: new Date().toISOString(),
				createdAt: new Date().toISOString(),
				updatedAt: new Date().toISOString(),
			});
		});
		const ownerStorage = testEnv.authenticatedContext("anon-11").storage();
		await testEnv.withSecurityRulesDisabled(async (context) => {
			const bucket = context.storage().bucket();
			await bucket
				.file("generated/session-11/result.png")
				.save("png-data", { contentType: "image/png" });
			await bucket
				.file("originals/session-11/source.jpg")
				.save("jpeg-data", { contentType: "image/jpeg" });
		});
		const generatedRef = ownerStorage.ref("generated/session-11/result.png");
		await assertSucceeds(generatedRef.getDownloadURL());
		const originalRef = ownerStorage.ref("originals/session-11/source.jpg");
		await assertFails(originalRef.getDownloadURL());
	});
});
