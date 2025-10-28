/**
 * T401 [P] [US2] Integration Test (DownloadFlow)
 *
 * Validates generated photo retrieval via server action across Firestore emulator.
 * Covers valid retrieval, expired photo handling (FR-004), and missing photo errors.
 */

import { Timestamp } from "firebase-admin/firestore";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
	type GeneratedPhotoActionResult,
	getGeneratedPhotoAction,
} from "@/app/actions/generationActions";

type SeedPhoto = {
	id: string;
	imageUrl: string;
	createdAt: Timestamp;
};

const ensureEmulatorEnvironment = (): void => {
	process.env.FIRESTORE_EMULATOR_HOST =
		process.env.FIRESTORE_EMULATOR_HOST ?? "localhost:11002";
};

const ensureAdminEnvironment = (): void => {
	if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
		return;
	}
	const adminConfig = {
		project_id: "photo-test",
		client_email: "download-flow-tests@photo-test.firebaseapp.com",
		private_key:
			"-----BEGIN PRIVATE KEY-----\n" +
			"MIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQCtSGg5E8ovHrB+\n" +
			"G1PpbuQx7YEA6WDDoeteiZkwfG2bBWxqubgayXnQBWW3FsUYqrctY79UEYZ2pW+k\n" +
			"RRf3/cXTh8ewulU5h7x5eelTjDLdP5nNAHGUTpJRw41ChQELCHevtItYJ5mGxhp6\n" +
			"4v0HdCQSSeXn/N3PRV9mKXg1lg4o1E10+G3Cp737CNDLZXGLvzOSS9O3IUEhO1ZV\n" +
			"zzxrm0fyNR5DtOmapEnp7TF+1TTCK9LuFehJnegOIhvlLNPpvVIzyA9tkY3En5nO\n" +
			"TqC8+QvazdXhd0g0Y51TJCjqJN1mzVuluMyjBordatESstJZ8+o4QxjXptx6tOl2\n" +
			"TbadKg0XAgMBAAECggEAf/vGIpYHxa6nXIafqYz7b2aE/EmW4Q/+jUYcR7x0dItr\n" +
			"aEYWlDEiTEQPywqnF1KxfkpFzja67cJNeG6NbpEutwzqaruQwfEFjmAhskclpHpQ\n" +
			"+WszAoNUSnFslfoYgyBRE4SH9rmbvn5sjs9Uaz2QfIf0pBxKxZik5BoCHk9efrye\n" +
			"n1cE8p1ZBSPSxMSlcNhDl77VvL6mEMHj03ADzCV3sL05xivK2Q5EpZR/asUwuGau\n" +
			"WyDuxNDJ1vyiIv5NV4OhVQ8zvVPUrcmsfxRFQtW63hpdnBDd65IPcRmtmCi8HF5/\n" +
			"jepn7gkeEk7J9ZyZQrVD4J+n9qSAbV5kYyNZPgPyQQKBgQDZUpbc6CiBhJeS61Qj\n" +
			"IDvV/oX6cqs+qxgntwe148QPbMDvwB8KvC5nAsaUSwdXESU0qKp24Kd4NwYNavu4\n" +
			"nKaH2Cr6DIpOig23/ytfMrOtDq5//QvA4xsyeRz7eFSAgzbe5QqJyU5/6f6zdnFY\n" +
			"nIfN9Tkv3f8cfBdIKmsshQvOiwKBgQDFIm9XAaRe1TRz19PAY74+hMt7N3U/rTNk\n" +
			"2+RDvy6iaWc8UD7y47VvHCgWEap/VnFJZa1MNpSWQFfV6sndbP6+0GuTdbA+XgYg\n" +
			"5JG8jRqXDu5E3fXAVJwBHeKpNjm9gaB6FG12C2nHclSHPi3zQdYR3Eyuz64nYkBO\n" +
			"2MXExcskKQKBgQC6w1J3skM2z7IaM/xEzqcDsikHHg64/eJBowtsIu7WDLxflWXd\n" +
			"2Ds+yYmGOzr63Gwr0HRBvYPbZwr5tB0ZCa6ljfF6HZ8LKnitQy0UMzxoR/KmHQ3w\n" +
			"nJv3A0Jz4gxlaAmberRWQyIWZ5jU8aQ1BTlwh1EQBYAmjAnaputJ1VAoIQKBgAi6\n" +
			"Ko9I2aI3pz867YXCUQlMcbcVywiildXX+0ah3yhASrIxi7cNUeHZhyO/69STfW5Q\n" +
			"Fx5mXuFe8i8j7GNRV2Y/8cKC93zP/pbKo8mjq9MWV84w7ePyCZ+V0sF2513NdwEI\n" +
			"XumVpQSxfWr1xGR6Zh9C6iBBrgZP5kGDu5wlyqSbAoGATBufX/bLfHLWCX8hC8zm\n" +
			"RE2d2eFppPZ6wvZG1Bgp6wTDMYJIZHwzYaFGXKbYW9IMNBgoUVesOW5EwV20VIqA\n" +
			"i8sIhzfFfHrnAbsq5B2HRn+k7/4pPs9NjzW7paZ+JNTkwaHttZTPqHAT3czz8sRn\n" +
			"y7Y0n86sP9rpfxzcx4lSWf4=\n" +
			"-----END PRIVATE KEY-----\n",
	};
	process.env.FIREBASE_SERVICE_ACCOUNT_JSON = JSON.stringify(adminConfig);
	process.env.FIREBASE_STORAGE_BUCKET =
		process.env.FIREBASE_STORAGE_BUCKET ?? "photo-test.appspot.com";
};

