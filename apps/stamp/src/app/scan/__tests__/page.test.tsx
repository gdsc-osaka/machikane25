"use client";

import {
	act,
	fireEvent,
	render,
	screen,
	waitFor,
} from "@testing-library/react";
import { okAsync } from "neverthrow";
import { beforeEach, describe, expect, it, vi } from "vitest";

const requireStaffMock = vi.hoisted(() =>
	vi.fn<
		() => Promise<
			| { status: "needs-auth" }
			| {
					status: "authorized";
					staff: {
						uid: string;
						email: string | null;
						displayName: string | null;
					};
			  }
		>
	>(),
);

const jsQrMock = vi.hoisted(() => vi.fn());
const redeemRewardMock = vi.hoisted(() => vi.fn());

vi.mock("@/application/auth/require-staff", () => ({
	requireStaff: requireStaffMock,
}));

vi.mock("jsqr", () => ({
	default: jsQrMock,
}));

vi.mock("@/application/rewards/redeem-reward.client", () => ({
	redeemReward: redeemRewardMock,
}));

vi.mock("@/firebase", () => ({
	getFirebaseAuth: () => ({
		currentUser: { uid: "staff-123" },
	}),
	getFirebaseApp: () => ({}),
}));

const importScanPage = async () => {
	const module = await import("../page");
	return module.default;
};

const renderScanPage = async () => {
	const Page = await importScanPage();
	let result: ReturnType<typeof render> | undefined;
	await act(async () => {
		result = render(<Page />);
	});
	if (!result) {
		throw new Error("Failed to render ScanPage");
	}
	return result;
};

describe("ScanPage", () => {
	beforeEach(() => {
		requireStaffMock.mockReset();
		jsQrMock.mockReset();
		redeemRewardMock.mockReset();
		redeemRewardMock.mockReturnValue(
			okAsync({
				status: "redeemed" as const,
				attendeeId: "guest-redeemed",
				redeemedAt: Date.now(),
			}),
		);
		Object.defineProperty(global.HTMLMediaElement.prototype, "play", {
			configurable: true,
			value: vi.fn().mockResolvedValue(undefined),
		});
		Object.defineProperty(global.HTMLCanvasElement.prototype, "getContext", {
			configurable: true,
			value: vi.fn(() => ({
				drawImage: vi.fn(),
				getImageData: vi.fn(() => ({
					data: new Uint8ClampedArray(0),
					width: 0,
					height: 0,
				})),
			})),
		});
		Object.defineProperty(global.navigator, "mediaDevices", {
			configurable: true,
			value: {
				getUserMedia: vi.fn().mockResolvedValue({
					getTracks: () => [
						{
							stop: vi.fn(),
						},
					],
				}),
			},
		});
	});

	it("requests camera access for authorized staff members", async () => {
		const getUserMediaSpy = vi.spyOn(navigator.mediaDevices, "getUserMedia");
		requireStaffMock.mockResolvedValue({
			status: "authorized",
			staff: {
				uid: "staff-123",
				email: "staff@example.com",
				displayName: "Festival Staff",
			},
		});

		await renderScanPage();

		await waitFor(() => {
			expect(getUserMediaSpy).toHaveBeenCalledTimes(1);
		});
		expect(screen.getByTestId("staff-scan-console")).toBeInTheDocument();
	});

	it("shows manual redemption form when switching from scanner view", async () => {
		requireStaffMock.mockResolvedValue({
			status: "authorized",
			staff: {
				uid: "staff-123",
				email: "staff@example.com",
				displayName: "Festival Staff",
			},
		});

		await renderScanPage();

		const manualButton = await screen.findByRole("button", {
			name: "手動入力に切り替える",
		});
		fireEvent.click(manualButton);

		expect(
			await screen.findByLabelText("Attendee ID / 来場者ID"),
		).toBeInTheDocument();
		expect(
			screen.getByRole("button", {
				name: "Redeem reward / 景品受け渡しを記録する",
			}),
		).toBeInTheDocument();
	});
});
