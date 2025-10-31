/**
 * T504 [P] [US3] RTL Spec (Admin Page - Monitoring)
 *
 * Confirms admin monitoring page renders navigation links, sync error table,
 * and triggers retryAquariumSyncAction when retry button is clicked.
 *
 * @vitest-environment jsdom
 */

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const refreshMock = vi.fn();
const useAquariumSyncErrorsMock = vi.fn();
const retryAquariumSyncActionMock = vi.fn();

vi.mock("next/navigation", () => ({
	useRouter: () => ({
		push: vi.fn(),
		refresh: refreshMock,
	}),
}));

vi.mock("@/hooks/useAquariumSyncErrors", () => ({
	useAquariumSyncErrors: useAquariumSyncErrorsMock,
}));

vi.mock("@/app/actions/adminActions", () => ({
	retryAquariumSyncAction: retryAquariumSyncActionMock,
}));

const loadAdminPage = async () =>
	(await import("@/app/(booth)/admin/page")).default;

const syncErrorSamples = [
	{
		eventId: "evt-001",
		photoId: "photo-123",
		errorMessage: "Aquarium API timeout",
		timestamp: new Date("2025-01-01T09:00:00.000Z"),
		issueUrl: "https://sentry.example.com/issues/evt-001",
	},
	{
		eventId: "evt-002",
		photoId: "photo-456",
		errorMessage: "Payload rejected",
		timestamp: new Date("2025-01-02T10:30:00.000Z"),
		issueUrl: "https://sentry.example.com/issues/evt-002",
	},
];

describe("AdminPage", () => {
	beforeEach(() => {
		refreshMock.mockReset();
		retryAquariumSyncActionMock.mockReset();
		retryAquariumSyncActionMock.mockResolvedValue({
			status: "ok",
			retriedAt: new Date("2025-01-03T12:00:00.000Z").toISOString(),
			issueUrl: "https://sentry.example.com/issues/evt-001",
		});

		useAquariumSyncErrorsMock.mockReset();
		useAquariumSyncErrorsMock.mockReturnValue({
			errors: syncErrorSamples,
			isLoading: false,
			error: null,
			refresh: vi.fn(),
		});
	});

	it("renders booth ID input and navigation links (Control/Display/Photos)", async () => {
		const AdminPage = await loadAdminPage();
		render(<AdminPage />);

		expect(screen.getByLabelText(/booth id/i)).toBeInTheDocument();

		const navLinks = ["Control", "Display", "Photos"].map((label) =>
			screen.getByRole("link", { name: new RegExp(label, "i") }),
		);

		expect(navLinks).toHaveLength(3);
	});

	it("displays aquarium sync errors and triggers retry action", async () => {
		const AdminPage = await loadAdminPage();
		render(<AdminPage />);

		syncErrorSamples.forEach((error) => {
			expect(screen.getByText(error.photoId)).toBeInTheDocument();
			expect(screen.getByText(error.errorMessage)).toBeInTheDocument();
			expect(
				screen.getByText(error.timestamp.toISOString()),
			).toBeInTheDocument();
		});

		const retryButtons = screen.getAllByRole("button", { name: /retry/i });
		expect(retryButtons).toHaveLength(syncErrorSamples.length);

		fireEvent.click(retryButtons[0]);

		await waitFor(() => {
			expect(retryAquariumSyncActionMock).toHaveBeenCalledWith({
				eventId: "evt-001",
				photoId: "photo-123",
				issueUrl: "https://sentry.example.com/issues/evt-001",
			});
		});

		await waitFor(() => {
			expect(refreshMock).toHaveBeenCalled();
		});
	});
});
