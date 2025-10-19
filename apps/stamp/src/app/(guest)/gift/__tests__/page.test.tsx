import { render, screen, waitFor } from "@testing-library/react";
import { SWRConfig } from "swr";
import { beforeEach, describe, expect, it, vi } from "vitest";

type RewardSnapshot = {
	status: "pending" | "issued" | "redeemed";
	qrPayload: string | null;
	issuedAt: number | null;
	redeemedAt: number | null;
};

const { loadSurveyRewardMock, issueSurveyRewardMock } = vi.hoisted(() => {
	const loadMock = vi.fn<(attendeeId: string) => Promise<RewardSnapshot>>();
	const issueMock = vi.fn<(attendeeId: string) => Promise<RewardSnapshot>>();
	return {
		loadSurveyRewardMock: loadMock,
		issueSurveyRewardMock: issueMock,
	};
});

vi.mock("@/application/survey/reward", () => ({
	loadSurveyReward: loadSurveyRewardMock,
	issueSurveyReward: issueSurveyRewardMock,
}));

vi.mock("@/firebase", () => ({
	getFirebaseAuth: () => ({
		currentUser: { uid: "attendee-789" },
	}),
	getFirebaseClients: () => ({
		app: {},
		auth: { currentUser: { uid: "attendee-789" } },
		firestore: {},
		remoteConfig: null,
	}),
}));

vi.mock("firebase/auth", () => ({
	signInAnonymously: vi.fn(),
}));

const importPage = async () => {
	const module = await import("../page");
	return module.default;
};

const renderGiftPage = async () => {
	const Page = await importPage();
	return render(
		<SWRConfig value={{ provider: () => new Map(), dedupingInterval: 0 }}>
			<Page />
		</SWRConfig>,
	);
};

describe("GiftPage", () => {
	beforeEach(() => {
		loadSurveyRewardMock.mockReset();
		issueSurveyRewardMock.mockReset();
	});

	it("reuses an existing reward QR without issuing a new one", async () => {
		const existingReward: RewardSnapshot = {
			status: "issued",
			qrPayload: "qr-encoded-attendee-789",
			issuedAt: 1_700_000_123_000,
			redeemedAt: null,
		};
		loadSurveyRewardMock.mockResolvedValue(existingReward);

		await renderGiftPage();

		await waitFor(() => {
			expect(loadSurveyRewardMock).toHaveBeenCalledWith("attendee-789");
		});
		expect(issueSurveyRewardMock).not.toHaveBeenCalled();
		expect(await screen.findByTestId("reward-qr-payload")).toHaveTextContent(
			"qr-encoded-attendee-789",
		);
		expect(
			screen.getByRole("heading", { name: "景品受け取りページ" }),
		).toBeInTheDocument();
	});
});
