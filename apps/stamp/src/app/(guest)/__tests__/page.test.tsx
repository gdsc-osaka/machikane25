import { render, screen, waitFor, within } from "@testing-library/react";
import { Timestamp } from "firebase/firestore";
import { SWRConfig } from "swr";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { StampProgressSnapshot } from "@/hooks/use-stamp-progress";

type UseStampProgressResult = {
	data: StampProgressSnapshot;
};

const { useStampProgressMock } = vi.hoisted(() => {
	const mock = vi.fn<(attendeeId: string | null) => UseStampProgressResult>();
	return { useStampProgressMock: mock };
});

const { pushMock } = vi.hoisted(() => {
	return { pushMock: vi.fn<(path: string) => void>() };
});

vi.mock("@/hooks/use-stamp-progress", () => ({
	useStampProgress: useStampProgressMock,
}));

vi.mock("@/firebase", () => ({
	getFirebaseAuth: () => ({
		currentUser: { uid: "attendee-123" },
	}),
	getFirebaseClients: () => ({
		app: {},
		auth: { currentUser: { uid: "attendee-123" } },
		firestore: {},
		remoteConfig: null,
	}),
}));

vi.mock("firebase/auth", () => ({
	signInAnonymously: vi.fn(),
}));

vi.mock("next/navigation", () => ({
	useRouter: () => ({
		push: pushMock,
	}),
}));

const renderHomePage = async () => {
	const Page = (await import("../page")).default;
	return render(
		<SWRConfig value={{ provider: () => new Map(), dedupingInterval: 0 }}>
			<Page />
		</SWRConfig>,
	);
};

const createSnapshot = (
	overrides: Partial<StampProgressSnapshot> = {},
): StampProgressSnapshot => ({
	reception: null,
	photobooth: null,
	art: null,
	robot: null,
	survey: null,
	...overrides,
});

const collectedAt = (millis: number) => Timestamp.fromMillis(millis);

describe("HomePage", () => {
	beforeEach(() => {
		useStampProgressMock.mockReset();
		pushMock.mockReset();
	});

	it("renders the stamp board with locked CTAs for new attendees", async () => {
		useStampProgressMock.mockReturnValue({
			data: createSnapshot(),
		});

		await renderHomePage();

		expect(
			screen.getByRole("heading", { name: "まちかね祭スタンプラリー" }),
		).toBeInTheDocument();
		expect(
			screen.getByText("Machikane Festival Stamp Rally"),
		).toBeInTheDocument();
		expect(screen.getByText("現在のスタンプ状況")).toBeInTheDocument();
		expect(screen.getByText("Your Stamp Progress")).toBeInTheDocument();

		const stampItems = screen.getAllByRole("listitem");
		expect(stampItems).toHaveLength(5);

		expect(screen.getByText("受付")).toBeInTheDocument();
		expect(screen.getByText("フォトブース")).toBeInTheDocument();
		expect(screen.getByText("アート展示")).toBeInTheDocument();
		expect(screen.getByText("ロボット研究")).toBeInTheDocument();
		expect(screen.getByText("アンケート")).toBeInTheDocument();

		const surveyButton = screen.getByTestId("cta-survey");
		expect(surveyButton).toBeDisabled();
		expect(surveyButton).toHaveTextContent("アンケートに回答");
		expect(surveyButton).toHaveTextContent("Collect all stamps to unlock");

		const rewardButton = screen.getByTestId("cta-reward");
		expect(rewardButton).toBeDisabled();
		expect(rewardButton).toHaveTextContent("景品を受け取る");
		expect(rewardButton).toHaveTextContent("Requires survey submission");

		await waitFor(() => {
			expect(useStampProgressMock).toHaveBeenCalledWith("attendee-123");
		});
	});

	it("enables the survey CTA after four exhibit stamps are collected", async () => {
		useStampProgressMock.mockReturnValue({
			data: createSnapshot({
				reception: 1,
				photobooth: 2,
				art: 3,
				robot: 4,
			}),
		});

		await renderHomePage();

		const surveyButton = screen.getByTestId("cta-survey");
		expect(surveyButton).toBeEnabled();
		expect(surveyButton).toHaveTextContent("アンケートに回答");
		expect(surveyButton).toHaveTextContent("Take Survey");

		const rewardButton = screen.getByTestId("cta-reward");
		expect(rewardButton).toBeDisabled();
		expect(rewardButton).toHaveTextContent("景品を受け取る");
		expect(rewardButton).toHaveTextContent("Requires survey submission");
	});

	it("unlocks the reward CTA when the survey stamp is present", async () => {
		useStampProgressMock.mockReturnValue({
			data: createSnapshot({
				reception: 1,
				photobooth: 2,
				art: 3,
				robot: 4,
				survey: 5,
			}),
		});

		await renderHomePage();

		const surveyButton = screen.getByTestId("cta-survey");
		expect(surveyButton).toBeEnabled();

		const rewardButton = screen.getByTestId("cta-reward");
		expect(rewardButton).toBeEnabled();
		expect(
			within(rewardButton).getByText("景品を受け取る"),
		).toBeInTheDocument();
		expect(within(rewardButton).getByText("Claim Reward")).toBeInTheDocument();
	});
});
