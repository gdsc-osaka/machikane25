"use client";

import { AnimatePresence, motion } from "framer-motion";
import Image from "next/image";
import { useParams } from "next/navigation";
import {
	useCallback,
	useEffect,
	useMemo,
	useRef,
	useState,
	useTransition,
} from "react";
import QRCode from "react-qr-code";
import {
	discardSession,
	startCapture,
	startGeneration,
	startSession,
} from "@/app/actions/boothActions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BackIcon, CameraIcon, CheckIcon } from "@/components/ui/icons";
import { Progress } from "@/components/ui/progress";
import { useBoothState } from "@/hooks/useBoothState";
import { useGenerationOptions } from "@/hooks/useGenerationOptions";
import { useUploadedPhotos } from "@/hooks/useUploadedPhotos";
import { playSound, preloadAllSounds } from "@/lib/sound";

// key: type id
// value: option id
type SelectedOptions = Record<string, string>;

const ensureBoothId = (value: unknown): string =>
	typeof value === "string" ? value : "";

const getBoothState = (state: string | undefined): string =>
	typeof state === "string" ? state : "idle";

type DownloadPath = `/download/${string}/${string}`;

const sanitizeBaseUrl = (value: string): string => value.replace(/\/+$/, "");

const resolveBaseUrl = (): string => {
	const envBaseUrl = process.env.NEXT_PUBLIC_BASE_URL;
	if (typeof envBaseUrl === "string" && envBaseUrl.length > 0) {
		return sanitizeBaseUrl(envBaseUrl);
	}

	if (
		typeof window !== "undefined" &&
		typeof window.location?.origin === "string"
	) {
		return sanitizeBaseUrl(window.location.origin);
	}

	return "";
};

const buildDownloadPath = (boothId: string, photoId: string): DownloadPath =>
	`/download/${boothId}/${photoId}`;

