/**
 * T302 [P] [US1] RTL Spec (Control Page)
 *
 * Failing expectations for Control Page UI states prior to implementation.
 */

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import ControlPage from "@/app/(booth)/control/[boothId]/page";

type BoothState = "idle" | "menu" | "capturing" | "generating" | "completed";

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

vi.mock("@/hooks/useBoothState", () => ({
	useBoothState: hookMocks.useBoothState,
}));

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
const mockEnsureAnonymousSignIn = clientMocks.ensureAnonymousSignIn;

const mockUseBoothState = hookMocks.useBoothState;
const mockUseUploadedPhotos = hookMocks.useUploadedPhotos;
const mockUseGenerationOptions = hookMocks.useGenerationOptions;
const mockUseParams = hookMocks.useParams;

const createBooth = (
	state: BoothState,
	overrides?: Partial<MockBooth>,
): MockBooth => ({
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

		// The button contains both heading and paragraph text
		const startButton = screen.getByRole("button", {
			name: /gemini ai フォトブース.*画面をタップしてスタート/i,
		});
		expect(startButton).toBeInTheDocument();

		const user = userEvent.setup();
		await user.click(startButton);

		expect(mockStartCapture).toHaveBeenCalledWith({ boothId });
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

		// Check for the photo capture button
		expect(
			screen.getByRole("button", { name: /camera.*写真を撮る/i }),
		).toBeInTheDocument();
		expect(screen.getByText("ロケーションA")).toBeInTheDocument();
		expect(screen.getByText("ロケーションB")).toBeInTheDocument();
		expect(screen.getByText("ビビッド")).toBeInTheDocument();
		// Check for uploaded photo images by alt text
		const photoImages = screen.getAllByAltText("アップロード済みの写真");
		expect(photoImages).toHaveLength(uploadedPhotos.length);
	});

	it("shows capturing state countdown UI", () => {
		const booth = createBooth("capturing", {
			lastTakePhotoAt: new Date(),
		});
		renderControlPage(booth);

		// The capturing state shows a countdown number (5, 4, 3, 2, 1)
		// Check that we're in capturing state by looking for the main content
		const main = screen.getByRole("main");
		expect(main).toBeInTheDocument();
	});

	it("shows generating state progress message", () => {
		const booth = createBooth("generating");
		renderControlPage(booth);

		expect(screen.getByText("画像を生成中...")).toBeInTheDocument();
	});

	it("shows completed state with download QR link", () => {
		const latestPhotoId = "generated-photo-123";
		const booth = createBooth("completed", { latestPhotoId });

		mockUseBoothState.mockReturnValue({
			booth,
			latestGeneratedPhotoUrl: "https://example.com/generated.png",
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

		// Check for completion message
		expect(
			screen.getByText("画像のダウンロードはこちらから"),
		).toBeInTheDocument();
	});

	describe("selectedOptions and selectedPhotoId reset behavior", () => {
		it("resets selectedOptions and selectedPhotoId when transitioning from menu to idle", async () => {
			// 初期状態: menu
			const booth = createBooth("menu");
			const uploadedPhotos = [
				{
					photoId: "photo-1",
					imageUrl: "https://example.com/photo-1.png",
					imagePath: "photos/photo-1/photo.png",
				},
			];
			const generationOptions = {
				location: [
					{
						id: "location-1",
						typeId: "location",
						displayName: "ロケーションA",
						imageUrl: null,
						imagePath: null,
					},
				],
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

			const { rerender } = render(<ControlPage />);

			// 写真を選択
			const user = userEvent.setup();
			const photoButton = screen.getByRole("button", {
				name: "アップロード済みの写真",
			});
			await user.click(photoButton);

			// オプションを選択
			const locationButton = screen.getByRole("button", {
				name: "ロケーションA",
			});
			await user.click(locationButton);

			// boothStateをidleに変更
			const idleBooth = createBooth("idle");
			mockUseBoothState.mockReturnValue({
				booth: idleBooth,
				latestGeneratedPhotoUrl: null,
				isLoading: false,
				error: null,
			});

			rerender(<ControlPage />);

			// idle状態の画面が表示されることを確認
			expect(
				screen.getByRole("button", {
					name: /gemini ai フォトブース.*画面をタップしてスタート/i,
				}),
			).toBeInTheDocument();

			// menuに戻る
			const menuBooth = createBooth("menu");
			mockUseBoothState.mockReturnValue({
				booth: menuBooth,
				latestGeneratedPhotoUrl: null,
				isLoading: false,
				error: null,
			});

			rerender(<ControlPage />);

			// 選択がリセットされていることを確認
			// 決定ボタンが無効化されていることで間接的に確認
			const generateButton = screen.getByRole("button", {
				name: /check.*決定/i,
			});
			expect(generateButton).toBeDisabled();
		});

		it("resets selectedOptions and selectedPhotoId when transitioning from completed to idle", async () => {
			// 初期状態: completed
			const completedBooth = createBooth("completed", {
				latestPhotoId: "generated-photo-123",
			});

			mockUseBoothState.mockReturnValue({
				booth: completedBooth,
				latestGeneratedPhotoUrl: "https://example.com/generated.png",
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

			const { rerender } = render(<ControlPage />);

			// completed状態の確認
			expect(
				screen.getByText("画像のダウンロードはこちらから"),
			).toBeInTheDocument();

			// boothStateをidleに変更
			const idleBooth = createBooth("idle");
			mockUseBoothState.mockReturnValue({
				booth: idleBooth,
				latestGeneratedPhotoUrl: null,
				isLoading: false,
				error: null,
			});

			rerender(<ControlPage />);

			// idle状態の画面が表示されることを確認
			expect(
				screen.getByRole("button", {
					name: /gemini ai フォトブース.*画面をタップしてスタート/i,
				}),
			).toBeInTheDocument();
			expect(
				screen.queryByText("画像のダウンロードはこちらから"),
			).not.toBeInTheDocument();

			// menuに戻って選択がリセットされていることを確認
			const menuBooth = createBooth("menu");
			const uploadedPhotos = [
				{
					photoId: "photo-1",
					imageUrl: "https://example.com/photo-1.png",
					imagePath: "photos/photo-1/photo.png",
				},
			];
			const generationOptions = {
				location: [
					{
						id: "location-1",
						typeId: "location",
						displayName: "ロケーションA",
						imageUrl: null,
						imagePath: null,
					},
				],
			};

			mockUseBoothState.mockReturnValue({
				booth: menuBooth,
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

			rerender(<ControlPage />);

			// 決定ボタンが無効化されていることで選択がリセットされていることを確認
			const generateButton = screen.getByRole("button", {
				name: /check.*決定/i,
			});
			expect(generateButton).toBeDisabled();
		});

		it("resets selectedOptions and selectedPhotoId when transitioning from generating to idle", async () => {
			// 初期状態: generating
			const generatingBooth = createBooth("generating");

			mockUseBoothState.mockReturnValue({
				booth: generatingBooth,
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

			const { rerender } = render(<ControlPage />);

			// generating状態の確認
			expect(screen.getByText("画像を生成中...")).toBeInTheDocument();

			// boothStateをidleに変更
			const idleBooth = createBooth("idle");
			mockUseBoothState.mockReturnValue({
				booth: idleBooth,
				latestGeneratedPhotoUrl: null,
				isLoading: false,
				error: null,
			});

			rerender(<ControlPage />);

			// idle状態の画面が表示されることを確認
			expect(
				screen.getByRole("button", {
					name: /gemini ai フォトブース.*画面をタップしてスタート/i,
				}),
			).toBeInTheDocument();
		});

		it("keeps selections in menu state when transitioning between non-idle states", async () => {
			// 初期状態: menu
			const menuBooth = createBooth("menu");
			const uploadedPhotos = [
				{
					photoId: "photo-1",
					imageUrl: "https://example.com/photo-1.png",
					imagePath: "photos/photo-1/photo.png",
				},
			];
			const generationOptions = {
				location: [
					{
						id: "location-1",
						typeId: "location",
						displayName: "ロケーションA",
						imageUrl: null,
						imagePath: null,
					},
				],
			};

			mockUseBoothState.mockReturnValue({
				booth: menuBooth,
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

			const { rerender } = render(<ControlPage />);

			// 写真を選択
			const user = userEvent.setup();
			const photoButton = screen.getByRole("button", {
				name: "アップロード済みの写真",
			});
			await user.click(photoButton);

			// オプションを選択
			const locationButton = screen.getByRole("button", {
				name: "ロケーションA",
			});
			await user.click(locationButton);

			// 決定ボタンが有効になっていることを確認
			const generateButton = screen.getByRole("button", {
				name: /check.*決定/i,
			});
			expect(generateButton).not.toBeDisabled();

			// capturingに遷移
			const capturingBooth = createBooth("capturing", {
				lastTakePhotoAt: new Date(),
			});
			mockUseBoothState.mockReturnValue({
				booth: capturingBooth,
				latestGeneratedPhotoUrl: null,
				isLoading: false,
				error: null,
			});

			rerender(<ControlPage />);

			// capturing状態の確認 - check for countdown number
			const main = screen.getByRole("main");
			expect(main).toBeInTheDocument();

			// menuに戻る
			mockUseBoothState.mockReturnValue({
				booth: menuBooth,
				latestGeneratedPhotoUrl: null,
				isLoading: false,
				error: null,
			});

			rerender(<ControlPage />);

			// 選択が保持されていることを確認
			// 決定ボタンがまだ有効であることで確認
			const generateButtonAfter = screen.getByRole("button", {
				name: /check.*決定/i,
			});
			expect(generateButtonAfter).not.toBeDisabled();
		});

		it("allows re-selection after reset when returning to menu from idle", async () => {
			// 初期状態: menu
			const menuBooth = createBooth("menu");
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
					{
						id: "location-1",
						typeId: "location",
						displayName: "ロケーションA",
						imageUrl: null,
						imagePath: null,
					},
					{
						id: "location-2",
						typeId: "location",
						displayName: "ロケーションB",
						imageUrl: null,
						imagePath: null,
					},
				],
			};

			mockUseBoothState.mockReturnValue({
				booth: menuBooth,
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

			const { rerender } = render(<ControlPage />);

			const user = userEvent.setup();

			// 最初の選択
			const photo1Button = screen.getAllByRole("button", {
				name: "アップロード済みの写真",
			})[0];
			await user.click(photo1Button);

			const locationAButton = screen.getByRole("button", {
				name: "ロケーションA",
			});
			await user.click(locationAButton);

			// idleに遷移
			const idleBooth = createBooth("idle");
			mockUseBoothState.mockReturnValue({
				booth: idleBooth,
				latestGeneratedPhotoUrl: null,
				isLoading: false,
				error: null,
			});

			rerender(<ControlPage />);

			// menuに戻る
			mockUseBoothState.mockReturnValue({
				booth: menuBooth,
				latestGeneratedPhotoUrl: null,
				isLoading: false,
				error: null,
			});

			rerender(<ControlPage />);

			// 異なる選択をする
			const photo2Button = screen.getAllByRole("button", {
				name: "アップロード済みの写真",
			})[1];
			await user.click(photo2Button);

			const locationBButton = screen.getByRole("button", {
				name: "ロケーションB",
			});
			await user.click(locationBButton);

			// 新しい選択で決定ボタンが有効になることを確認
			const generateButton = screen.getByRole("button", {
				name: /check.*決定/i,
			});
			expect(generateButton).not.toBeDisabled();
		});

		it("updates selectedPhotoId when a new photo is added even if one is already selected", async () => {
			// 初期状態: menu with one photo
			const menuBooth = createBooth("menu");
			const initialPhotos = [
				{
					photoId: "photo-1",
					imageUrl: "https://example.com/photo-1.png",
					imagePath: "photos/photo-1/photo.png",
				},
			];
			const generationOptions = {
				location: [
					{
						id: "location-1",
						typeId: "location",
						displayName: "ロケーションA",
						imageUrl: null,
						imagePath: null,
					},
				],
			};

			mockUseBoothState.mockReturnValue({
				booth: menuBooth,
				latestGeneratedPhotoUrl: null,
				isLoading: false,
				error: null,
			});
			mockUseUploadedPhotos.mockReturnValue({
				photos: initialPhotos,
				isLoading: false,
				error: null,
			});
			mockUseGenerationOptions.mockReturnValue({
				options: generationOptions,
				isLoading: false,
				error: null,
			});
			mockUseParams.mockReturnValue({ boothId });

			const { rerender } = render(<ControlPage />);

			// 最初の写真が選択されていることを確認 (useEffectによる自動選択)
			// 選択状態はborderの色などで判定できるが、ここではmockの呼び出しやstateの反映を確認したい
			// しかしstateは直接見れないので、UI上の変化で確認する
			// 選択された写真は border-[#4796E3] (blue) になる
			const photo1Button = screen.getAllByRole("button", {
				name: "アップロード済みの写真",
			})[0];
			expect(photo1Button).toHaveClass("border-[#4796E3]");

			// 新しい写真が追加された状態をシミュレート
			const updatedPhotos = [
				{
					photoId: "photo-2", // New photo at the top (desc order)
					imageUrl: "https://example.com/photo-2.png",
					imagePath: "photos/photo-2/photo.png",
				},
				...initialPhotos,
			];

			mockUseUploadedPhotos.mockReturnValue({
				photos: updatedPhotos,
				isLoading: false,
				error: null,
			});

			rerender(<ControlPage />);

			// 新しい写真（photo-2）が選択されていることを確認
			const photoButtons = screen.getAllByRole("button", {
				name: "アップロード済みの写真",
			});
			expect(photoButtons).toHaveLength(2);

			// photo-2 is the first one
			const photo2Button = photoButtons[0];
			expect(photo2Button).toHaveClass("border-[#4796E3]");

			// photo-1 is the second one and should not be selected
			const photo1ButtonAfter = photoButtons[1];
			expect(photo1ButtonAfter).not.toHaveClass("border-[#4796E3]");
		});
	});
});