const seedGeneratedPhotos = async (
	boothId: string,
	photos: SeedPhoto[],
): Promise<void> => {
	const { getAdminFirestore } = await import("@/lib/firebase/admin");
	const adminFirestore = getAdminFirestore();
	await Promise.all(
		photos.map((photo) =>
			adminFirestore
				.collection(`booths/${boothId}/generatedPhotos`)
				.doc(photo.id)
				.set({
					imageUrl: photo.imageUrl,
					imagePath: `generated_photos/${photo.id}/photo.png`,
					createdAt: photo.createdAt,
				}),
		),
	);
};

const clearGeneratedPhotos = async (boothId: string): Promise<void> => {
	const { getAdminFirestore } = await import("@/lib/firebase/admin");
	const adminFirestore = getAdminFirestore();
	const snapshot = await adminFirestore
		.collection(`booths/${boothId}/generatedPhotos`)
		.get();
	const deletions = snapshot.docs.map((doc) => doc.ref.delete());
	await Promise.all(deletions);
};

describe("Download flow server action", () => {
	const boothId = "test-booth";

	beforeAll(async () => {
		ensureEmulatorEnvironment();
		ensureAdminEnvironment();

		const now = Date.now();
		const validPhoto: SeedPhoto = {
			id: "photo_valid",
			imageUrl: "https://example.com/generated/photo-valid.png",
			createdAt: Timestamp.fromMillis(now - 23 * 60 * 60 * 1000),
		};
		const expiredPhoto: SeedPhoto = {
			id: "photo_expired",
			imageUrl: "https://example.com/generated/photo-expired.png",
			createdAt: Timestamp.fromMillis(now - 5 * 24 * 60 * 60 * 1000),
		};
		await seedGeneratedPhotos(boothId, [validPhoto, expiredPhoto]);
	});

	afterAll(async () => {
		await clearGeneratedPhotos(boothId);
	});

	it("should return imageUrl for valid photo (FR-004)", async () => {
		const result = (await getGeneratedPhotoAction(
			boothId,
			"photo_valid",
		)) as GeneratedPhotoActionResult;

		expect(result.error).toBeNull();
		expect(result.data).toBeDefined();
		expect(result.data?.imageUrl).toBe(
			"https://example.com/generated/photo-valid.png",
		);
	});

	it("should surface EXPIRED error for photo older than 24h", async () => {
		const result = (await getGeneratedPhotoAction(
			boothId,
			"photo_expired",
		)) as GeneratedPhotoActionResult;

		expect(result.data).toBeNull();
		expect(result.error).toBe("EXPIRED");
	});

	it("should surface NOT_FOUND error when photo is missing", async () => {
		const result = (await getGeneratedPhotoAction(
			boothId,
			"photo_unknown",
		)) as GeneratedPhotoActionResult;

		expect(result.data).toBeNull();
		expect(result.error).toBe("NOT_FOUND");
	});
});
