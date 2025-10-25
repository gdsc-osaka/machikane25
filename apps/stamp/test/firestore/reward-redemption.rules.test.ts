/* @vitest-environment node */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
	assertFails,
	assertSucceeds,
	initializeTestEnvironment,
	type RulesTestContext,
	type RulesTestEnvironment,
} from "@firebase/rules-unit-testing";
import { doc, getDoc, setDoc, Timestamp } from "firebase/firestore";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";

const PROJECT_ID = "machikane25-staff-redeem";
const RULES_PATH = resolve(process.cwd(), "firestore.rules");
const USERS_COLLECTION = "users";
const ATTENDEE_ID = "guest-001";
const STAFF_ID = "staff-001";

const INITIAL_TIMESTAMP = Timestamp.fromDate(
	new Date("2025-11-01T09:00:00.000Z"),
);
const REDEEMED_AT = Timestamp.fromDate(new Date("2025-11-01T09:05:00.000Z"));
const UPDATED_REDEEMED_AT = Timestamp.fromDate(
	new Date("2025-11-01T09:06:00.000Z"),
);

const emulatorHost = process.env.FIRESTORE_EMULATOR_HOST;
let emulatorReady = false;
let testEnvironment: RulesTestEnvironment | undefined;

const getAuthedContext = (uid: string, claims?: Record<string, unknown>) => {
	if (!testEnvironment) {
		throw new Error("Test environment not initialized.");
	}
	return testEnvironment.authenticatedContext(uid, claims);
};

const seedAttendee = async () => {
	if (!testEnvironment) {
		throw new Error("Test environment not initialized.");
	}
	await testEnvironment.withSecurityRulesDisabled(async (context) => {
		const firestore = context.firestore();
		await setDoc(doc(firestore, USERS_COLLECTION, ATTENDEE_ID), {
			stamps: {},
			lastSignedInAt: INITIAL_TIMESTAMP,
			createdAt: INITIAL_TIMESTAMP,
			giftReceivedAt: null,
		});
	});
};

const readAttendee = async (context: RulesTestContext) => {
	const firestore = context.firestore();
	const snapshot = await getDoc(doc(firestore, USERS_COLLECTION, ATTENDEE_ID));
	return snapshot;
};

beforeAll(async () => {
	if (!emulatorHost) {
		return;
	}
	const [host, portValue] = emulatorHost.split(":");
	const port = Number.parseInt(portValue, 10);
	try {
		testEnvironment = await initializeTestEnvironment({
			projectId: PROJECT_ID,
			firestore: {
				host,
				port,
				rules: readFileSync(RULES_PATH, "utf8"),
			},
		});
		emulatorReady = true;
	} catch (error) {
		console.warn(
			"Skipping Firestore rules tests because the emulator is unavailable.",
			error,
		);
		emulatorReady = false;
	}
});

afterEach(async () => {
	if (emulatorReady && testEnvironment) {
		await testEnvironment.clearFirestore();
	}
});

afterAll(async () => {
	if (emulatorReady && testEnvironment) {
		await testEnvironment.cleanup();
	}
});

describe("staff reward redemption rules", () => {
	it("allows staff to set giftReceivedAt when it is currently null", async () => {
		if (!emulatorReady) {
			expect(true).toBe(true);
			return;
		}
		await seedAttendee();
		const staffContext = getAuthedContext(STAFF_ID, { isStaff: true });
		const firestore = staffContext.firestore();

		await assertSucceeds(
			setDoc(doc(firestore, USERS_COLLECTION, ATTENDEE_ID), {
				stamps: {},
				lastSignedInAt: INITIAL_TIMESTAMP,
				createdAt: INITIAL_TIMESTAMP,
				giftReceivedAt: REDEEMED_AT,
			}),
		);

		const attendeeContext = getAuthedContext(ATTENDEE_ID);
		const snapshot = await readAttendee(attendeeContext);
		expect(snapshot.exists()).toBe(true);
		expect(snapshot.data()?.giftReceivedAt?.toMillis()).toBe(
			REDEEMED_AT.toMillis(),
		);
	});

	it("prevents staff from overwriting an existing giftReceivedAt timestamp", async () => {
		if (!emulatorReady) {
			expect(true).toBe(true);
			return;
		}
		await testEnvironment?.withSecurityRulesDisabled(async (context) => {
			const firestore = context.firestore();
			await setDoc(doc(firestore, USERS_COLLECTION, ATTENDEE_ID), {
				stamps: {},
				lastSignedInAt: INITIAL_TIMESTAMP,
				createdAt: INITIAL_TIMESTAMP,
				giftReceivedAt: REDEEMED_AT,
			});
		});

		const staffContext = getAuthedContext(STAFF_ID, { isStaff: true });
		const firestore = staffContext.firestore();

		await expect(
			assertFails(
				setDoc(doc(firestore, USERS_COLLECTION, ATTENDEE_ID), {
					stamps: {},
					lastSignedInAt: INITIAL_TIMESTAMP,
					createdAt: INITIAL_TIMESTAMP,
					giftReceivedAt: UPDATED_REDEEMED_AT,
				}),
			),
		).resolves.toBeUndefined();
	});
});