export default function ControlPage() {
	const params = useParams();
	const boothId = ensureBoothId((params as Record<string, unknown>)?.boothId);

	const [selectedPhotoId, setSelectedPhotoId] = useState<string | null>(null);
	const [selectedOptions, setSelectedOptions] = useState<SelectedOptions>({});
	const [isPending, startTransition] = useTransition();
	const [countdown, setCountdown] = useState<number | null>(null);
	const [isCapturing, setIsCapturing] = useState(false);

	const { booth, latestGeneratedPhotoUrl, isLoading, error } =
		useBoothState(boothId);
	const { photos } = useUploadedPhotos(boothId);
	const { options } = useGenerationOptions();

	const boothState = getBoothState(booth?.state);
	const prevBoothStateRef = useRef<string>(boothState);

	// Preload all sounds when component mounts
	useEffect(() => {
		preloadAllSounds();
	}, []);

	// Track state transitions and play appropriate sounds
	useEffect(() => {
		const prevState = prevBoothStateRef.current;
		const currentState = boothState;

		// idle → menu: play "start" sound
		if (prevState === "idle" && currentState === "menu") {
			void playSound("start");
		}

		// menu → generating: play "generating" sound
		if (prevState === "menu" && currentState === "generating") {
			void playSound("generating");
		}

		// generating → completed: play "completed" sound
		if (prevState === "generating" && currentState === "completed") {
			void playSound("completed");
		}

		prevBoothStateRef.current = currentState;
	}, [boothState]);

	useEffect(() => {
		if (boothState === "idle") {
			setSelectedOptions({});
			setSelectedPhotoId(null);
		}
	}, [boothState]);

	// カウントダウンロジック（Display Pageと同期）
	useEffect(() => {
		if (boothState === "capturing" && !isCapturing) {
			setIsCapturing(true);
			setCountdown(5);
		} else if (boothState !== "capturing") {
			setIsCapturing(false);
			setCountdown(null);
		}
	}, [boothState, isCapturing]);

	// カウントダウンタイマー
	useEffect(() => {
		if (countdown === null || countdown < 0) return;

		const timer = setTimeout(() => {
			setCountdown(countdown - 1);
		}, 1000);

		return () => clearTimeout(timer);
	}, [countdown]);

	const handleStartSession = useCallback(() => {
		startSession({ boothId });
	}, [boothId]);

	const handleDiscardSession = useCallback(() => {
		discardSession({ boothId });
	}, [boothId]);

	const handleStartCapture = useCallback(() => {
		startTransition(async () => {
			await startCapture({ boothId });
		});
	}, [boothId]);

	const handleStartGeneration = useCallback(() => {
		if (!selectedPhotoId) {
			return;
		}
		console.log("Starting generation with options:", selectedOptions);
		console.log("Selected photo ID:", selectedPhotoId);

		// Play confirm sound when 決定 button is tapped
		void playSound("confirm");

		startTransition(async () => {
			await startGeneration({
				boothId,
				uploadedPhotoId: selectedPhotoId,
				options: selectedOptions,
			});
		});
	}, [boothId, selectedOptions, selectedPhotoId]);

	const generationSections = useMemo(() => Object.entries(options), [options]);

	const isGenerateDisabled =
		isPending ||
		!selectedPhotoId ||
		generationSections.some(
			([typeId]) => typeof selectedOptions[typeId] !== "string",
		);

	// const renderSelectedOptionsThumbnails = () => {
	// 	const selectedOptionsList = Object.entries(selectedOptions)
	// 		.map(([typeId, optionId]) => {
	// 			const option = options[typeId]?.find((opt) => opt.id === optionId);
	// 			return option?.imageUrl ? option : null;
	// 		})
	// 		.filter((opt): opt is NonNullable<typeof opt> => opt !== null);

	// 	if (selectedOptionsList.length === 0) return null;

	// 	return (
	// 		<div className="flex gap-2 overflow-x-auto">
	// 			{selectedOptionsList.map((option) => (
	// 				<div key={option.id} className="h-16 w-16 flex-shrink-0">
	// 					<Image
	// 						src={option.imageUrl ?? ""}
	// 						alt={option.displayName}
	// 						width={64}
	// 						height={64}
	// 						className="h-full w-full rounded object-cover"
	// 					/>
	// 				</div>
	// 			))}
	// 		</div>
	// 	);
	// };

	const renderIdle = () => (
		<button
			type="button"
			onClick={handleStartSession}
			disabled={isPending}
			className="flex h-full w-full flex-col items-center justify-center gap-8 bg-[#303030] transition-all active:scale-[0.99]"
		>
			<h1 className="bg-gradient-to-r from-[#4796E3] via-[#9177C7] to-[#CA6673] bg-clip-text text-6xl font-bold text-transparent drop-shadow-lg md:text-7xl">
				Gemini AI フォトブース
			</h1>
			<p className="animate-pulse text-3xl font-semibold text-[#e3e3e3] drop-shadow-md md:text-4xl">
				画面をタップしてスタート
			</p>
		</button>
	);

	const renderMenu = () => (
		<div className="flex h-full w-full bg-[#303030]">
			{/* Back Button */}
			<button
				type="button"
				onClick={handleDiscardSession}
				className="absolute left-4 top-4 z-10 flex items-center gap-2 rounded-full border border-[#444746] bg-[#303030]/80 px-4 py-2 text-[#e3e3e3] backdrop-blur-sm transition-all hover:bg-[#444746]"
			>
				<BackIcon size="sm" />
				<span className="text-sm font-medium">ホーム</span>
			</button>

			{/* Left Side - Uploaded Images */}
			<div className="flex w-1/2 flex-col gap-4 overflow-y-auto border-r border-[#444746] bg-[#303030] p-6">
				<h2 className="bg-gradient-to-r from-[#4796E3] to-[#9177C7] bg-clip-text text-xl font-bold text-transparent">
					画像を選ぶ
				</h2>
				{photos.length > 0 ? (
					<div className="flex flex-col gap-3">
						{photos.map((photo) => {
							const isSelected = selectedPhotoId === photo.photoId;
							const hasValidImageUrl =
								photo.imageUrl && photo.imageUrl.length > 0;

							return (
								<button
									type="button"
									key={photo.photoId}
									onClick={() => {
										void playSound("menu");
										setSelectedPhotoId(photo.photoId);
									}}
									className={[
										"aspect-[4/5] overflow-hidden rounded-lg border-4 transition-all",
										isSelected
											? "border-[#4796E3] shadow-lg shadow-[#4796E3]/50"
											: "border-[#444746] hover:border-[#9177C7]",
									].join(" ")}
								>
									{hasValidImageUrl ? (
										<Image
											src={photo.imageUrl}
											alt="アップロード済みの写真"
											width={400}
											height={500}
											sizes="(max-width: 768px) 50vw, 300px"
											className="h-full w-full object-cover"
										/>
									) : (
										<div className="flex h-full w-full items-center justify-center bg-[#444746] text-sm text-[#e3e3e3]">
											読み込み中...
										</div>
									)}
								</button>
							);
						})}
					</div>
				) : (
					<p className="text-sm text-[#e3e3e3]/60">
						QRコードから写真をアップロードするとここに表示されます。
					</p>
				)}
			</div>

			{/* Right Side - Options and Actions */}
			<div className="flex w-1/2 flex-col gap-4 overflow-y-auto bg-[#303030] p-6">
				{/* Generation Options */}
				<div className="flex-1 space-y-4">
					<h2 className="bg-gradient-to-r from-[#4796E3] to-[#9177C7] bg-clip-text text-xl font-bold text-transparent">
						テーマを選択
					</h2>
					{generationSections.length > 0 ? (
						generationSections.map(([typeId, items]) => (
							<Card key={typeId} className="border-[#444746] bg-[#303030]">
								<CardHeader>
									<CardTitle className="text-base font-semibold text-[#e3e3e3]">
										{typeId.toUpperCase()}
									</CardTitle>
								</CardHeader>
								<CardContent className="flex flex-wrap gap-2">
									{items.map((option) => {
										const isSelected = selectedOptions[typeId] === option.id;
										return (
											<Button
												variant={isSelected ? "default" : "outline"}
												type="button"
												key={option.id}
												onClick={() => {
													void playSound("menu");
													setSelectedOptions((current) => ({
														...current,
														[typeId]: option.id,
													}));
												}}
												size="sm"
												className={
													isSelected
														? "bg-[#4796E3] text-white hover:bg-[#9177C7]"
														: "border-[#444746] bg-[#303030] text-[#e3e3e3] hover:border-[#4796E3] hover:bg-[#444746]"
												}
											>
												{option.displayName}
											</Button>
										);
									})}
								</CardContent>
							</Card>
						))
					) : (
						<p className="text-sm text-[#e3e3e3]/60">選択肢を読み込み中です…</p>
					)}
				</div>

				{/* Selected Options Thumbnails */}
				{renderSelectedOptionsThumbnails()}

				{/* Action Buttons */}
				<div className="flex gap-3">
					<Button
						onClick={handleStartCapture}
						disabled={isPending}
						size="lg"
						className="flex-1 gap-2 bg-[#4796E3] text-lg text-white hover:bg-[#9177C7] disabled:bg-[#444746] disabled:text-[#e3e3e3]/50"
					>
						<CameraIcon size="md" />
						写真を撮る
					</Button>
					<Button
						onClick={handleStartGeneration}
						disabled={isGenerateDisabled}
						size="lg"
						className="flex-1 gap-2 bg-gradient-to-r from-[#4796E3] via-[#9177C7] to-[#CA6673] text-lg text-white hover:opacity-90 disabled:from-[#444746] disabled:to-[#444746] disabled:text-[#e3e3e3]/50"
					>
						<CheckIcon size="md" />
						決定
					</Button>
				</div>
			</div>
		</div>
	);

	const renderCapturing = () => (
		<div className="flex h-full w-full flex-col items-center justify-center bg-[#303030]">
			{/* Back Button */}
			<button
				type="button"
				onClick={handleDiscardSession}
				className="absolute left-4 top-4 z-10 flex items-center gap-2 rounded-full border border-[#444746] bg-[#303030]/80 px-4 py-2 text-[#e3e3e3] backdrop-blur-sm transition-all hover:bg-[#444746]"
			>
				<BackIcon size="sm" />
				<span className="text-sm font-medium">ホーム</span>
			</button>

			<AnimatePresence mode="wait">
				{countdown !== null && countdown >= 0 && (
					<motion.div
						key={countdown}
						initial={{ opacity: 0, scale: 0.5 }}
						animate={{ opacity: 1, scale: 1 }}
						exit={{ opacity: 0, scale: 1.5 }}
						transition={{ duration: 0.3 }}
					>
						<span className="bg-gradient-to-r from-[#4796E3] via-[#9177C7] to-[#CA6673] bg-clip-text text-[200px] font-bold text-transparent drop-shadow-2xl">
							{countdown > 0 ? countdown : "📸"}
						</span>
					</motion.div>
				)}
			</AnimatePresence>
		</div>
	);

	const renderGenerating = () => (
		<div className="flex h-full w-full flex-col items-center justify-center gap-8 bg-[#303030]">
			{/* Back Button */}
			<button
				type="button"
				onClick={handleDiscardSession}
				className="absolute left-4 top-4 z-10 flex items-center gap-2 rounded-full border border-[#444746] bg-[#303030]/80 px-4 py-2 text-[#e3e3e3] backdrop-blur-sm transition-all hover:bg-[#444746]"
			>
				<BackIcon size="sm" />
				<span className="text-sm font-medium">ホーム</span>
			</button>

			<p className="bg-gradient-to-r from-[#4796E3] via-[#9177C7] to-[#CA6673] bg-clip-text text-4xl font-semibold text-transparent drop-shadow-lg">
				画像を生成中...
			</p>
			<Progress value={undefined} className="w-96 bg-[#444746]" />
		</div>
	);

	const renderCompleted = () => {
		const latestPhotoId = booth?.latestPhotoId;
		const canBuildDownloadPath =
			typeof latestPhotoId === "string" &&
			latestPhotoId.length > 0 &&
			boothId.length > 0;
		const downloadPath = canBuildDownloadPath
			? buildDownloadPath(boothId, latestPhotoId)
			: null;
		const baseUrl = resolveBaseUrl();
		const qrValue =
			downloadPath && baseUrl.length > 0
				? `${baseUrl}${downloadPath}`
				: downloadPath;

		return (
			<div className="flex h-full w-full flex-col items-center justify-center gap-8 bg-[#303030]">
				{/* Back Button */}
				<button
					type="button"
					onClick={handleDiscardSession}
					className="absolute left-4 top-4 z-10 flex items-center gap-2 rounded-full border border-[#444746] bg-[#303030]/80 px-4 py-2 text-[#e3e3e3] backdrop-blur-sm transition-all hover:bg-[#444746]"
				>
					<BackIcon size="sm" />
					<span className="text-sm font-medium">ホーム</span>
				</button>

				<p className="bg-gradient-to-r from-[#4796E3] via-[#9177C7] to-[#CA6673] bg-clip-text text-4xl font-semibold text-transparent drop-shadow-lg">
					画像のダウンロードはこちらから
				</p>
				{qrValue ? (
					<div className="rounded-2xl border-2 border-[#444746] bg-[#444746] p-8 shadow-2xl">
						<QRCode value={qrValue} size={256} />
					</div>
				) : null}
				{latestGeneratedPhotoUrl ? (
					<div className="rounded-lg border-2 border-[#4796E3] p-4 shadow-lg shadow-[#4796E3]/30">
						<Image
							src={latestGeneratedPhotoUrl}
							alt="生成された写真のプレビュー"
							width={240}
							height={240}
							sizes="240px"
							className="h-60 w-60 rounded object-cover"
						/>
					</div>
				) : null}
			</div>
		);
	};

	const renderContent = () => {
		if (isLoading) {
			return (
				<div className="flex h-full w-full items-center justify-center bg-[#303030]">
					<p className="text-xl text-[#e3e3e3]">読み込み中...</p>
				</div>
			);
		}

		const detectedError = error;

		if (detectedError) {
			console.error(detectedError);
			return (
				<div className="flex h-full w-full items-center justify-center bg-[#303030]">
					<div className="flex flex-col gap-4">
						<p className="text-sm text-[#CA6673]">
							エラーが発生しました: {detectedError.message}
						</p>
						<Button
							onClick={() => window.location.reload()}
							className="bg-[#4796E3] text-white hover:bg-[#9177C7]"
						>
							再読み込み
						</Button>
					</div>
				</div>
			);
		}

		if (boothState === "idle") {
			return renderIdle();
		}

		if (boothState === "menu") {
			return renderMenu();
		}

		if (boothState === "capturing") {
			return renderCapturing();
		}

		if (boothState === "generating") {
			return renderGenerating();
		}

		if (boothState === "completed") {
			return renderCompleted();
		}

		return renderIdle();
	};

	return (
		<main className="relative flex h-screen w-full overflow-hidden">
			{renderContent()}
		</main>
	);
}
