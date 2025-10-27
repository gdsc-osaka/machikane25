'use client';

import Link from "next/link";
import { useCallback, useMemo, useState, useTransition } from "react";
import QRCode from "react-qr-code";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
	completeCapture,
	startCapture,
	startGeneration,
	startSession,
} from "@/app/actions/boothActions";
import { useBoothState } from "@/hooks/useBoothState";
import { useUploadedPhotos } from "@/hooks/useUploadedPhotos";
import { useGenerationOptions } from "@/hooks/useGenerationOptions";

type SelectedOptions = Record<string, string>;

const IDLE_PROMPT = "フォトブースを始める";
const GENERATING_MESSAGE = "AIが写真を生成中...";
const CAPTURING_MESSAGE = "撮影中...";

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

	if (typeof window !== "undefined" && typeof window.location?.origin === "string") {
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

	const { booth, latestGeneratedPhotoUrl, isLoading, error } =
		useBoothState(boothId);
	const { photos } = useUploadedPhotos(boothId);
	const { options } = useGenerationOptions();

	const boothState = getBoothState(booth?.state);


	const handleStartSession = useCallback(() => {
		startSession({ boothId });
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

	const renderIdle = () => (
		<div className="flex flex-col items-center gap-6">
			<p className="text-lg text-muted-foreground">
				来場者の準備ができたらフォトブースを開始してください。
			</p>
			<Button onClick={handleStartSession} disabled={isPending}>
				{IDLE_PROMPT}
			</Button>
		</div>
	);

	const renderPhotos = () => (
		<div className="grid grid-cols-2 gap-4">
			{photos.map((photo) => {
				const isSelected = selectedPhotoId === photo.photoId;
				return (
					<button
						type="button"
						key={photo.photoId}
						onClick={() => setSelectedPhotoId(photo.photoId)}
						className={[
							"rounded border p-2 transition",
							isSelected ? "border-primary" : "border-muted",
						].join(" ")}
					>
						<img
							src={photo.imageUrl}
							alt="アップロード済みの写真"
							className="h-24 w-full rounded object-cover"
						/>
					</button>
				);
			})}
		</div>
	);

	const renderOptions = () => (
		<div className="flex flex-col gap-4">
			{generationSections.map(([typeId, items]) => (
				<Card key={typeId}>
					<CardHeader>
						<CardTitle className="text-base font-semibold">
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
									onClick={() =>
										setSelectedOptions((current) => ({
											...current,
											[typeId]: option.id,
										}))
									}
								>
									{option.displayName}
								</Button>
							);
						})}
					</CardContent>
				</Card>
			))}
		</div>
	);

	const renderMenu = () => (
		<div className="flex w-full flex-col gap-8">
			<div className="flex flex-col gap-4">
				<p className="text-sm text-muted-foreground">
					隣のディスプレイを確認しながら操作してください。
				</p>
				<div className="flex flex-wrap gap-4">
					<Button onClick={handleStartCapture} disabled={isPending}>
						撮影開始
					</Button>
					<Button
						variant="secondary"
						onClick={handleStartGeneration}
						disabled={isGenerateDisabled}
					>
						AI生成を開始
					</Button>
				</div>
			</div>
			<Separator />
			<div className="flex flex-col gap-6">
				<h2 className="text-lg font-semibold">アップロード済みの写真</h2>
				{photos.length > 0 ? (
					renderPhotos()
				) : (
					<p className="text-sm text-muted-foreground">
						QRコードから写真をアップロードするとここに表示されます。
					</p>
				)}
			</div>
			<Separator />
			<div className="flex flex-col gap-6">
				<h2 className="text-lg font-semibold">テーマを選択</h2>
				{generationSections.length > 0 ? (
					renderOptions()
				) : (
					<p className="text-sm text-muted-foreground">
						選択肢を読み込み中です…
					</p>
				)}
			</div>
		</div>
	);

	const renderCapturing = () => (
		<div className="flex flex-col items-center gap-4">
			<p className="text-xl font-semibold">{CAPTURING_MESSAGE}</p>
			<p className="text-sm text-muted-foreground">カウントダウン表示と同期中…</p>
			<Button
				variant="secondary"
				onClick={() => {
					startTransition(async () => {
						await completeCapture({ boothId });
					});
				}}
				disabled={isPending}
			>
				撮影完了に戻る
			</Button>
		</div>
	);

	const renderGenerating = () => (
		<div className="flex flex-col items-center gap-4">
			<p className="text-xl font-semibold">{GENERATING_MESSAGE}</p>
			<p className="text-sm text-muted-foreground">
				生成が完了すると最新のプレビューが表示されます。
			</p>
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
			downloadPath && baseUrl.length > 0 ? `${baseUrl}${downloadPath}` : downloadPath;

		return (
			<div className="flex flex-col items-center gap-6">
				<p className="text-xl font-semibold">生成が完了しました！</p>
				{latestGeneratedPhotoUrl ? (
					<img
						src={latestGeneratedPhotoUrl}
						alt="生成された写真のプレビュー"
						className="h-48 w-48 rounded object-cover shadow-lg"
					/>
				) : null}
				{qrValue ? (
					<div className="flex flex-col items-center gap-3">
						<QRCode value={qrValue} />
						{downloadPath ? (
							<Link href={downloadPath} className="text-primary underline">
								ダウンロードページを開く
							</Link>
						) : null}
						<p className="text-xs text-muted-foreground">{qrValue}</p>
					</div>
				) : null}
				<Button onClick={handleStartSession} variant="secondary">
					次の来場者を案内する
				</Button>
			</div>
		);
	};

	const renderContent = () => {
		if (isLoading) {
			return <p className="text-sm text-muted-foreground">読み込み中...</p>;
		}

		const detectedError = error;

		if (detectedError) {
			console.error(detectedError);
			return (
				<div className="flex flex-col gap-4">
					<p className="text-sm text-destructive">
						エラーが発生しました: {detectedError.message}
					</p>
					<Button onClick={() => window.location.reload()}>再読み込み</Button>
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
		<main className="mx-auto flex min-h-screen w-full max-w-4xl flex-col gap-8 p-6 md:p-10">
			<header className="flex flex-col gap-2">
				<h1 className="text-3xl font-bold">Control</h1>
				<p className="text-sm text-muted-foreground">
					スタッフ用コントロールパネル。ブースID: {boothId || "未設定"}
				</p>
			</header>
			<section className="flex-1">{renderContent()}</section>
		</main>
	);
}
