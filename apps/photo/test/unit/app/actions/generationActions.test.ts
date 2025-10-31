import { beforeEach, describe, expect, it, vi } from "vitest";

const {
	getGeneratedPhotoMock,
	isPhotoExpiredErrorMock,
	isPhotoNotFoundErrorMock,
} = vi.hoisted(() => ({
	getGeneratedPhotoMock: vi.fn(),
	isPhotoExpiredErrorMock: vi.fn(),
	isPhotoNotFoundErrorMock: vi.fn(),
}));

vi.mock("@/application/generationService", () => ({
	getGeneratedPhoto: getGeneratedPhotoMock,
	isPhotoExpiredError: isPhotoExpiredErrorMock,
	isPhotoNotFoundError: isPhotoNotFoundErrorMock,
}));

import { getGeneratedPhotoAction } from "@/app/actions/generationActions";

describe("generation actions", () => {
	beforeEach(() => {
		getGeneratedPhotoMock.mockReset();
		isPhotoExpiredErrorMock.mockReset();
		isPhotoNotFoundErrorMock.mockReset();
	});

	it("returns generated photo data when service succeeds", async () => {
		getGeneratedPhotoMock.mockResolvedValue({
			id: "photo-1",
			imageUrl: "https://example.com/photo.png",
		});

		const result = await getGeneratedPhotoAction("booth-1", "photo-1");

		expect(result).toEqual({
			data: { imageUrl: "https://example.com/photo.png" },
			error: null,
		});
		expect(getGeneratedPhotoMock).toHaveBeenCalledWith("booth-1", "photo-1");
	});

	it("returns expired error when service throws PhotoExpiredError", async () => {
		const error = new Error("expired");
		getGeneratedPhotoMock.mockRejectedValue(error);
		isPhotoExpiredErrorMock.mockReturnValue(true);
		isPhotoNotFoundErrorMock.mockReturnValue(false);

		const result = await getGeneratedPhotoAction("booth-1", "photo-2");

		expect(result).toEqual({ data: null, error: "EXPIRED" });
	});

	it("returns not found error when service throws PhotoNotFoundError", async () => {
		const error = new Error("missing");
		getGeneratedPhotoMock.mockRejectedValue(error);
		isPhotoExpiredErrorMock.mockReturnValue(false);
		isPhotoNotFoundErrorMock.mockReturnValue(true);

		const result = await getGeneratedPhotoAction("booth-1", "photo-unknown");

		expect(result).toEqual({ data: null, error: "NOT_FOUND" });
	});

	it("rethrows unknown errors", async () => {
		const error = new Error("unexpected");
		getGeneratedPhotoMock.mockRejectedValue(error);
		isPhotoExpiredErrorMock.mockReturnValue(false);
		isPhotoNotFoundErrorMock.mockReturnValue(false);

		await expect(
			getGeneratedPhotoAction("booth-1", "photo-bad"),
		).rejects.toThrowError("unexpected");
	});
});
