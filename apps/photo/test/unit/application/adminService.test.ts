import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { findGeneratedPhotoByPhotoIdMock, sendToAquariumMock } = vi.hoisted(
	() => ({
		findGeneratedPhotoByPhotoIdMock: vi.fn(),
		sendToAquariumMock: vi.fn(),
	}),
);

vi.mock("@/infra/firebase/photoRepository", () => ({
	findGeneratedPhotoByPhotoId: findGeneratedPhotoByPhotoIdMock,
}));

vi.mock("@/application/generationService", () => ({
	sendToAquarium: sendToAquariumMock,
}));

import { retryAquariumSync } from "@/application/adminService";

describe("adminService.retryAquariumSync", () => {
	beforeEach(() => {
		findGeneratedPhotoByPhotoIdMock.mockReset();
		sendToAquariumMock.mockReset();
		vi.useFakeTimers();
		vi.setSystemTime(new Date("2025-01-01T12:34:56.000Z"));
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it("retries aquarium sync when generated photo exists", async () => {
		const generatedPhoto = {
			boothId: "booth-1",
			photoId: "photo-1",
			imagePath: "generated/photo.png",
			imageUrl: "https://example.com/photo.png",
			createdAt: new Date(),
		};
		findGeneratedPhotoByPhotoIdMock.mockResolvedValue(generatedPhoto);
		sendToAquariumMock.mockResolvedValue(undefined);

		const result = await retryAquariumSync({
			eventId: "evt-1",
			photoId: "photo-1",
			issueUrl: "https://example.com/issues/1",
		});

		expect(findGeneratedPhotoByPhotoIdMock).toHaveBeenCalledWith("photo-1");
		expect(sendToAquariumMock).toHaveBeenCalledWith(generatedPhoto);
		expect(result).toEqual({
			eventId: "evt-1",
			photoId: "photo-1",
			status: "success",
			retriedAt: "2025-01-01T12:34:56.000Z",
			issueUrl: "https://example.com/issues/1",
		});
	});

	it("throws AquariumRetryError when generated photo is missing", async () => {
		findGeneratedPhotoByPhotoIdMock.mockResolvedValue(null);

		await expect(
			retryAquariumSync({
				eventId: "evt-1",
				photoId: "photo-missing",
				issueUrl: "https://example.com/issues/1",
			}),
		).rejects.toMatchObject({
			name: "AquariumRetryError",
			message: "Generated photo not found for photoId: photo-missing",
		});
		expect(sendToAquariumMock).not.toHaveBeenCalled();
	});
});
