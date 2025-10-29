import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
	assertFails,
	assertSucceeds,
	initializeTestEnvironment,
	type RulesTestEnvironment,
} from "@firebase/rules-unit-testing";
import {
	addDoc,
	collection,
	deleteDoc,
	doc,
	getDoc,
	serverTimestamp,
	setDoc,
	updateDoc,
} from "firebase/firestore";
import { afterAll, beforeAll, beforeEach, describe, it } from "vitest";

/**
 * T203 [P] [FOUND] Integration Test (Security Rules)
 *
 * Firebase Test SDK（@firebase/rules-unit-testing）を使用。
 * Setup: EmulatorのFirestoreをクリアし、options Cにマスターデータを投入。
 * options C: 匿名ユーザー（auth = { uid: 'anon-user' }）でoptions Cのget()が成功することをアサート。
 * booths C: 匿名ユーザーでbooths Cのget()が成功。update()（state変更など）も成功することをアサート。
 * uploadedPhotos C: 匿名ユーザーでuploadedPhotos Cへのadd()が成功。
 * generatedPhotos C: 匿名ユーザー（未認証でも可）でgeneratedPhotos Cのget()が成功。
 * Admin: 管理者ユーザー（auth = { uid: 'admin-user', token: { role: 'admin' } }）で全コレクションへのread/writeが成功することをアサート。
 */

const PROJECT_ID = "photo-test";
const FIRESTORE_RULES_PATH = join(process.cwd(), "firestore.rules");

let testEnv: RulesTestEnvironment;

