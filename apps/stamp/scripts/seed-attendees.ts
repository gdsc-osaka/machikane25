/**
 * Seed sample attendees and stamp progress into the Firebase emulator.
 *
 * Usage:
 *   FIRESTORE_EMULATOR_HOST=localhost:8080 \
 *   FIREBASE_AUTH_EMULATOR_HOST=localhost:9099 \
 *   pnpm --filter stamp exec tsx apps/stamp/scripts/seed-attendees.ts
 */
import { randomUUID } from "node:crypto";
import { initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore, Timestamp } from "firebase-admin/firestore";

const projectId = process.env.FIREBASE_PROJECT_ID ?? "machikane25";
const emulatorHost = process.env.FIRESTORE_EMULATOR_HOST;

initializeApp({ projectId });

const auth = getAuth();
const firestore = getFirestore();

if (emulatorHost) {
	firestore.settings({
		host: emulatorHost,
		ssl: false,
		ignoreUndefinedProperties: true,
	});
}

type SeedAttendee = {
	email: string;
	preGrant?: Array<"reception" | "photobooth" | "art" | "robot" | "survey">;
};

const attendees: SeedAttendee[] = [
	{ email: "attendee-one@example.com", preGrant: ["reception"] },
	{
		email: "attendee-two@example.com",
		preGrant: ["reception", "photobooth", "art", "robot"],
	},
	{ email: "attendee-complete@example.com", preGrant: ["reception", "photobooth", "art", "robot", "survey"] },
];

async function createAnonymousUser(email: string) {
	const { uid } = await auth.createUser({
		email,
		emailVerified: true,
		password: randomUUID(),
		disabled: false,
	});
	return uid;
}

async function writeAttendeeDocument(uid: string, preGrant: SeedAttendee["preGrant"] = []) {
	const stampEntries: Record<string, Timestamp> = {};
	const serverTime = Timestamp.now();

	for (const stampId of preGrant) {
		stampEntries[stampId] = serverTime;
	}

	await firestore.collection("users").doc(uid).set(
		{
			stamps: stampEntries,
			surveyCompleted: preGrant.includes("survey"),
			rewardEligible: preGrant.length >= 5,
			lastSignedInAt: serverTime,
			createdAt: serverTime,
		},
		{ merge: true },
	);
}

async function main() {
	console.log("Seeding attendees into project:", projectId);
	for (const attendee of attendees) {
		const uid = await createAnonymousUser(attendee.email);
		await writeAttendeeDocument(uid, attendee.preGrant);
		console.log(`Seeded attendee ${attendee.email} (uid: ${uid})`);
	}
	console.log("Seeding complete.");
}

main().catch((error) => {
	console.error("Failed to seed attendees", error);
	process.exit(1);
});
