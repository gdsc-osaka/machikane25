/**
 * T402 [P] [US2] RTL Spec (Download Page)
 *
 * Validates Download Page rendering across success, expired, and not-found states.
 */

import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import DownloadPage from "@/app/(user)/download/[boothId]/[photoId]/page";
import {
	GEMINI_FLASH_IMAGE_MODEL_ID,
	GEMINI_PRO_IMAGE_MODEL_ID,
} from "@/domain/models";

const params = {
	boothId: "booth-123",
	photoId: "photo-456",
};

const generationActionMocks = vi.hoisted(() => ({
	getGeneratedPhotoAction: vi.fn(),
}));

const navigationMocks = vi.hoisted(() => ({
	notFound: vi.fn(() => {
		throw new Error("ROUTE_NOT_FOUND");
	}),
}));

vi.mock("@/app/actions/generationActions", () => ({
	getGeneratedPhotoAction: generationActionMocks.getGeneratedPhotoAction,
}));

vi.mock("next/navigation", () => ({
	notFound: navigationMocks.notFound,
}));

const mockGetGeneratedPhotoAction =
	generationActionMocks.getGeneratedPhotoAction;
const mockNotFound = navigationMocks.notFound;

const renderDownloadPage = async () => {
	const page = await DownloadPage({ params: Promise.resolve(params) });
	render(page);
};

describe("[RED] DownloadPage", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("renders image and download link when photo is available", async () => {
		mockGetGeneratedPhotoAction.mockResolvedValue({
			data: {
				imageUrl: "https://example.com/generated/photo.png",
				relatedPhotos: [
					{
						id: "photo-456",
						imageUrl: "https://example.com/generated/photo.png",
						modelId: GEMINI_FLASH_IMAGE_MODEL_ID,
					},
				],
			},
			error: null,
		});

		await renderDownloadPage();

		const generatedImage = screen.getByRole("img", {
			name: "AI-generated result 1",
		});
		expect(generatedImage).toBeInTheDocument();
		expect(generatedImage.getAttribute("src")).toContain(
			encodeURIComponent("https://example.com/generated/photo.png"),
		);

		const downloadButton = screen.getByRole("button", {
			name: "Download Photo",
		});
		expect(downloadButton).toBeInTheDocument();
		expect(mockGetGeneratedPhotoAction).toHaveBeenCalledWith(
			params.boothId,
			params.photoId,
		);
	});

	it("renders multiple images when related photos are available", async () => {
		mockGetGeneratedPhotoAction.mockResolvedValue({
			data: {
				imageUrl: "https://example.com/generated/photo-1.png",
				relatedPhotos: [
					{
						id: "photo-1",
						imageUrl: "https://example.com/generated/photo-1.png",
					},
					{
						id: "photo-2",
						imageUrl: "https://example.com/generated/photo-2.png",
					},
					{
						id: "photo-3",
						imageUrl: "https://example.com/generated/photo-3.png",
						modelId: GEMINI_PRO_IMAGE_MODEL_ID,
					},
				],
			},
			error: null,
		});

		await renderDownloadPage();

		const images = screen.getAllByRole("img");
		expect(images).toHaveLength(3);
		expect(images[0]).toHaveAccessibleName("AI-generated result 1");
		expect(images[1]).toHaveAccessibleName("AI-generated result 2");
		expect(images[2]).toHaveAccessibleName("AI-generated result 3");

		const downloadButtons = screen.getAllByRole("button", {
			name: "Download Photo",
		});
		expect(downloadButtons).toHaveLength(3);

		// Verify Pro badge is displayed for the 3rd photo
		expect(screen.getByText("PRO")).toBeInTheDocument();
	});

	it("shows expiry message when getGeneratedPhotoAction returns EXPIRED", async () => {
		mockGetGeneratedPhotoAction.mockResolvedValue({
			data: null,
			error: "EXPIRED",
		});

		await renderDownloadPage();

		expect(mockGetGeneratedPhotoAction).toHaveBeenCalledWith(
			params.boothId,
			params.photoId,
		);
		expect(
			screen.getByText(
				"This download link has expired. Please rescan your QR code at the booth to regenerate your photo.",
			),
		).toBeInTheDocument();
	});

	it("delegates to notFound when getGeneratedPhotoAction returns NOT_FOUND", async () => {
		mockGetGeneratedPhotoAction.mockResolvedValue({
			data: null,
			error: "NOT_FOUND",
		});

		await expect(
			DownloadPage({ params: Promise.resolve(params) }),
		).rejects.toThrow("ROUTE_NOT_FOUND");
		expect(mockNotFound).toHaveBeenCalledTimes(1);
		expect(mockGetGeneratedPhotoAction).toHaveBeenCalledWith(
			params.boothId,
			params.photoId,
		);
	});
});
