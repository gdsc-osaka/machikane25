import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import GiftPage from "../page";

const mockUseStampProgress = vi.fn();
const mockGetFirebaseAuth = vi.fn();

vi.mock("@/features/stamps/hooks/useStampProgress", () => ({
	useStampProgress: () => mockUseStampProgress(),
}));

vi.mock("@/lib/firebase/client", () => ({
	getFirebaseAuth: () => mockGetFirebaseAuth(),
}));

describe("GiftPage", () => {
	const originalLanguage = navigator.language;

	beforeEach(() => {
		mockUseStampProgress.mockReturnValue({
			data: {
				remaining: 2,
				rewardEligible: false,
			},
			isLoading: false,
		});
		mockGetFirebaseAuth.mockReturnValue({
			onAuthStateChanged: (
				callback: (user: { uid: string } | null) => void,
			) => {
				callback(null);
				return () => {};
			},
		});
		Object.defineProperty(window.navigator, "language", {
			configurable: true,
			value: "en-US",
		});
	});

	afterEach(() => {
		vi.restoreAllMocks();
		Object.defineProperty(window.navigator, "language", {
			configurable: true,
			value: originalLanguage,
		});
	});

	it("asks the user to sign in when no UID is provided", async () => {
		render(<GiftPage />);

		expect(
			await screen.findByText(/Please sign in again/i),
		).toBeInTheDocument();
	});

	it("renders the QR canvas when the user is eligible", async () => {
		mockUseStampProgress.mockReturnValue({
			data: {
				remaining: 0,
				rewardEligible: true,
			},
			isLoading: false,
		});
		mockGetFirebaseAuth.mockReturnValue({
			onAuthStateChanged: (
				callback: (user: { uid: string } | null) => void,
			) => {
				callback({ uid: "user-eligible" });
				return () => {};
			},
		});
		vi.spyOn(window.HTMLCanvasElement.prototype, "getContext").mockReturnValue({
			fillStyle: "#000000",
			fillRect: vi.fn(),
			clearRect: vi.fn(),
			canvas: { width: 0, height: 0 },
		} as unknown as CanvasRenderingContext2D);

		render(<GiftPage />);

		await waitFor(() => {
			expect(screen.getByLabelText("Reward QR code")).toBeInTheDocument();
		});
	});
});
