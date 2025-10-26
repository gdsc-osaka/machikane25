import { describe, expect, it, vi } from "vitest";
import { ZodError } from "zod";

const photoServiceMocks = vi.hoisted(() => ({
	uploadUserPhoto: vi.fn(),
	uploadCapturedPhoto: vi.fn(),
}));

vi.mock("@/application/photoService", () => photoServiceMocks, { virtual: true });

const mockUploadUserPhoto = photoServiceMocks.uploadUserPhoto;
const mockUploadCapturedPhoto = photoServiceMocks.uploadCapturedPhoto;

describe("photoActions", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("uploadUserPhoto validates payload and delegates to service", async () => {
		const { uploadUserPhoto } = await import("@/app/actions/photoActions");
		const file = new File(["data"], "visitor.png", { type: "image/png" });

		mockUploadUserPhoto.mockResolvedValue({
			photoId: "uploaded-1",
			imagePath: "photos/uploaded-1/photo.png",
			imageUrl: "https://example.com/photo.png",
		});

		const result = await uploadUserPhoto({ boothId: "booth-1", file });

		expect(mockUploadUserPhoto).toHaveBeenCalledWith("booth-1", file);
		expect(result.photoId).toBe("uploaded-1");
	});

	it("uploadUserPhoto rejects invalid payload", async () => {
		const { uploadUserPhoto } = await import("@/app/actions/photoActions");

		await expect(
			// @ts-expect-error intentional invalid input
			uploadUserPhoto({ boothId: "", file: null }),
		).rejects.toBeInstanceOf(ZodError);
		expect(mockUploadUserPhoto).not.toHaveBeenCalled();
	});

	it("uploadCapturedPhoto validates payload and delegates to service", async () => {
		const { uploadCapturedPhoto } = await import("@/app/actions/photoActions");
		const file = new File(["capture"], "capture.png", { type: "image/png" });

		mockUploadCapturedPhoto.mockResolvedValue({
			photoId: "uploaded-2",
			imagePath: "photos/uploaded-2/photo.png",
			imageUrl: "https://example.com/capture.png",
		});

		const result = await uploadCapturedPhoto({ boothId: "booth-2", file });

		expect(mockUploadCapturedPhoto).toHaveBeenCalledWith("booth-2", file);
		expect(result.photoId).toBe("uploaded-2");
	});

	it("uploadCapturedPhoto rejects invalid payload", async () => {
		const { uploadCapturedPhoto } = await import("@/app/actions/photoActions");

		await expect(
			// @ts-expect-error intentional invalid input
			uploadCapturedPhoto({ boothId: "", file: undefined }),
		).rejects.toBeInstanceOf(ZodError);
		expect(mockUploadCapturedPhoto).not.toHaveBeenCalled();
	});
});
