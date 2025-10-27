import { describe, expect, it } from "vitest";
import { Timestamp } from "firebase-admin/firestore";
import {
	uploadedPhotoConverter,
	generatedPhotoConverter,
} from "@/infra/firebase/photoConverters";

const createSnapshot = (data: Record<string, unknown>, id: string) =>
	({
		id,
		data: () => data,
		ref: {
			path: `booths/${data.boothId || "booth-unknown"}/generatedPhotos/${id}`,
		},
	} as unknown);

describe("photoConverters", () => {
	it("should convert uploaded photo snapshot to domain model", () => {
		const createdAt = Timestamp.fromDate(new Date("2025-01-01T00:00:00Z"));
		const snapshot = createSnapshot(
			{
				boothId: "booth-1",
				photoId: "photo-1",
				imagePath: "photos/photo-1/photo.png",
				imageUrl: "https://example.com/photo-1.png",
				createdAt,
			},
			"photo-1",
		);

		const result = uploadedPhotoConverter.fromFirestore(
			snapshot as never,
			undefined,
		);

		expect(result).toEqual({
			boothId: "booth-1",
			photoId: "photo-1",
			imagePath: "photos/photo-1/photo.png",
			imageUrl: "https://example.com/photo-1.png",
			createdAt: createdAt.toDate(),
		});
	});

	it("should convert generated photo snapshot to domain model", () => {
		const createdAt = Timestamp.fromDate(new Date("2025-01-02T00:00:00Z"));
		const snapshot = createSnapshot(
			{
				boothId: "booth-1",
				photoId: "photo-2",
				imagePath: "generated_photos/photo-2/photo.png",
				imageUrl: "https://example.com/generated/photo-2.png",
				createdAt,
			},
			"photo-2",
		);

		const result = generatedPhotoConverter.fromFirestore(
			snapshot as never,
			undefined,
		);

		expect(result).toEqual({
			boothId: "booth-1",
			photoId: "photo-2",
			imagePath: "generated_photos/photo-2/photo.png",
			imageUrl: "https://example.com/generated/photo-2.png",
			createdAt: createdAt.toDate(),
		});
	});

	it("should serialize uploaded photo to Firestore data", () => {
		const domainPhoto = {
			boothId: "booth-9",
			photoId: "photo-9",
			imagePath: "photos/photo-9/photo.png",
			imageUrl: "https://example.com/photo-9.png",
			createdAt: new Date("2025-01-09T00:00:00Z"),
		};

		const firestoreData = uploadedPhotoConverter.toFirestore(domainPhoto);
		expect(firestoreData.boothId).toBe("booth-9");
		expect(firestoreData.photoId).toBe("photo-9");
		expect(firestoreData.imagePath).toBe("photos/photo-9/photo.png");
		expect(firestoreData.imageUrl).toBe("https://example.com/photo-9.png");
		expect(firestoreData.createdAt).toBeInstanceOf(Timestamp);
	});

	it("should serialize generated photo to Firestore data", () => {
		const domainPhoto = {
			boothId: "booth-10",
			photoId: "photo-10",
			imagePath: "generated_photos/photo-10/photo.png",
			imageUrl: "https://example.com/generated/photo-10.png",
			createdAt: new Date("2025-01-10T00:00:00Z"),
		};

		const firestoreData = generatedPhotoConverter.toFirestore(domainPhoto);
		expect(firestoreData.boothId).toBe("booth-10");
		expect(firestoreData.photoId).toBe("photo-10");
		expect(firestoreData.imagePath).toBe(
			"generated_photos/photo-10/photo.png",
		);
		expect(firestoreData.imageUrl).toBe(
			"https://example.com/generated/photo-10.png",
		);
		expect(firestoreData.createdAt).toBeInstanceOf(Timestamp);
	});
});
