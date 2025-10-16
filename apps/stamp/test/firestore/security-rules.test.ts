/* @vitest-environment node */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { afterAll, afterEach, beforeAll, describe, expect, test } from "vitest";
import {
	assertFails,
	assertSucceeds,
	initializeTestEnvironment,
	type RulesTestEnvironment,
} from "@firebase/rules-unit-testing";
import { doc, getDoc, setDoc, Timestamp } from "firebase/firestore";

interface AttendeeDocument {
	stamps: Record<string, Timestamp>;
	lastSignedInAt: Timestamp;
	createdAt: Timestamp;
	giftReceivedAt: Timestamp | null;
}

interface TestEnvironmentHolder {
	env?: RulesTestEnvironment;
}

interface FirestoreEmulatorConfig {
	host: string;
	port: number;
}

const PROJECT_ID = "machikane25-stamp-security";
const RULES_PATH = resolve(process.cwd(), "firestore.rules");
const ATTENDEE_ID = "attendee-uid";
const STAFF_ID = "staff-uid";
const INITIAL_TIMESTAMP = Timestamp.fromDate(new Date("2025-01-01T00:00:00.000Z"));
const UPDATED_TIMESTAMP = Timestamp.fromDate(new Date("2025-01-01T00:05:00.000Z"));
const REDEEMED_TIMESTAMP = Timestamp.fromDate(new Date("2025-01-01T00:10:00.000Z"));
const environmentHolder: TestEnvironmentHolder = {};

const getEnvironment = () => {
	if (!environmentHolder.env) {
		throw new Error("Test environment not initialized.");
	}
	return environmentHolder.env;
};

const createFirestoreEmulatorConfig = (): FirestoreEmulatorConfig => {
	const hostSetting = process.env.FIRESTORE_EMULATOR_HOST;
	if (!hostSetting) {
		throw new Error(
			"FIRESTORE_EMULATOR_HOST is not defined. Run tests via firebase emulators:exec.",
		);
	}
	const segments = hostSetting.split(":");
	if (segments.length !== 2) {
		throw new Error(
			"FIRESTORE_EMULATOR_HOST must follow the 'host:port' format.",
		);
	}
	const [host, portValue] = segments;
	const port = Number.parseInt(portValue, 10);
	if (Number.isNaN(port)) {
		throw new Error("FIRESTORE_EMULATOR_HOST port must be numeric.");
	}
	return { host, port };
};

const FIRESTORE_EMULATOR = createFirestoreEmulatorConfig();

const buildAttendeeDocument = (overrides?: {
	stamps?: Record<string, Timestamp>;
	lastSignedInAt?: Timestamp;
	giftReceivedAt?: Timestamp | null;
}) => {
	const base: AttendeeDocument = {
		stamps: overrides?.stamps ?? {},
		lastSignedInAt: overrides?.lastSignedInAt ?? INITIAL_TIMESTAMP,
		createdAt: INITIAL_TIMESTAMP,
		giftReceivedAt: overrides?.giftReceivedAt ?? null,
	};
	return base;
};

const seedAttendeeDocument = async (
	env: RulesTestEnvironment,
	document: AttendeeDocument,
) => {
	await env.withSecurityRulesDisabled(async (context) => {
		const database = context.firestore();
		await setDoc(doc(database, "users", ATTENDEE_ID), document);
	});
};

beforeAll(async () => {
	const env = await initializeTestEnvironment({
		projectId: PROJECT_ID,
		firestore: {
			host: FIRESTORE_EMULATOR.host,
			port: FIRESTORE_EMULATOR.port,
			rules: readFileSync(RULES_PATH, "utf8"),
		},
	});
	environmentHolder.env = env;
});

afterEach(async () => {
	const env = getEnvironment();
	await env.clearFirestore();
});

afterAll(async () => {
	const env = getEnvironment();
	await env.cleanup();
});

describe("Firestore security rules for attendee documents", () => {
	test("allows an attendee to append a new stamp timestamp", async () => {
		const env = getEnvironment();
		await seedAttendeeDocument(env, buildAttendeeDocument());

		const attendeeContext = env.authenticatedContext(ATTENDEE_ID);
		const attendeeDb = attendeeContext.firestore();
		const result = await assertSucceeds(
			setDoc(doc(attendeeDb, "users", ATTENDEE_ID), {
				stamps: { reception: UPDATED_TIMESTAMP },
				lastSignedInAt: UPDATED_TIMESTAMP,
				createdAt: INITIAL_TIMESTAMP,
				giftReceivedAt: null,
			}),
		);
		expect(result).toBeUndefined();
	});

	test("rejects attendee updates when lastSignedInAt is not a timestamp", async () => {
		const env = getEnvironment();
		await seedAttendeeDocument(env, buildAttendeeDocument());

		const attendeeContext = env.authenticatedContext(ATTENDEE_ID);
		const attendeeDb = attendeeContext.firestore();

		await expect(
			assertFails(
				setDoc(doc(attendeeDb, "users", ATTENDEE_ID), {
					stamps: {},
					lastSignedInAt: "not-a-timestamp",
					createdAt: INITIAL_TIMESTAMP,
					giftReceivedAt: null,
				}),
			),
		).resolves.toBeUndefined();
	});

	test("allows a staff member to set giftReceivedAt for redemption", async () => {
		const env = getEnvironment();
		await seedAttendeeDocument(env, buildAttendeeDocument());

		const staffContext = env.authenticatedContext(STAFF_ID, { isStaff: true });
		const staffDb = staffContext.firestore();

		await assertSucceeds(
			setDoc(doc(staffDb, "users", ATTENDEE_ID), {
				stamps: {},
				lastSignedInAt: INITIAL_TIMESTAMP,
				createdAt: INITIAL_TIMESTAMP,
				giftReceivedAt: REDEEMED_TIMESTAMP,
			}),
		);

		const attendeeContext = env.authenticatedContext(ATTENDEE_ID);
		const attendeeDb = attendeeContext.firestore();
		const snapshot = await getDoc(doc(attendeeDb, "users", ATTENDEE_ID));
		expect(snapshot.exists()).toBe(true);
		expect(snapshot.data()?.giftReceivedAt?.toMillis()).toBe(
			REDEEMED_TIMESTAMP.toMillis(),
		);
	});

	test("rejects staff updates that overwrite an existing redemption timestamp", async () => {
		const env = getEnvironment();
		await seedAttendeeDocument(
			env,
			buildAttendeeDocument({ giftReceivedAt: REDEEMED_TIMESTAMP }),
		);

		const staffContext = env.authenticatedContext(STAFF_ID, { isStaff: true });
		const staffDb = staffContext.firestore();

		await expect(
			assertFails(
				setDoc(doc(staffDb, "users", ATTENDEE_ID), {
					stamps: {},
					lastSignedInAt: INITIAL_TIMESTAMP,
					createdAt: INITIAL_TIMESTAMP,
					giftReceivedAt: UPDATED_TIMESTAMP,
				}),
			),
		).resolves.toBeUndefined();
	});
});
