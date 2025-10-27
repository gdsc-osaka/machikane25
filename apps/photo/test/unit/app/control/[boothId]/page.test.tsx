/**
 * T302 [P] [US1] RTL Spec (Control Page)
 *
 * Failing expectations for Control Page UI states prior to implementation.
 */

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import ControlPage from "@/app/(booth)/control/[boothId]/page";

type BoothState =
	| "idle"
	| "menu"
	| "capturing"
	| "generating"
	| "completed";

type MockBooth = {
	id: string;
	state: BoothState;
	latestPhotoId: string | null;
	lastTakePhotoAt: Date | null;
};

const boothId = "test-booth-id";

const boothActionMocks = vi.hoisted(() => ({
	startSession: vi.fn(),
	startCapture: vi.fn(),
	startGeneration: vi.fn(),
	completeCapture: vi.fn(),
}));

const clientMocks = vi.hoisted(() => ({
	ensureAnonymousSignIn: vi.fn(() => Promise.resolve()),
}));

const hookMocks = vi.hoisted(() => ({
	useBoothState: vi.fn(),
	useUploadedPhotos: vi.fn(),
	useGenerationOptions: vi.fn(),
	useParams: vi.fn(),
}));

vi.mock("@/hooks/useBoothState", () => ({ useBoothState: hookMocks.useBoothState }));

vi.mock("@/hooks/useUploadedPhotos", () => ({
	useUploadedPhotos: hookMocks.useUploadedPhotos,
}));

vi.mock("@/hooks/useGenerationOptions", () => ({
	useGenerationOptions: hookMocks.useGenerationOptions,
}));

vi.mock("@/lib/firebase/client", () => ({
	ensureAnonymousSignIn: clientMocks.ensureAnonymousSignIn,
}));

vi.mock("@/app/actions/boothActions", () => ({
	startSession: boothActionMocks.startSession,
	startCapture: boothActionMocks.startCapture,
	startGeneration: boothActionMocks.startGeneration,
	completeCapture: boothActionMocks.completeCapture,
}));

vi.mock("next/navigation", () => ({
	useParams: () => hookMocks.useParams(),
	useRouter: () => ({
		push: vi.fn(),
		replace: vi.fn(),
		refresh: vi.fn(),
	}),
}));

const mockStartSession = boothActionMocks.startSession;
const mockStartCapture = boothActionMocks.startCapture;
const mockStartGeneration = boothActionMocks.startGeneration;
const mockCompleteCapture = boothActionMocks.completeCapture;
const mockEnsureAnonymousSignIn = clientMocks.ensureAnonymousSignIn;

const mockUseBoothState = hookMocks.useBoothState;
const mockUseUploadedPhotos = hookMocks.useUploadedPhotos;
const mockUseGenerationOptions = hookMocks.useGenerationOptions;
const mockUseParams = hookMocks.useParams;

const createBooth = (state: BoothState, overrides?: Partial<MockBooth>): MockBooth => ({
	id: boothId,
	state,
	latestPhotoId: null,
	lastTakePhotoAt: null,
	...overrides,
});

const renderControlPage = (booth: MockBooth): void => {
	mockUseBoothState.mockReturnValue({
		booth,
		latestGeneratedPhotoUrl: null,
		isLoading: false,
		error: null,
	});
	mockUseUploadedPhotos.mockReturnValue({
		photos: [],
		isLoading: false,
		error: null,
	});
	mockUseGenerationOptions.mockReturnValue({
		options: {},
		isLoading: false,
		error: null,
	});
	mockUseParams.mockReturnValue({ boothId });

	render(<ControlPage />);
};

describe("[RED] ControlPage", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockEnsureAnonymousSignIn.mockResolvedValue(undefined);
	});

	it("shows idle state prompt and triggers startSession action", async () => {
		const booth = createBooth("idle");
		renderControlPage(booth);

		const startButton = screen.getByRole("button", { name: "フォトブースを始める" });
		expect(startButton).toBeInTheDocument();

		const user = userEvent.setup();
		await user.click(startButton);

		expect(mockStartSession).toHaveBeenCalledWith({ boothId });
	});

	it("shows menu state with uploaded photos and generation options", () => {
		const booth = createBooth("menu");
		const uploadedPhotos = [
			{
				photoId: "photo-1",
				imageUrl: "https://example.com/photo-1.png",
				imagePath: "photos/photo-1/photo.png",
			},
			{
				photoId: "photo-2",
				imageUrl: "https://example.com/photo-2.png",
				imagePath: "photos/photo-2/photo.png",
			},
		];

		const generationOptions = {
			location: [
				{ id: "location-1", displayName: "ロケーションA" },
				{ id: "location-2", displayName: "ロケーションB" },
			],
			style: [{ id: "style-1", displayName: "ビビッド" }],
		};

		mockUseBoothState.mockReturnValue({
			booth,
			latestGeneratedPhotoUrl: null,
			isLoading: false,
			error: null,
		});
		mockUseUploadedPhotos.mockReturnValue({
			photos: uploadedPhotos,
			isLoading: false,
			error: null,
		});
		mockUseGenerationOptions.mockReturnValue({
			options: generationOptions,
			isLoading: false,
			error: null,
		});
		mockUseParams.mockReturnValue({ boothId });

		render(<ControlPage />);

		expect(screen.getByRole("button", { name: "撮影開始" })).toBeInTheDocument();
		expect(screen.getByText("ロケーションA")).toBeInTheDocument();
		expect(screen.getByText("ロケーションB")).toBeInTheDocument();
		expect(screen.getByText("ビビッド")).toBeInTheDocument();
		const thumbnails = screen.getAllByRole("img");
		expect(thumbnails).toHaveLength(uploadedPhotos.length);
	});

	it("shows capturing state countdown UI", () => {
		const booth = createBooth("capturing", {
			lastTakePhotoAt: new Date(),
		});
		renderControlPage(booth);

		expect(screen.getByText("撮影中...")).toBeInTheDocument();
		expect(screen.getByText(/カウントダウン/)).toBeInTheDocument();
	});

	it("shows generating state progress message", () => {
		const booth = createBooth("generating");
		renderControlPage(booth);

		expect(screen.getByText("AIが写真を生成中...")).toBeInTheDocument();
	});

	it("shows completed state with download QR link", () => {
		const latestPhotoId = "generated-photo-123";
		const booth = createBooth("completed", { latestPhotoId });

		renderControlPage(booth);

		const links = screen.getAllByRole("link");
		const downloadLink = links.find((link) =>
			link.getAttribute("href")?.includes(`/download/${boothId}/${latestPhotoId}`),
		);

		expect(downloadLink).toBeDefined();
	});
});
