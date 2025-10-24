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
	expect,
	it,
} from "vitest";
import { deleteApp } from "firebase/app";

const projectId = "photo-security-test";
const rulesPath = join(process.cwd(), "apps/photo/firestore.rules");

let testEnv: Awaited<ReturnType<typeof initializeTestEnvironment>>;

const loadRules = () => readFileSync(rulesPath, "utf8");

beforeAll(async () => {
	testEnv = await initializeTestEnvironment({
		projectId,
		firestore: {
			rules: loadRules(),
		},
	});
});

afterEach(async () => {
	await testEnv.clearFirestore();
});

afterAll(async () => {
	await Promise.all(
		testEnv.apps().map(async (app) => {
			await deleteApp(app);
		}),
	);
});

describe("Firestore security rules", () => {
	it("allows the session owner to read and update status, blocks anonymousUid changes", async () => {
		await testEnv.withSecurityRulesDisabled(async (context) => {
			await context.firestore().doc("visitorSessions/session-1").set({
				anonymousUid: "anon-1",
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

		const ownerDb = testEnv.authenticatedContext("anon-1").firestore();
		await assertSucceeds(ownerDb.doc("visitorSessions/session-1").get());
		await assertSucceeds(
			ownerDb.doc("visitorSessions/session-1").update({
				status: "generating",
				themeId: "theme-fireworks",
			}),
		);
		await assertFails(
			ownerDb.doc("visitorSessions/session-1").update({
				anonymousUid: "anon-2",
			}),
		);

		const strangerDb = testEnv.authenticatedContext("anon-2").firestore();
		await assertFails(strangerDb.doc("visitorSessions/session-1").get());
	});

	it("enforces public access token reads to owning session only", async () => {
		await testEnv.withSecurityRulesDisabled(async (context) => {
			await context.firestore().doc("visitorSessions/session-2").set({
				anonymousUid: "anon-1",
				status: "completed",
				themeId: "theme-fireworks",
				originalImageRef: "originals/session-2.jpg",
				generatedImageRef: "generated/session-2.png",
				publicTokenId: "token-1",
				aquariumEventId: null,
				expiresAt: new Date().toISOString(),
				createdAt: new Date().toISOString(),
				updatedAt: new Date().toISOString(),
			});
			await context.firestore().doc("publicAccessTokens/token-1").set({
				sessionId: "session-2",
				isConsumed: false,
				expiresAt: new Date(Date.now() + 86_400_000).toISOString(),
				createdAt: new Date().toISOString(),
				consumedAt: null,
			});
		});

		const ownerDb = testEnv.authenticatedContext("anon-1").firestore();
		await assertSucceeds(ownerDb.doc("publicAccessTokens/token-1").get());
		const strangerDb = testEnv.authenticatedContext("anon-3").firestore();
		await assertFails(strangerDb.doc("publicAccessTokens/token-1").get());
	});

	it("restricts creation of visitor sessions to authenticated users", async () => {
		const unauthDb = testEnv.unauthenticatedContext().firestore();
		await assertFails(
			unauthDb.doc("visitorSessions/new-session").set({
				anonymousUid: "anon-unauth",
				status: "capturing",
				createdAt: new Date().toISOString(),
				updatedAt: new Date().toISOString(),
				expiresAt: new Date().toISOString(),
			}),
		);
		const ownerDb = testEnv.authenticatedContext("anon-4").firestore();
		await assertSucceeds(
			ownerDb.doc("visitorSessions/new-session").set({
				anonymousUid: "anon-4",
				status: "capturing",
				themeId: null,
				originalImageRef: null,
				generatedImageRef: null,
				publicTokenId: null,
				aquariumEventId: null,
				expiresAt: new Date().toISOString(),
				createdAt: new Date().toISOString(),
				updatedAt: new Date().toISOString(),
			}),
		);
	});
});
