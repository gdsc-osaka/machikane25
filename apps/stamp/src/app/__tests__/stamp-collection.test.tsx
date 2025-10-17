/* @vitest-environment node */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
	afterAll,
	afterEach,
	beforeAll,
	describe,
	expect,
	test,
} from "vitest";
import {
	initializeTestEnvironment,
	type RulesTestEnvironment,
} from "@firebase/rules-unit-testing";
import { doc, getDoc, Timestamp } from "firebase/firestore";
import type { StampCheckpointKey } from "@/domain/stamp";
import { createStampRepository } from "@/infra/firestore/stamp-repository";
import { createClaimStampService } from "@/application/stamps/claim-stamp";

const PROJECT_ID = "machikane25-stamp-collection";
const RULES_PATH = resolve(process.cwd(), "firestore.rules");
const ATTENDEE_COLLECTION = "users";
const STAMP_ORDER: ReadonlyArray<StampCheckpointKey> = [
	"reception",
	"photobooth",
	"art",
	"robot",
];

const TOKENS: Record<string, StampCheckpointKey> = {
	"token-reception": "reception",
	"token-photobooth": "photobooth",
	"token-art": "art",
	"token-robot": "robot",
};

const NEXT_TIMESTAMP = () => Timestamp.fromDate(new Date("2025-10-16T09:00:00Z"));

let testEnvironment: RulesTestEnvironment;

type FirestoreEmulatorConfig = {
	host: string;
	port: number;
};

const parseFirestoreEmulatorConfig = (): FirestoreEmulatorConfig => {
	const setting = process.env.FIRESTORE_EMULATOR_HOST;
	if (!setting) {
		throw new Error(
			"FIRESTORE_EMULATOR_HOST is not defined. Run tests via firebase emulators:exec.",
		);
	}
	const [host, portValue] = setting.split(":");
	if (!host || !portValue) {
		throw new Error(
			"FIRESTORE_EMULATOR_HOST must follow the 'host:port' format.",
		);
	}
	const port = Number.parseInt(portValue, 10);
	if (Number.isNaN(port)) {
		throw new Error("FIRESTORE_EMULATOR_HOST port must be numeric.");
	}
	return { host, port };
};

const FIRESTORE_EMULATOR = parseFirestoreEmulatorConfig();

const createService = (userId: string) => {
	const context = testEnvironment.authenticatedContext(userId);
	const firestore = context.firestore();
	const repository = createStampRepository({
		firestore,
		collectionPath: ATTENDEE_COLLECTION,
	});
	return createClaimStampService({
		repository,
		resolveCheckpoint: (token) => TOKENS[token] ?? null,
		order: STAMP_ORDER,
		clock: NEXT_TIMESTAMP,
	});
};

beforeAll(async () => {
	testEnvironment = await initializeTestEnvironment({
		projectId: PROJECT_ID,
		firestore: {
			host: FIRESTORE_EMULATOR.host,
			port: FIRESTORE_EMULATOR.port,
			rules: readFileSync(RULES_PATH, "utf8"),
		},
	});
});

afterEach(async () => {
	await testEnvironment.clearFirestore();
});

afterAll(async () => {
	await testEnvironment.cleanup();
});

describe("anonymous attendee stamp collection flow", () => {
	test("collects each exhibit stamp and persists progress across reloads", async () => {
		const userId = "attendee-collects-all";
		const service = createService(userId);

		for (const [token, checkpoint] of Object.entries(TOKENS)) {
			const result = await service.claim({
				token,
				userId,
			});

			expect(result.isOk()).toBe(true);
			const snapshot = result._unsafeUnwrap();
			expect(snapshot.progress.collected).toContain(checkpoint);
		}

		const context = testEnvironment.authenticatedContext(userId);
		const firestore = context.firestore();
		const attendeeDoc = await getDoc(
			doc(firestore, ATTENDEE_COLLECTION, userId),
		);
		expect(attendeeDoc.exists()).toBe(true);

		const data = attendeeDoc.data();
		expect(data?.stamps).toMatchObject({
			reception: expect.any(Timestamp),
			photobooth: expect.any(Timestamp),
			art: expect.any(Timestamp),
			robot: expect.any(Timestamp),
		});
	});
});