// Note: These tests require Firebase Emulator to be running
// Skip if emulator is not running to avoid connection errors
describe("Firestore Security Rules", () => {
	beforeAll(async () => {
		// Load firestore rules
		const rulesContent = readFileSync(FIRESTORE_RULES_PATH, "utf8");

		// Initialize test environment
		testEnv = await initializeTestEnvironment({
			projectId: PROJECT_ID,
			firestore: {
				rules: rulesContent,
				host: "localhost",
				port: 11002,
			},
		});
	});

	afterAll(async () => {
		await testEnv.cleanup();
	});

	beforeEach(async () => {
		// Clear Firestore data before each test
		await testEnv.clearFirestore();

		// Seed options collection with master data
		const adminContext = testEnv.authenticatedContext("admin-setup", {
			role: "admin",
		});
		const adminDb = adminContext.firestore();

		const optionsData = [
			{
				id: "location-1",
				typeId: "location",
				value: "beach",
				displayName: "Beach",
				createdAt: serverTimestamp(),
				updatedAt: serverTimestamp(),
			},
			{
				id: "outfit-1",
				typeId: "outfit",
				value: "casual",
				displayName: "Casual",
				createdAt: serverTimestamp(),
				updatedAt: serverTimestamp(),
			},
		];

		for (const option of optionsData) {
			const { id, ...data } = option;
			await setDoc(doc(adminDb, "options", id), data);
		}
	});

	describe("Options Collection", () => {
		it("should allow anonymous user to read options", async () => {
			const anonContext = testEnv.authenticatedContext("anon-user");
			const anonDb = anonContext.firestore();

			await assertSucceeds(getDoc(doc(anonDb, "options", "location-1")));
		});

		it("should deny anonymous user to write options", async () => {
			const anonContext = testEnv.authenticatedContext("anon-user");
			const anonDb = anonContext.firestore();

			await assertFails(
				setDoc(doc(anonDb, "options", "new-option"), {
					typeId: "location",
					value: "mountain",
					displayName: "Mountain",
					createdAt: serverTimestamp(),
					updatedAt: serverTimestamp(),
				}),
			);
		});

		it("should allow admin user to read and write options", async () => {
			const adminContext = testEnv.authenticatedContext("admin-user", {
				role: "admin",
			});
			const adminDb = adminContext.firestore();

			// Read
			await assertSucceeds(getDoc(doc(adminDb, "options", "location-1")));

			// Write
			await assertSucceeds(
				setDoc(doc(adminDb, "options", "new-option"), {
					typeId: "style",
					value: "vibrant",
					displayName: "Vibrant",
					createdAt: serverTimestamp(),
					updatedAt: serverTimestamp(),
				}),
			);
		});
	});

	describe("Booths Collection", () => {
		beforeEach(async () => {
			// Setup: Create a booth document as admin
			const adminContext = testEnv.authenticatedContext("admin-setup", {
				role: "admin",
			});
			const adminDb = adminContext.firestore();

			await setDoc(doc(adminDb, "booths", "booth-1"), {
				state: "idle",
				latestPhotoId: null,
				lastTakePhotoAt: null,
				createdAt: serverTimestamp(),
			});
		});

		it("should allow anonymous user to read booths", async () => {
			const anonContext = testEnv.authenticatedContext("anon-user");
			const anonDb = anonContext.firestore();

			await assertSucceeds(getDoc(doc(anonDb, "booths", "booth-1")));
		});

		it("should allow anonymous user to update booths", async () => {
			const anonContext = testEnv.authenticatedContext("anon-user");
			const anonDb = anonContext.firestore();

			await assertSucceeds(
				updateDoc(doc(anonDb, "booths", "booth-1"), {
					state: "menu",
				}),
			);
		});

		it("should deny anonymous user to create new booths", async () => {
			const anonContext = testEnv.authenticatedContext("anon-user");
			const anonDb = anonContext.firestore();

			await assertFails(
				setDoc(doc(anonDb, "booths", "booth-2"), {
					state: "idle",
					latestPhotoId: null,
					lastTakePhotoAt: null,
					createdAt: serverTimestamp(),
				}),
			);
		});

		it("should allow admin user to create, read, and update booths", async () => {
			const adminContext = testEnv.authenticatedContext("admin-user", {
				role: "admin",
			});
			const adminDb = adminContext.firestore();

			// Create
			await assertSucceeds(
				setDoc(doc(adminDb, "booths", "booth-2"), {
					state: "idle",
					latestPhotoId: null,
					lastTakePhotoAt: null,
					createdAt: serverTimestamp(),
				}),
			);

			// Read
			await assertSucceeds(getDoc(doc(adminDb, "booths", "booth-2")));

			// Update
			await assertSucceeds(
				updateDoc(doc(adminDb, "booths", "booth-2"), {
					state: "capturing",
				}),
			);
		});
	});

	describe("UploadedPhotos Sub-collection", () => {
		beforeEach(async () => {
			// Setup: Create a booth document as admin
			const adminContext = testEnv.authenticatedContext("admin-setup", {
				role: "admin",
			});
			const adminDb = adminContext.firestore();

			await setDoc(doc(adminDb, "booths", "booth-1"), {
				state: "idle",
				latestPhotoId: null,
				lastTakePhotoAt: null,
				createdAt: serverTimestamp(),
			});
		});

		it("should allow anonymous user to add uploaded photos", async () => {
			const anonContext = testEnv.authenticatedContext("anon-user");
			const anonDb = anonContext.firestore();

			await assertSucceeds(
				addDoc(collection(anonDb, "booths/booth-1/uploadedPhotos"), {
					imageUrl: "https://storage.example.com/photo.png",
					imagePath: "photos/photo-123/photo.png",
					createdAt: serverTimestamp(),
				}),
			);
		});

		it("should allow anonymous user to read uploaded photos", async () => {
			const anonContext = testEnv.authenticatedContext("anon-user");
			const anonDb = anonContext.firestore();

			// First, create a photo
			const photoRef = await addDoc(
				collection(anonDb, "booths/booth-1/uploadedPhotos"),
				{
					imageUrl: "https://storage.example.com/photo.png",
					imagePath: "photos/photo-123/photo.png",
					createdAt: serverTimestamp(),
				},
			);

			// Then, read it
			await assertSucceeds(getDoc(photoRef));
		});

		it("should allow admin user to delete uploaded photos", async () => {
			// Setup: Create a photo as anonymous user
			const anonContext = testEnv.authenticatedContext("anon-user");
			const anonDb = anonContext.firestore();

			const photoRef = await addDoc(
				collection(anonDb, "booths/booth-1/uploadedPhotos"),
				{
					imageUrl: "https://storage.example.com/photo.png",
					imagePath: "photos/photo-123/photo.png",
					createdAt: serverTimestamp(),
				},
			);

			// Admin should be able to delete
			const adminContext = testEnv.authenticatedContext("admin-user", {
				role: "admin",
			});
			const adminDb = adminContext.firestore();
			const adminPhotoRef = doc(adminDb, photoRef.path);

			await assertSucceeds(deleteDoc(adminPhotoRef));
		});
	});

	describe("GeneratedPhotos Collection", () => {
		beforeEach(async () => {
			// Setup: Create a booth and a generated photo as admin
			const adminContext = testEnv.authenticatedContext("admin-setup", {
				role: "admin",
			});
			const adminDb = adminContext.firestore();

			await setDoc(doc(adminDb, "booths", "booth-1"), {
				state: "idle",
				latestPhotoId: null,
				lastTakePhotoAt: null,
				createdAt: serverTimestamp(),
			});

			await setDoc(
				doc(adminDb, "booths/booth-1/generatedPhotos", "photo-1"),
				{
					imageUrl: "https://storage.example.com/generated.png",
					imagePath: "generated_photos/photo-1/photo.png",
					boothId: "booth-1",
					createdAt: serverTimestamp(),
				},
			);
		});

		it("should allow unauthenticated user to read generated photos", async () => {
			const unauthContext = testEnv.unauthenticatedContext();
			const unauthDb = unauthContext.firestore();

			await assertSucceeds(
				getDoc(doc(unauthDb, "booths/booth-1/generatedPhotos", "photo-1")),
			);
		});

		it("should allow anonymous user to read generated photos", async () => {
			const anonContext = testEnv.authenticatedContext("anon-user");
			const anonDb = anonContext.firestore();

			await assertSucceeds(
				getDoc(doc(anonDb, "booths/booth-1/generatedPhotos", "photo-1")),
			);
		});

		it("should deny anonymous user to create generated photos", async () => {
			const anonContext = testEnv.authenticatedContext("anon-user");
			const anonDb = anonContext.firestore();

			await assertFails(
				setDoc(doc(anonDb, "booths/booth-1/generatedPhotos", "photo-2"), {
					imageUrl: "https://storage.example.com/new.png",
					imagePath: "generated_photos/photo-2/photo.png",
					boothId: "booth-1",
					createdAt: serverTimestamp(),
				}),
			);
		});

		it("should allow admin user to create and delete generated photos", async () => {
			const adminContext = testEnv.authenticatedContext("admin-user", {
				role: "admin",
			});
			const adminDb = adminContext.firestore();

			// Create
			await assertSucceeds(
				setDoc(doc(adminDb, "booths/booth-1/generatedPhotos", "photo-2"), {
					imageUrl: "https://storage.example.com/new.png",
					imagePath: "generated_photos/photo-2/photo.png",
					boothId: "booth-1",
					createdAt: serverTimestamp(),
				}),
			);

			// Delete
			await assertSucceeds(
				deleteDoc(doc(adminDb, "booths/booth-1/generatedPhotos", "photo-2")),
			);
		});
	});
});
