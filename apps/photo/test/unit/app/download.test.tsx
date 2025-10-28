/**
 * T402 [P] [US2] RTL Spec (Download Page)
 *
 * Validates Download Page rendering across success, expired, and not-found states.
 */

import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import DownloadPage from "@/app/(user)/download/[boothId]/[photoId]/page";

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
	const page = await DownloadPage({ params });
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
			},
			error: null,
		});

		await renderDownloadPage();

		const generatedImage = screen.getByRole("img", {
			name: "Generated Photo",
		});
		expect(generatedImage).toBeInTheDocument();
		expect(generatedImage.getAttribute("src")).toBe(
			"https://example.com/generated/photo.png",
		);

		const downloadLink = screen.getByRole("link", {
			name: "Download Photo",
		});
		expect(downloadLink).toBeInTheDocument();
		expect(downloadLink.getAttribute("href")).toBe(
			"https://example.com/generated/photo.png",
		);
		expect(downloadLink.getAttribute("download")).toBe("ai_photo.png");
		expect(mockGetGeneratedPhotoAction).toHaveBeenCalledWith(
			params.boothId,
			params.photoId,
		);
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

		await expect(DownloadPage({ params })).rejects.toThrow("ROUTE_NOT_FOUND");
		expect(mockNotFound).toHaveBeenCalledTimes(1);
		expect(mockGetGeneratedPhotoAction).toHaveBeenCalledWith(
			params.boothId,
			params.photoId,
		);
	});
});
