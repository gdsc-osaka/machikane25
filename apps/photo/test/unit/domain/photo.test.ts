import { describe, expect, it } from "vitest";
import { ensureGeneratedPhoto, ensureUploadedPhoto } from "@/domain/photo";

describe("photo domain schemas", () => {
	it("parses valid uploaded photo", () => {
		const parsed = ensureUploadedPhoto({
			boothId: "booth-1",
			photoId: "photo-1",
			imagePath: "photos/photo-1/photo.png",
			imageUrl: "https://example.com/photo-1.png",
			createdAt: new Date("2025-01-01T00:00:00Z"),
		});

		expect(parsed.photoId).toBe("photo-1");
	});

	it("rejects uploaded photo without boothId", () => {
		expect(() =>
			ensureUploadedPhoto({
				photoId: "photo-2",
				imagePath: "photos/photo-2/photo.png",
				imageUrl: "https://example.com/photo-2.png",
				createdAt: new Date(),
			}),
		).toThrowError();
	});

	it("parses valid generated photo", () => {
		const parsed = ensureGeneratedPhoto({
			boothId: "booth-9",
			photoId: "photo-9",
			imagePath: "generated_photos/photo-9/photo.png",
			imageUrl: "https://example.com/generated/photo-9.png",
			createdAt: new Date("2025-01-01T00:00:00Z"),
		});

		expect(parsed.imageUrl).toBe("https://example.com/generated/photo-9.png");
	});

	it("rejects generated photo with empty imageUrl", () => {
		expect(() =>
			ensureGeneratedPhoto({
				boothId: "booth-10",
				photoId: "photo-10",
				imagePath: "generated_photos/photo-10/photo.png",
				imageUrl: "",
				createdAt: new Date(),
			}),
		).toThrowError();
	});
});
