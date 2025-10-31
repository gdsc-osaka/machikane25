/**
 * T503 [P] [US3] RTL Spec (Photos Page)
 *
 * Ensures Photos Page renders booth cards with latest generated photos,
 * display names, and download actions sourced from useBoothsWithLatestPhoto.
 *
 * @vitest-environment jsdom
 */

import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const useBoothsWithLatestPhotoMock = vi.fn();

vi.mock("@/hooks/useBoothsWithLatestPhoto", () => ({
	useBoothsWithLatestPhoto: useBoothsWithLatestPhotoMock,
}));

const loadPhotosPage = async () =>
	(await import("@/app/(booth)/photos/page")).default;

const boothSamples = [
	{
		boothId: "Booth 1",
		latestPhoto: {
			photoId: "photo-001",
			imageUrl: "https://example.com/photo-001.png",
			createdAt: new Date("2025-01-01T00:00:00Z"),
		},
	},
	{
		boothId: "Booth 2",
		latestPhoto: {
			photoId: "photo-002",
			imageUrl: "https://example.com/photo-002.png",
			createdAt: new Date("2025-01-02T00:00:00Z"),
		},
	},
];

describe("PhotosPage", () => {
	beforeEach(() => {
		useBoothsWithLatestPhotoMock.mockReset();
		useBoothsWithLatestPhotoMock.mockReturnValue({
			booths: boothSamples,
			isLoading: false,
			error: null,
		});
	});

	it("renders booths with their latest generated photos", async () => {
		const PhotosPage = await loadPhotosPage();
		render(<PhotosPage />);

		const boothHeadings = boothSamples.map((booth) =>
			screen.getByText(booth.boothId),
		);
		expect(boothHeadings).toHaveLength(boothSamples.length);

		const renderedImages = boothSamples.map((booth) =>
			screen.getByAltText(`Latest generated photo for ${booth.boothId}`),
		);

		renderedImages.forEach((imgElement, index) => {
			expect(imgElement).toHaveAttribute(
				"src",
				boothSamples[index]?.latestPhoto?.imageUrl,
			);
		});
	});

	it("renders download button for each generated photo", async () => {
		const PhotosPage = await loadPhotosPage();
		render(<PhotosPage />);

		const downloadButtons = screen.getAllByRole("link", {
			name: /download for printing/i,
		});
		expect(downloadButtons).toHaveLength(boothSamples.length);

		downloadButtons.forEach((linkElement, index) => {
			const expectedUrl = boothSamples[index]?.latestPhoto?.imageUrl;
			expect(linkElement).toHaveAttribute("href", expectedUrl);
		});
	});
});
