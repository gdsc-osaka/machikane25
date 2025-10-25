import { render, screen, waitFor } from "@testing-library/react";
import { Timestamp } from "firebase/firestore";
import { SWRConfig } from "swr";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { StampProgressSnapshot } from "@/hooks/use-stamp-progress";

const { useStampProgressMock } = vi.hoisted(() => {
	const mock =
		vi.fn<(attendeeId: string | null) => { data: StampProgressSnapshot }>();
	return { useStampProgressMock: mock };
});

const { pushMock } = vi.hoisted(() => {
	const mock = vi.fn<(path: string) => void>();
	return { pushMock: mock };
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

const importPage = async () => {
	const module = await import("../page");
	return module.default;
};

const renderFormPage = async () => {
	const Page = await importPage();
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

describe("SurveyFormPage", () => {
	beforeEach(() => {
		useStampProgressMock.mockReset();
		pushMock.mockReset();
	});

	it("redirects attendees without complete exhibit stamps back to the home page", async () => {
		useStampProgressMock.mockReturnValue({
			data: createSnapshot({
				reception: collectedAt(1),
				photobooth: collectedAt(2),
			}),
		});

		await renderFormPage();

		await waitFor(() => {
			expect(pushMock).toHaveBeenCalledWith("/");
		});
		expect(screen.getByTestId("survey-access-locked")).toBeInTheDocument();
		expect(screen.queryByTestId("survey-form")).toBeNull();
	});

	it("renders the survey form when all exhibit stamps are collected", async () => {
		useStampProgressMock.mockReturnValue({
			data: createSnapshot({
				reception: collectedAt(1),
				photobooth: collectedAt(2),
				art: collectedAt(3),
				robot: collectedAt(4),
			}),
		});

		await renderFormPage();

		await waitFor(() => {
			expect(pushMock).not.toHaveBeenCalled();
		});
		expect(screen.getByTestId("survey-form")).toBeInTheDocument();
		expect(
			screen.getByRole("heading", { name: "アンケート" }),
		).toBeInTheDocument();
	});
});
