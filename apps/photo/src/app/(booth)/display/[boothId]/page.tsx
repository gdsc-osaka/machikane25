'use client';

import QRCode from "react-qr-code";
import Webcam from "react-webcam";
import { useMemo } from "react";
import { useParams } from "next/navigation";
import { useBoothState } from "@/hooks/useBoothState";

const ensureBoothId = (value: unknown): string =>
	typeof value === "string" ? value : "";

const getBoothState = (state: string | undefined): string =>
	typeof state === "string" ? state : "idle";

export default function DisplayPage() {
	const params = useParams();
	const boothId = ensureBoothId((params as Record<string, unknown>)?.boothId);
	const { booth, latestGeneratedPhotoUrl, isLoading } = useBoothState(boothId);

	const boothState = useMemo(
		() => getBoothState(booth?.state),
		[booth?.state],
	);

	const renderIdle = () => (
		<div className="flex flex-col items-center gap-4">
			<p className="text-2xl font-semibold">タッチパネルをタップしてね</p>
			<p className="text-sm text-muted-foreground">
				スタッフが準備中です。少しお待ちください。
			</p>
		</div>
	);

	const renderMenu = () => {
		const baseurl = process.env.NEXT_PUBLIC_BASE_URL;
		const uploadUrl = `${baseurl}/upload/${boothId}`;
		return (	
			<div className="flex flex-col items-center gap-6">
				<p className="text-xl font-semibold">
					スマホでQRコードを読み取って写真をアップロードしてください
				</p>
				<div className="rounded-lg border bg-white p-4 shadow">
					<QRCode value={uploadUrl} />
				</div>
				<p className="text-sm text-muted-foreground">{uploadUrl}</p>
			</div>
		);
	};

	const renderCapturing = () => (
		<div className="flex flex-col items-center gap-4">
			<div className="overflow-hidden rounded-lg border shadow-lg">
				<Webcam audio={false} screenshotFormat="image/png" />
			</div>
			<p className="text-2xl font-semibold">撮影中...</p>
			<p className="text-sm text-muted-foreground">カウントダウンに合わせてポーズ！</p>
		</div>
	);

	const renderGenerating = () => (
		<div className="flex flex-col items-center gap-4">
			<p className="text-2xl font-semibold">AIが写真を生成中...</p>
			<p className="text-sm text-muted-foreground">
				少しお時間をいただいています。完了すると生成結果が表示されます。
			</p>
		</div>
	);

	const renderCompleted = () => {
		if (!latestGeneratedPhotoUrl) {
			return (
				<p className="text-sm text-muted-foreground">
					最新の写真を読み込んでいます…
				</p>
			);
		}

		return (
			<div className="flex flex-col items-center gap-6">
				<img
					src={latestGeneratedPhotoUrl}
					alt="生成した写真"
					className="max-h-[480px] w-auto max-w-full rounded-lg shadow-lg"
				/>
				<p className="text-sm text-muted-foreground">
					スタッフがQRコードを表示するまでお待ちください。
				</p>
			</div>
		);
	};

	const renderContent = () => {
		if (isLoading) {
			return <p className="text-sm text-muted-foreground">読み込み中...</p>;
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
		<main className="flex min-h-screen flex-col items-center justify-center gap-8 p-6 md:p-10">
			<header className="text-center">
				<h1 className="text-3xl font-bold">Display</h1>
				<p className="text-sm text-muted-foreground">
					ブースID: {boothId || "未設定"}
				</p>
			</header>
			<section className="w-full max-w-3xl">{renderContent()}</section>
		</main>
	);
}
