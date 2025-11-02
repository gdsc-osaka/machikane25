/**
 * T303 [P] [US1] RTL Spec (Display Page)
 *
 * Failing expectations for Display Page UI across booth states.
 */

import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import DisplayPage from "@/app/(booth)/display/[boothId]/page";

type BoothState = "idle" | "menu" | "capturing" | "generating" | "completed";

type MockBooth = {
	id: string;
	state: BoothState;
	latestPhotoId: string | null;
	lastTakePhotoAt: Date | null;
};

const boothId = "display-test-booth";
const generatedImageUrl = "https://example.com/generated-photo.png";

const hookMocks = vi.hoisted(() => ({
	useBoothState: vi.fn(),
	useParams: vi.fn(),
}));

vi.mock("@/hooks/useBoothState", () => ({
	useBoothState: hookMocks.useBoothState,
}));

vi.mock("@/app/actions/photoActions", () => ({
	uploadCapturedPhoto: vi.fn(),
	completeCapture: vi.fn(),
}));

vi.mock("react-webcam", () => ({
	__esModule: true,
	default: () => <div data-testid="webcam-feed">webcam-feed</div>,
}));

vi.mock("react-qr-code", () => ({
	__esModule: true,
	default: ({ value }: { value: string }) => (
		<div data-testid="qr-code">{value}</div>
	),
}));

vi.mock("next/navigation", () => ({
	useParams: () => hookMocks.useParams(),
	useRouter: () => ({
		push: vi.fn(),
		replace: vi.fn(),
		refresh: vi.fn(),
	}),
}));

const mockUseBoothState = hookMocks.useBoothState;
const mockUseParams = hookMocks.useParams;

const renderDisplayPage = (booth: MockBooth): void => {
	mockUseBoothState.mockReturnValue({
		booth,
		latestGeneratedPhotoUrl: generatedImageUrl,
		isLoading: false,
		error: null,
	});
	mockUseParams.mockReturnValue({ boothId });

	render(<DisplayPage />);
};

describe("[RED] DisplayPage", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("shows idle message prompting interaction", () => {
		renderDisplayPage({
			id: boothId,
			state: "idle",
			latestPhotoId: null,
			lastTakePhotoAt: null,
		});

		expect(screen.getByText(/タブレットの画面を/)).toBeInTheDocument();
		expect(screen.getByText(/タップしてスタート/)).toBeInTheDocument();
	});

	it("shows menu state with upload QR guidance", () => {
		renderDisplayPage({
			id: boothId,
			state: "menu",
			latestPhotoId: null,
			lastTakePhotoAt: null,
		});

		expect(screen.getByText(/タブレットを操作してください/)).toBeInTheDocument();
		expect(screen.getByText(/画像を選ぶ/)).toBeInTheDocument();
		expect(screen.getByText(/写真を撮る/)).toBeInTheDocument();
		expect(screen.getByText(/決定/)).toBeInTheDocument();
	});

	it("shows webcam feed during capturing state", () => {
		renderDisplayPage({
			id: boothId,
			state: "capturing",
			latestPhotoId: null,
			lastTakePhotoAt: new Date(),
		});

		expect(screen.getByTestId("webcam-feed")).toBeInTheDocument();
		// The capturing state shows countdown numbers, not "撮影中..."
	});

	it("shows generating progress message", () => {
		renderDisplayPage({
			id: boothId,
			state: "generating",
			latestPhotoId: null,
			lastTakePhotoAt: null,
		});

		expect(screen.getByText("画像を生成中...")).toBeInTheDocument();
	});

	it("shows generated photo when completed", () => {
		renderDisplayPage({
			id: boothId,
			state: "completed",
			latestPhotoId: "latest-photo-1",
			lastTakePhotoAt: null,
		});

		// Check for generated image by alt text
		const generatedImage = screen.getByAltText("生成された写真");
		expect(generatedImage).toBeInTheDocument();
		expect(generatedImage.getAttribute("src")).toContain(
			encodeURIComponent(generatedImageUrl),
		);
	});
});
